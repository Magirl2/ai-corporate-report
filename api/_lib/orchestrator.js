// api/_lib/orchestrator.js
import { loadAgentPrompts } from './prompts.js';

const DEBUG = process.env.NODE_ENV !== 'production';
function dbg(label, data) {
  if (!DEBUG) return;
  const preview = typeof data === 'string'
    ? data.slice(0, 300) + (data.length > 300 ? '…' : '')
    : JSON.stringify(data, null, 2).slice(0, 600);
  console.debug(`[ServerOrchestrator] ── ${label} ──\n${preview}`);
}

/**
 * 텍스트에서 JSON 블록을 추출합니다.
 */
function extractJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
  return match ? (match[1] || match[0]) : '';
}

/**
 * JSON 에이전트 응답 정규화
 */
function normalizeAgentJson(parsed, wantedTopKeys) {
  if (!parsed || typeof parsed !== 'object') return {};
  const hasWantedKey = wantedTopKeys.some(k => k in parsed);
  if (hasWantedKey) return parsed;

  const keys = Object.keys(parsed);
  if (keys.length === 1) {
    const inner = parsed[keys[0]];
    if (inner && typeof inner === 'object') {
      const innerHasWanted = wantedTopKeys.some(k => k in inner);
      if (innerHasWanted) return inner;
    }
  }
  return parsed;
}

export class ServerOrchestrator {
  constructor(companyName, onStatusUpdate, baseUrl = 'http://localhost:3000') {
    this.companyName = companyName;
    this.onStatusUpdate = onStatusUpdate;
    this.baseUrl = baseUrl;
    this.promptsMap = loadAgentPrompts();
    this._agentErrors = [];
    this.state = {
      resolve: null,
      raw: { disclosures: '', finance: null, searchBriefing: '', sources: [] },
      normalized: null,
      analysis: { financial: null, disclosure: null, news: null, strategy: null },
      composerMarkdown: '',
      validation: { isValid: true, errors: [] },
    };
  }

  async run() {
    this.onStatusUpdate?.('심층 분석 오케스트레이션 기동');

    // 1. Ticker 식별 (기존 API 호출 활용)
    this.state.resolve = await this.resolveTicker();
    this.onStatusUpdate?.(`기업 식별 완료: ${this.state.resolve.type === 'KR' ? '한국' : '미국 ' + this.state.resolve.ticker}`);

    // 2. 데이터 수집
    await this.collectData();

    // 3. 통합 구조 분석 (Core Analyst)
    this.onStatusUpdate?.('핵심 데이터 분석 및 통찰 추출 중...');
    const coreAnalysis = await this.executeJsonAgent('core-analyst', 'gemini-2.5-flash', { 
      finance: this.state.raw.finance,
      disclosures: this.state.raw.disclosures,
      searchBriefing: this.state.raw.searchBriefing
    }, ['financial', 'strategy', 'news']);

    this.state.analysis = { 
      financial: coreAnalysis.financial || null, 
      news: coreAnalysis.news || null, 
      strategy: coreAnalysis.strategy || null 
    };

    // 4. 보고서 합성
    this.onStatusUpdate?.('종합 보고서 작성 중...');
    this.state.composerMarkdown = await this.executeTextAgent('composer', 'gemini-2.5-pro', {
      ...this.state.analysis,
      companyName: this.companyName,
    });

    return this.assembleFinalReport();
  }

  // --- Helpers ---

  async internalFetch(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`Internal API error: ${res.status}`);
    return res.json();
  }

  async resolveTicker() {
    // 서버에서의 Ticker 식별은 직접 Gemini를 호출하여 구현 (companyService.js 로직 이관)
    const prompt = `Task: Identify stock exchange of "${this.companyName}". KRX (삼성전자) -> KOREAN, US (Apple) -> Ticker (AAPL). ONLY uppercase ticker or KOREAN.`;
    const result = await this.callGemini('gemini-2.5-flash', prompt, { temperature: 0 });
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (text.toUpperCase().includes('KOREAN')) return { type: 'KR', ticker: null };
    const ticker = text.match(/\b[A-Z0-9-]{1,8}\b/g)?.[0]?.toUpperCase() || 'UNKNOWN';
    return { type: ticker === 'UNKNOWN' ? 'KR' : 'US', ticker };
  }

  async collectData() {
    this.onStatusUpdate?.('DART/FMP 데이터 수집 중...');
    const { type, ticker } = this.state.resolve;
    const sources = [];
    
    let disclosures = [];
    let finance = null;

    if (type === 'KR') {
      const [dRes, fRes] = await Promise.all([
        this.internalFetch(`/api/dart?corp_name=${encodeURIComponent(this.companyName)}`),
        this.internalFetch(`/api/dart-finance?corp_name=${encodeURIComponent(this.companyName)}`)
      ]);
      disclosures = dRes.list?.map(d => ({ date: d.rcept_dt, title: d.report_nm })) || [];
      finance = fRes;
      sources.push({ title: 'DART 전자공시시스템', uri: 'https://opendart.fss.or.kr/' });
    } else {
      finance = await this.internalFetch(`/api/fmp-finance?ticker=${ticker}`);
      disclosures = [{ date: 'Current', title: `US SEC Filings for ${ticker}` }];
      sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://financialmodelingprep.com/' });
    }

    // Deep Search
    this.onStatusUpdate?.('최신 뉴스 및 시장 동향 검색 중...');
    const today = new Date().toLocaleDateString('ko-KR');
    const searchPrompt = `Evaluate '${this.companyName}'. Today is ${today}.
Output a STRICT JSON object containing:
{
  "companyIdentity": "Brief business area and vision",
  "marketContext": "Current industry and market trends",
  "businessModel": "How it creates value",
  "newsFindings": ["recent news headline 1", "recent news headline 2"],
  "sentiment": "Positive/Neutral/Negative",
  "risks": ["risk factor 1"],
  "opportunities": ["opportunity 1"]
}
DO NOT output markdown. Respond ONLY with valid JSON.
Context Disclosures: ${JSON.stringify(disclosures)}`;
    
    let searchBriefing = {};
    try {
      const searchResult = await this.callGemini('gemini-2.5-pro', searchPrompt, { 
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: 'application/json'
      });

      const text = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      searchBriefing = JSON.parse(extractJson(text) || text);

      const groundingMetadata = searchResult.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach(chunk => {
          if (chunk.web?.uri && !sources.some(s => s.uri === chunk.web.uri)) {
            sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri });
          }
        });
      }
    } catch (e) {
      console.warn("Search Briefing JSON parse error:", e);
    }

    this.state.raw = { disclosures, finance, searchBriefing, sources };
  }

  async executeJsonAgent(agentName, model, context = {}, wantedTopKeys = []) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output JSON. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    
    try {
      const result = await this.callGemini(model, prompt, { 
        temperature: 0.2, 
        responseMimeType: 'application/json' 
      });
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(extractJson(text) || text || '{}');
      return wantedTopKeys.length > 0 ? normalizeAgentJson(parsed, wantedTopKeys) : parsed;
    } catch (err) {
      this._agentErrors.push({ agent: agentName, error: err.message });
      return {};
    }
  }

  async executeTextAgent(agentName, model, context = {}) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output Markdown. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    try {
      const result = await this.callGemini(model, prompt, { temperature: 0.3 });
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      this._agentErrors.push({ agent: agentName, error: err.message });
      return '';
    }
  }

  async callGemini(model, prompt, config = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...config
      })
    });
    
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    return res.json();
  }

  assembleFinalReport() {
    const { analysis, raw } = this.state;
    const strategy = analysis.strategy || {};
    const financial = analysis.financial || {};
    const news = analysis.news || {};

    return {
      companyName: this.companyName,
      report: {
        macroTrend: strategy.macroTrend || null,
        industryStatus: strategy.industryStatus || null,
        vision: strategy.vision || null,
        businessModel: strategy.businessModel || null,
        swotAnalysis: strategy.swotAnalysis || null,
        marketSentiment: news.marketSentiment || null,
        recentNews: news.recentNews || [],
        financialAnalysis: {
          overview: financial.overview || null,
          keyMetrics: financial.keyMetrics || []
        },
        markdown: this.state.composerMarkdown || '',
      },
      sources: raw.sources,
      financeData: raw.finance,
      debug: { agentErrors: this._agentErrors },
    };
  }
}

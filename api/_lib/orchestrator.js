// api/_lib/orchestrator.js
import { loadAgentPrompts } from './prompts.js';

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * 텍스트에서 JSON 블록을 추출합니다.
 */
function extractJson(text) {
  if (!text) return '';
  
  let candidates = [];

  // 1. Try Markdown code blocks first
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    candidates.push(match[1].trim());
  }

  // 2. Find balanced { } blocks (outermost)
  let stack = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (stack === 0) start = i;
      stack++;
    } else if (text[i] === '}') {
      stack--;
      if (stack === 0 && start !== -1) {
        candidates.push(text.substring(start, i + 1));
      }
    }
  }

  // 3. Greedy fallback if no balanced blocks were found or if they're parts of a larger mess
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    candidates.push(text.substring(first, last + 1));
  }

  // 4. Filter and sort valid JSON candidates by length (largest first)
  const valid = candidates
    .filter(c => {
      try {
        JSON.parse(c);
        return true;
      } catch (_e) {
        return false;
      }
    })
    .sort((a, b) => b.length - a.length);

  return valid.length > 0 ? valid[0] : '';
}

/**
 * Search Briefing 스키마 정규화 도우미
 */
export function normalizeSearchBriefing(parsed) {
  if (!parsed || typeof parsed !== 'object') parsed = {};
  return {
    companyIdentity: typeof parsed.companyIdentity === 'string' ? parsed.companyIdentity : null,
    marketContext: typeof parsed.marketContext === 'string' ? parsed.marketContext : null,
    businessModel: typeof parsed.businessModel === 'string' ? parsed.businessModel : null,
    newsFindings: Array.isArray(parsed.newsFindings) ? parsed.newsFindings : [],
    sentiment: typeof parsed.sentiment === 'string' ? parsed.sentiment : 'Neutral',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
    rawContent: typeof parsed.rawContent === 'string' ? parsed.rawContent : ''
  };
}

/**
 * Analyst 출력 정규화 (프론트엔드 중첩 스키마 호환성 보장)
 */
export function normalizeAnalystOutput(raw) {
  if (!raw) raw = {};
  const n = (obj) => (typeof obj === 'string' ? { summary: obj, detail: '' } : obj || null);
  
  return {
    financial: {
      overview: n(raw.financial?.overview),
      keyMetrics: Array.isArray(raw.financial?.keyMetrics) ? raw.financial.keyMetrics : []
    },
    strategy: {
      macroTrend: n(raw.strategy?.macroTrend),
      industryStatus: n(raw.strategy?.industryStatus),
      vision: n(raw.strategy?.vision),
      businessModel: n(raw.strategy?.businessModel),
      swotAnalysis: raw.strategy?.swotAnalysis || { strengths: [], weaknesses: [], opportunities: [], threats: [] }
    },
    news: {
      marketSentiment: raw.news?.marketSentiment || { status: 'Neutral', detail: '', analysis: [] },
      recentNews: Array.isArray(raw.news?.recentNews) ? raw.news.recentNews : []
    }
  };
}

/**
 * JSON 에이전트 응답 정규화
 */
export function normalizeAgentJson(parsed, wantedTopKeys) {
  if (!parsed || typeof parsed !== 'object') return {};

  /**
   * 트리 전체를 재귀적으로 탐색하여 대상 키가 포함된 가장 높은 레벨의 객체를 반환합니다.
   */
  function recursiveSearch(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

    // 현재 레벨에 원하는 키 중 하나라도 있는지 확인
    const hasKey = wantedTopKeys.some(k => k in obj);
    if (hasKey) return obj;

    // 자식 노드 탐색
    for (const key in obj) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        const found = recursiveSearch(val);
        if (found) return found;
      }
    }
    return null;
  }

  return recursiveSearch(parsed) || {};
}

export class ServerOrchestrator {
  constructor(companyName, onStatusUpdate, baseUrl = 'http://localhost:3000', logger = null) {
    this.companyName = companyName;
    this.onStatusUpdate = onStatusUpdate;
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.promptsMap = loadAgentPrompts();
    this._agentErrors = [];
    this.state = {
      resolve: null,
      raw: { disclosures: [], finance: null, searchBriefing: {}, sources: [] },
      analysis: { financial: null, news: null, strategy: null },
      composerMarkdown: '',
    };
  }

  /**
   * 오케스트레이션 실행 (Ticker 식별 + Deep Search -> 데이터 수집 -> 핵심 분석 -> 보고서 합성)
   * @returns {Promise<Object>} 최종 조립된 보고서 객체
   */
  async run() {
    const startTime = Date.now();
    this.onStatusUpdate?.('심층 분석 오케스트레이션 기동');
    this.logger?.info('Orchestrator started');

    // 1. 병렬 시작: Ticker 식별 및 Deep Search (Google Search)
    // Deep Search는 Ticker와 무관하게 회사명으로 수행 가능하므로 즉시 시작
    const searchPromise = this.collectDeepSearch();
    const resolvePromise = this.resolveTicker();

    this.state.resolve = await resolvePromise;
    this.onStatusUpdate?.(`기업 식별 완료: ${this.state.resolve.type === 'KR' ? '한국' : '미국 ' + this.state.resolve.ticker}`);
    this.logger?.info('Ticker resolved', { resolveInfo: this.state.resolve });

    // 2. 재무 데이터 수집 (Ticker 필요)
    await this.collectFinancialData();
    
    // 3. Deep Search 완료 대기
    await searchPromise;
    this.logger?.info('Data collection complete (Parallelized)');

    // 4. 통합 구조 분석 루프 (Sisyphus Loop)
    let currentIteration = 1;
    const MAX_ITERATIONS = 2;
    let bestAnalysis = null;
    let bestScore = -1;
    let criticFeedback = "";

    while (currentIteration <= MAX_ITERATIONS) {
      // 타임아웃 방지: 35초가 넘어가면 2회차 반복을 포기하고 현재까지의 결과를 사용
      if (currentIteration > 1 && Date.now() - startTime > 35000) {
        this.logger?.info('Time safety break: Skipping 2nd iteration to ensure report composition time');
        break;
      }

      this.state.iteration = currentIteration;
      this.onStatusUpdate?.(currentIteration === 1 ? '핵심 데이터 분석 및 통찰 추출 중...' : `분석 품질 보강 중 (반복 ${currentIteration})...`);
      
      const analysisContext = { 
        finance: this.state.raw.finance,
        disclosures: this.state.raw.disclosures,
        searchBriefing: this.state.raw.searchBriefing,
        rawSearchText: this.state.raw.searchBriefing?.rawContent || "", 
        previousFeedback: criticFeedback
      };

      const coreAnalysisRaw = await this.executeJsonAgent('core-analyst', 'gemini-2.5-flash', analysisContext, ['financial', 'strategy', 'news']);
      const currentAnalysis = normalizeAnalystOutput(coreAnalysisRaw);

      // 품질 비판 (Critic)
      const criticResult = await this.executeJsonAgent('critic', 'gemini-2.5-flash', {
        analysis: currentAnalysis,
        companyName: this.companyName
      }, ['score', 'decision']);

      const score = criticResult.score || 0;
      this.state.score = score;
      this.logger?.info('Critic score received', { iteration: currentIteration, score, decision: criticResult.decision });

      if (score > bestScore) {
        bestScore = score;
        bestAnalysis = currentAnalysis;
      }

      if (score >= 85 || currentIteration >= MAX_ITERATIONS) {
        break;
      }

      criticFeedback = criticResult.feedback || "전체적인 분석의 깊이를 더 보강해 주세요.";
      currentIteration++;
    }

    this.state.analysis = bestAnalysis;
    this.state.score = bestScore;

    // 5. 보고서 합성
    this.onStatusUpdate?.('종합 보고서 작성 중...');
    this.state.composerMarkdown = await this.executeTextAgent('composer', 'gemini-2.5-pro', {
      ...this.state.analysis,
      companyName: this.companyName,
    });

    return this.assembleFinalReport();
  }

  // --- Helpers ---

  /**
   * 내부 API 호출 (DART, FMP 등 프록시 경로)
   * @param {string} path API 엔드포인트 경로
   * @param {Object} options fetch 옵션
   */
  async internalFetch(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'No body');
      this.logger?.error('Internal API fetch failure', { 
        status: res.status, 
        path, 
        body: errorBody 
      });
      throw new Error(`Internal API error (${res.status}) for ${path}: ${errorBody.substring(0, 100)}`);
    }
    return res.json();
  }

  /**
   * 기업명으로부터 상장 시장 및 티커 식별 (AI Resolver 활용)
   * @returns {Promise<{type: 'KR'|'US', ticker: string|null}>}
   */
  async resolveTicker() {
    this.onStatusUpdate?.('상장 시장 및 티커 식별 중...');
    const result = await this.executeJsonAgent('resolver', 'gemini-2.5-flash', { 
      companyName: this.companyName 
    }, ['type', 'ticker']);

    return {
      type: result.type === 'US' ? 'US' : 'KR',
      ticker: result.type === 'US' ? (result.ticker || 'UNKNOWN') : null
    };
  }

  /**
   * 최신 뉴스 및 시장 동향 검색 (Google Search 활용)
   */
  async collectDeepSearch() {
    this.onStatusUpdate?.('최신 뉴스 및 시장 동향 검색 중...');
    const today = new Date().toLocaleDateString('ko-KR');
    // 병렬화를 위해 disclosures 의존성 제거 (웹 검색은 독립적으로 수행 가능)
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
DO NOT output markdown. Respond ONLY with valid JSON.`;
    
    try {
      const searchResult = await this.callGemini('gemini-2.5-flash', searchPrompt, { 
        tools: [{ googleSearch: {} }]
      });
      
      const fullText = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const extracted = extractJson(fullText) || fullText;
      
      let searchBriefing = {};
      try {
        const parsed = JSON.parse(extracted);
        searchBriefing = { ...normalizeSearchBriefing(parsed), rawContent: fullText };
      } catch (parseErr) {
        this.logger?.warn("Search JSON parse failed, using raw fallback", { error: parseErr.message });
        searchBriefing = { ...normalizeSearchBriefing({}), rawContent: fullText };
      }
      
      this.state.raw.searchBriefing = searchBriefing;

      const groundingMetadata = searchResult.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach(chunk => {
          if (chunk.web?.uri && !this.state.raw.sources.some(s => s.uri === chunk.web.uri)) {
            this.state.raw.sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri });
          }
        });
      }
    } catch (e) {
      this.logger?.error("Search Briefing API/Process error", { error: e.message });
      this.state.raw.searchBriefing = { ...normalizeSearchBriefing({}), rawContent: '' };
    }
  }

  /**
   * DART/FMP 등 재무 데이터 수집
   */
  async collectFinancialData() {
    this.onStatusUpdate?.('DART/FMP 데이터 수집 중...');
    const { type, ticker } = this.state.resolve;
    
    if (type === 'KR') {
      this.logger?.info('Fetching KR data from DART', { companyName: this.companyName });
      const [dRes, fRes] = await Promise.all([
        this.internalFetch(`/api/data/dart?corp_name=${encodeURIComponent(this.companyName)}`)
          .catch(err => {
            this.logger?.warn('DART disclosures fetch failed', { error: err.message });
            return { list: [] };
          }),
        this.internalFetch(`/api/data/dart-finance?corp_name=${encodeURIComponent(this.companyName)}`)
          .catch(err => {
            this.logger?.warn('DART finance fetch failed', { error: err.message });
            return null;
          })
      ]);
      this.state.raw.disclosures = dRes.list?.map(d => ({ date: d.rcept_dt, title: d.report_nm })) || [];
      this.state.raw.finance = fRes;
      this.state.raw.sources.push({ title: 'DART 전자공시시스템', uri: 'https://opendart.fss.or.kr/' });
    } else {
      this.logger?.info('Fetching US data from FMP', { ticker });
      this.state.raw.finance = await this.internalFetch(`/api/data/fmp-finance?ticker=${ticker}`)
        .catch(err => {
          this.logger?.warn('FMP finance fetch failed', { error: err.message });
          return null;
        });
      this.state.raw.disclosures = [{ date: 'Current', title: `US SEC Filings for ${ticker}` }];
      this.state.raw.sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://financialmodelingprep.com/' });
    }
  }

  /**
   * 지정된 기업의 외부 데이터 수집 (레거시 유지용)
   */
  async collectData() {
    await this.collectFinancialData();
    await this.collectDeepSearch();
  }

  async executeJsonAgent(agentName, model, context = {}, wantedTopKeys = []) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output JSON. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    
    let result = null;
    let text = '';
    let extracted = '';
    try {
      result = await this.callGemini(model, prompt, { 
        temperature: 0.2, 
        responseMimeType: 'application/json',
        maxOutputTokens: 8192 
      });
      text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      extracted = extractJson(text) || text;

      if (!extracted || extracted === '{}') {
        this.logger?.warn('executeJsonAgent returned empty result', { agentName, rawText: text.substring(0, 100) });
      }

      const parsed = JSON.parse(extracted || '{}');
      this.logger?.info('executeJsonAgent success', { 
        agentName, 
        resultKeys: Object.keys(parsed) 
      });
      return wantedTopKeys.length > 0 ? normalizeAgentJson(parsed, wantedTopKeys) : parsed;
    } catch (err) {
      this.logger?.error('executeJsonAgent failed', { 
        agentName, 
        error: err.message,
        extractedSample: extracted ? extracted.substring(0, 500) : 'EMPTY',
        fullRaw: (result?.candidates?.[0]?.content?.parts?.[0]?.text || '').substring(0, 1000)
      });
      this._agentErrors.push({ 
        agent: agentName, 
        error: err.message,
        stage: 'parsing',
        extractedSnippet: extracted ? extracted.substring(0, 300) : 'EMPTY'
      });
      return {};
    }
  }

  async executeTextAgent(agentName, model, context = {}) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output Markdown. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    let result = null;
    try {
      result = await this.callGemini(model, prompt, { temperature: 0.3 });
      this.logger?.info('executeTextAgent success', { agentName });
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      this.logger?.error('executeTextAgent failed', { agentName, error: err.message });
      this._agentErrors.push({ agent: agentName, error: err.message, stage: 'generation' });
      return '';
    }
  }

  async callGemini(model, prompt, config = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    // Gemini REST API 규격에 맞춰 페이로드 구조를 재구성합니다.
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    if (config.tools) {
      body.tools = config.tools;
    }

    const generationConfig = {
      temperature: config.temperature ?? 0.2,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: config.maxOutputTokens ?? 2048,
    };
    if (config.responseMimeType) generationConfig.responseMimeType = config.responseMimeType;
    
    body.generationConfig = generationConfig;

    let retries = 3;
    let res;
    while (retries > 0) {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) break;

      if (res.status === 503 || res.status === 429) {
        retries--;
        if (retries === 0) break;
        this.logger?.warn(`API ${res.status} error. Retrying in 1s... (${retries} attempts left)`);
        console.warn(`[RETRYING] Gemini API ${res.status} for ${model}. Attempts left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        break; // 400, 401, 404 등은 즉시 중단
      }
    }
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'No body');
      console.error("\n\n[FATAL API ERROR DUMP]");
      console.error("Status:", res.status);
      console.error("Model:", model);
      console.error("Response:", errorText, "\n\n");
      this.logger?.error('Gemini API Failure', { status: res.status, model, body: errorText });
      throw new Error(`Gemini API error (${res.status}): ${errorText}`);
    }
    return res.json();
  }

  assembleFinalReport() {
    const { analysis, raw } = this.state;
    const safeAnalysis = analysis || {};
    const strategy = safeAnalysis.strategy || {};
    const financial = safeAnalysis.financial || {};
    const news = safeAnalysis.news || {};

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
      score: this.state.score,
      iteration: this.state.iteration,
      debug: { agentErrors: this._agentErrors },
    };
  }
}

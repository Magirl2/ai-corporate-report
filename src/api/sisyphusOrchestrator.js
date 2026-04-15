// src/api/sisyphusOrchestrator.js
import { extractJson } from '../utils/formatters';
import { 
  resolveTicker, 
  fetchDartDisclosures, 
  fetchDartFinance, 
  fetchFmpFinance, 
  fetchWithRetry 
} from './companyService';

const GEMINI_API_URL = '/api/gemini';

// Vite 기능을 활용해 빌드 타임에 모든 에이전트 마크다운 프롬프트를 미리 로드합니다.
const rawAgentPrompts = import.meta.glob('../../.agent/agents/*.md', { query: '?raw', import: 'default', eager: true });

// 경로가 복잡하므로 파일명(agentName) 만으로 값을 찾을 수 있게 매핑
const agentPromptsMap = {};
for (const path in rawAgentPrompts) {
  const agentName = path.split('/').pop().replace('.md', '');
  agentPromptsMap[agentName] = rawAgentPrompts[path];
}

// ─── 디버그 헬퍼 ─────────────────────────────────────────────────────────────
const DEBUG = false; // 개발 시 true로 변경
function dbg(label, data) {
  if (!DEBUG) return;
  const preview = typeof data === 'string'
    ? data.slice(0, 300) + (data.length > 300 ? '…' : '')
    : JSON.stringify(data, null, 2).slice(0, 600);
  console.debug(`[SisyphusOrchestrator] ── ${label} ──\n${preview}`);
}

/**
 * JSON 에이전트 응답을 정규화합니다.
 * AI가 래퍼 객체(예: { "strategicAnalysis": {...} })로 반환할 경우를 방어합니다.
 * wantedTopKeys: 최상위에 기대하는 키 목록. 없으면 래퍼를 unwrap합니다.
 */
function normalizeAgentJson(parsed, wantedTopKeys) {
  if (!parsed || typeof parsed !== 'object') return {};
  
  // 이미 원하는 키 중 하나라도 최상위에 있으면 그대로 반환
  const hasWantedKey = wantedTopKeys.some(k => k in parsed);
  if (hasWantedKey) return parsed;

  // 래퍼 객체가 1단계 감싸고 있는 경우 unwrap 시도
  const keys = Object.keys(parsed);
  if (keys.length === 1) {
    const inner = parsed[keys[0]];
    if (inner && typeof inner === 'object') {
      const innerHasWanted = wantedTopKeys.some(k => k in inner);
      if (innerHasWanted) {
        dbg(`normalizeAgentJson: unwrapped "${keys[0]}"`, inner);
        return inner;
      }
    }
  }

  return parsed;
}

/**
 * Multi-Agent Orchestrator
 * FLOW: Resolver → Collector → Normalizer → [Financial+Disclosure] → [News+Strategy] → Composer → Validator
 */
export class SisyphusOrchestrator {
  constructor(companyName, onStatusUpdate) {
    this.companyName = companyName;
    this.onStatusUpdate = onStatusUpdate;
    this._agentErrors = [];
    this.state = {
      resolve: null,
      raw: {
        disclosures: '',
        finance: null,
        searchBriefing: '',
        sources: []
      },
      normalized: null,
      analysis: {
        financial: null,
        disclosure: null,
        news: null,
        strategy: null,
      },
      composerMarkdown: '',
      validation: { isValid: true, errors: [] },
    };
  }

  async run() {
    this.onStatusUpdate?.(`[시작] '${this.companyName}' 심층 분석 시시포스 루프 기동`);

    // 1. Resolver (Flash) - Ticker/Exchange 식별
    this.state.resolve = await resolveTicker(this.companyName);
    this.onStatusUpdate?.(`[Resolver] ${this.state.resolve.type === 'KR' ? '한국 KRX' : '미국 ' + this.state.resolve.ticker} 식별 완료`);

    // 2. Collector (Native Tools + Search)
    await this.collectData();

    // 3. Normalizer (Flash) - 데이터 표준화 (루프 밖에서 1회만 실행)
    this.onStatusUpdate?.(`[데이터 정제] 수집된 원시 데이터 표준화 중...`);
    this.state.normalized = await this.executeJsonAgent('normalizer', 'gemini-2.5-flash', 
      { raw: this.state.raw, resolver: this.state.resolve },
      [] // normalizer는 자유 스키마
    );

    // 4~7. Batch Analysis (Flash/Pro) - 2개씩 짝지어서 병렬 처리 (루프 밖에서 1회만 실행)
    this.onStatusUpdate?.(`[분석] 4개 전문 분야 분석 중 (그룹 1/2)...`);
    const [financialRaw, disclosureRaw] = await Promise.all([
      this.executeJsonAgent('financial-analyst', 'gemini-2.5-flash', 
        { normalized: this.state.normalized },
        ['overview', 'keyMetrics']
      ),
      this.executeJsonAgent('disclosure-analyst', 'gemini-2.5-flash', 
        { rawDisclosures: this.state.raw.disclosures },
        []
      )
    ]);

    this.onStatusUpdate?.(`[분석] 4개 전문 분야 분석 중 (그룹 2/2)...`);
    const [newsRaw, strategyRaw] = await Promise.all([
      this.executeJsonAgent('news-analyst', 'gemini-2.5-flash', 
        { searchBriefing: this.state.raw.searchBriefing },
        ['marketSentiment', 'recentNews']
      ),
      this.executeJsonAgent('strategy-analyst', 'gemini-2.5-pro', 
        { normalized: this.state.normalized, briefing: this.state.raw.searchBriefing },
        ['macroTrend', 'industryStatus', 'vision', 'businessModel', 'swotAnalysis']
      )
    ]);

    this.state.analysis = { 
      financial: financialRaw, 
      disclosure: disclosureRaw, 
      news: newsRaw, 
      strategy: strategyRaw 
    };

    dbg('analysis.strategy keys', Object.keys(strategyRaw || {}));
    dbg('analysis.financial keys', Object.keys(financialRaw || {}));
    dbg('analysis.news keys', Object.keys(newsRaw || {}));

    // 8. Composer (Pro) - 단일 실행 (루프 폐지)
    this.onStatusUpdate?.(`[보고서 합성] AI 종합 보고서 작성 중...`);
    this.state.composerMarkdown = await this.executeTextAgent('composer', 'gemini-2.5-pro', {
      ...this.state.analysis,
      companyName: this.companyName,
    });

    // 9. Validator (Flash) - 팩트 체크 1회
    this.onStatusUpdate?.(`[검증] 팩트 체크 중...`);
    this.state.validation = await this.executeJsonAgent('validator', 'gemini-2.5-flash', {
      report: this.state.composerMarkdown,
      sourceData: this.state.raw
    }, ['isValid', 'errors']);

    if (!this.state.validation || typeof this.state.validation.isValid !== 'boolean') {
      this.state.validation = { isValid: true, errors: [] };
    }

    const finalReport = this.assembleFinalReport();
    dbg('assembleFinalReport — final report keys (report.*)', Object.keys(finalReport.report || {}));
    dbg('assembleFinalReport — macroTrend', finalReport.report?.macroTrend);
    return finalReport;
  }

  async collectData() {
    this.onStatusUpdate?.(`[Collector] DART/FMP 및 최신 뉴스 수집 중...`);
    const { type, ticker } = this.state.resolve;
    const sources = [];

    // [Step A] Financial & Disclosure APIs
    let disclosures = '';
    let finance = null;
    let financeContext = '';

    const today = new Date().toLocaleDateString('ko-KR');

    if (type === 'KR') {
      [disclosures, finance] = await Promise.all([
        fetchDartDisclosures(this.companyName),
        fetchDartFinance(this.companyName)
      ]);
      sources.push({ title: 'DART 전자공시시스템', uri: 'https://opendart.fss.or.kr/' });

      financeContext = finance
        ? `
[DART 재무제표 실수치 (${finance.bsnsYear}년 기준, 단위: 원)]
- 매출액: ${finance.raw.revenue}
- 영업이익: ${finance.raw.opIncome}
- 당기순이익: ${finance.raw.netIncome}
- 자본총계: ${finance.raw.equity}
- 부채총계: ${finance.raw.liab}

[계산된 지표]
- 매출 성장률: ${finance.keyMetrics.revenueGrowth ?? '데이터 없음'}
- 영업이익률: ${finance.keyMetrics.operatingMargin ?? '데이터 없음'}
- ROE: ${finance.keyMetrics.roe ?? '데이터 없음'}
- 부채비율: ${finance.keyMetrics.debtRatio ?? '데이터 없음'}
` : 'DART 재무제표 수집 실패. 검색을 참조하세요.';
    } else {
      finance = await fetchFmpFinance(ticker);
      disclosures = `US SEC Filings for ${ticker} (Refer to web search for details)`;
      sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://financialmodelingprep.com/' });

      financeContext = finance
        ? `
[FMP 재무제표 실수치 (${finance.bsnsYear}년 기준, 단위: ${finance.raw.currency})]
- 매출액: ${finance.raw.revenue}
- 영업이익: ${finance.raw.opIncome}
- 당기순이익: ${finance.raw.netIncome}
- 자본총계: ${finance.raw.equity}
- 부채총계: ${finance.raw.liab}

[계산된 지표]
- 매출 성장률: ${finance.keyMetrics.revenueGrowth ?? '데이터 없음'}
- 영업이익률: ${finance.keyMetrics.operatingMargin ?? '데이터 없음'}
- ROE: ${finance.keyMetrics.roe ?? '데이터 없음'}
- 부채비율: ${finance.keyMetrics.debtRatio ?? '데이터 없음'}
` : 'FMP 재무제표 수집 실패. 검색을 참조하세요.';
    }

    // [Step B] Deep Search Briefing (Uses gemini-2.5-pro with tools)
    this.onStatusUpdate?.(`[Collector] 메인 엔진 심층 웹 검색 중 (약 15초 소요)...`);
    
    const searchPrompt = `
      Today's date is ${today}. You are a Senior Equity Research Analyst & Corporate Strategy Consultant at a top-tier global firm.
      Your mission is to conduct an **EXPRESS INVESTIGATIVE RESEARCH** for '${this.companyName}' (${type}: ${ticker || 'KRX'}) using the **Product Strategy Canvas (9 Sections)** and **Value Proposition (JTBD)** frameworks.

      **REQUIRED RESEARCH VERTICALS (BASED ON STRATEGY SKILLS):**
      1. **Vision & Mission**: What is their North Star? Long-term aspirational goals and core values.
      2. **Target Segments**: Who are their high-value customers? Precise market demographics and personas.
      3. **Value Proposition (Jobs-to-be-Done)**: What specific pain points do they solve? "What are they hired to do?"
      4. **Product Infrastructure**: Core features, UX/UI, and product distribution channels (Omni-channel strategy).
      5. **Trade-offs (Focus)**: What have they explicitly decided NOT to do? Strategic sacrifices for efficiency.
      6. **Key Metrics (KPIs)**: Revenue, ARR, Retention, Churn, or industry-specific metrics.
      7. **Growth & Monetization Loops**: Viral loops, content loops, and precise pricing/revenue models.
      8. **Capabilities**: Internal proprietary technology, data assets, and operational excellence.
      9. **Defensibility (Moats)**: Why can't competitors easily copy them? (Network effects, Brand, Switching costs).

      **CRITICAL FACT-CHECKING & HALLUCINATION PREVENTION:**
      - You MUST ground all references to official corporate actions, financials, and recent events strictly in the provided context below.
      - DO NOT invent, assume, or hallucinate any recent events (especially regarding trading suspension, delisting, bankruptcy, or revenue) that contradict the provided data.
      - Output a remarkably exhaustive briefing in English (Aim for 25,000+ characters).

      [OFFICIAL DISCLOSURES & CONTEXT]
      ${disclosures}

      [OFFICIAL FINANCIAL DATA]
      ${financeContext}
    `;
    
    const searchResult = await fetchWithRetry(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: searchPrompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 25000 }
      })
    });

    const searchBriefing = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract Grounding Metadata
    const groundingMetadata = searchResult.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach(chunk => {
        if (chunk.web?.uri && !sources.some(s => s.uri === chunk.web.uri)) {
          sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri });
        }
      });
    }

    this.state.raw = { disclosures, finance, searchBriefing, sources };
  }

  // ─── JSON 에이전트 실행 ──────────────────────────────────────────────────────
  // responseMimeType: "application/json" 강제 + JSON.parse + 래퍼 unwrap 포함
  async executeJsonAgent(agentName, model, context = {}, wantedTopKeys = []) {
    const systemInstruction = agentPromptsMap[agentName] 
      ? `## SYSTEM DOMAIN EXPERTISE & RULES:\n${agentPromptsMap[agentName]}` 
      : `You are the specialized '${agentName}' agent for corporate analysis. Output MUST be in JSON format.`;

    const agentPrompt = `${systemInstruction}
    
## CURRENT TASK CONTEXT:
${JSON.stringify(context, null, 2)}

## INSTRUCTION:
Provide high-quality analysis exactly matching your designated JSON schema output.
Language: Respond in Korean (except for raw data fields that require English).`;

    try {
      const result = await fetchWithRetry(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          contents: [{ parts: [{ text: agentPrompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        })
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      dbg(`${agentName} raw response (first 400 chars)`, text.slice(0, 400));

      let parsed;
      try {
        parsed = JSON.parse(extractJson(text) || text || '{}');
      } catch (parseErr) {
        const errObj = { __error: parseErr.message, __agent: agentName, __rawPreview: text.slice(0, 200) };
        console.error(`[${agentName}] JSON parse failed:`, parseErr.message);
        this._agentErrors.push(errObj);
        return errObj;
      }

      dbg(`${agentName} parsed JSON keys`, Object.keys(parsed));

      // 래퍼 unwrap
      const normalized = wantedTopKeys.length > 0
        ? normalizeAgentJson(parsed, wantedTopKeys)
        : parsed;

      dbg(`${agentName} normalized JSON keys`, Object.keys(normalized));
      return normalized;

    } catch (err) {
      const errObj = { __error: err.message, __agent: agentName };
      console.error(`[${agentName}] fetch failed:`, err);
      this._agentErrors.push(errObj);
      return errObj;
    }
  }

  // ─── 텍스트(Markdown) 에이전트 실행 ─────────────────────────────────────────
  // composer 전용. responseMimeType 없음, JSON.parse 없음.
  async executeTextAgent(agentName, model, context = {}) {
    const systemInstruction = agentPromptsMap[agentName] 
      ? `## SYSTEM DOMAIN EXPERTISE & RULES:\n${agentPromptsMap[agentName]}` 
      : `You are the specialized '${agentName}' agent. Output MUST be plain Markdown text, NOT JSON.`;

    const agentPrompt = `${systemInstruction}

## CURRENT TASK CONTEXT:
${JSON.stringify(context, null, 2)}

## INSTRUCTION:
Write a comprehensive Markdown report based on the context above.
DO NOT output JSON. Output pure Markdown only.
Language: Korean`;

    try {
      const result = await fetchWithRetry(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          contents: [{ parts: [{ text: agentPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 8000 }
          // responseMimeType 없음 — Markdown 텍스트 반환
        })
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      dbg(`${agentName} (text) preview`, text.slice(0, 400));
      return text;

    } catch (err) {
      console.error(`[${agentName}] text agent fetch failed:`, err);
      this._agentErrors.push({ __error: err.message, __agent: agentName });
      return '';
    }
  }

  assembleFinalReport() {
    const { analysis, raw } = this.state;
    const strategy = analysis.strategy || {};
    const financial = analysis.financial || {};
    const news      = analysis.news      || {};

    return {
      companyName: this.companyName,
      report: {
        macroTrend:     strategy.macroTrend     || null,
        industryStatus: strategy.industryStatus || null,
        vision:         strategy.vision         || null,
        businessModel:  strategy.businessModel  || null,
        swotAnalysis:   strategy.swotAnalysis   || null,
        marketSentiment: news.marketSentiment   || null,
        recentNews:      news.recentNews        || [],
        financialAnalysis: {
          overview:   financial.overview   || null,
          keyMetrics: financial.keyMetrics || []
        },
        markdown: this.state.composerMarkdown || '',
      },
      sources:     raw.sources,
      financeData: raw.finance,
      debug: { agentErrors: this._agentErrors },
    };
  }
}

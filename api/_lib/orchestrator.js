// api/_lib/orchestrator.js
import { loadAgentPrompts } from './prompts.js';

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * 엔진 스테이지별 독립 실행 예산 (Timeout) 정의
 */
const STAGE_TIMEOUTS = {
  resolve: 15000,
  data: 15000,
  search: 40000,
  analyze: 50000,
  'analyze-financial': 45000,
  'analyze-strategy': 45000,
  'analyze-news': 45000,
  compose: 35000
};

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
    this.metadata = {
      stagedEngines: {},
      totalDurationMs: 0
    };
    this.state = {
      resolve: null,
      raw: { disclosures: [], finance: null, searchBriefing: {}, sources: [] },
      analysis: { financial: null, news: null, strategy: null },
      composerMarkdown: '',
      iteration: 0,
      score: 0
    };
    this.startTime = 0;
  }

  /**
   * 내부 엔진 단계를 측정하고 상태를 기록하며 표준 결과 봉투를 반환합니다.
   * 각 스테이지는 독립적인 Timeout 예산을 가집니다.
   */
  async measureStage(stageName, fn) {
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutMs = STAGE_TIMEOUTS[stageName] || 30000;

    const stage = {
      status: 'running',
      startTime: Date.now(),
      durationMs: 0,
      error: null,
      warnings: []
    };
    this.metadata.stagedEngines[stageName] = stage;
    this.logger?.info(`Engine stage started: ${stageName} (Budget: ${timeoutMs}ms)`);

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`Timeout: ${stageName} stage exceeded ${timeoutMs}ms`));
      }, timeoutMs);
      signal.addEventListener('abort', () => clearTimeout(timer));
    });

    try {
      // 엔진 함수 호출 (AbortSignal 전달)
      const executionPromise = fn(signal);
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      stage.status = result.ok ? 'completed' : 'failed';
      stage.error = result.error || null;
      stage.warnings = result.warnings || [];
      
      if (!result.ok) {
        this.logger?.warn(`Engine stage completed with error: ${stageName}`, { error: result.error });
      } else {
        this.logger?.info(`Engine stage completed successfully: ${stageName}`);
      }
      
      return result;
    } catch (err) {
      const isTimeout = err.message.includes('exceeded') || err.name === 'AbortError';
      stage.status = isTimeout ? 'timeout' : 'failed';
      stage.error = err.message;
      this.logger?.error(`Engine stage stopped: ${stageName}`, { error: err.message, type: stage.status });
      
      return { 
        ok: false, 
        error: err.message, 
        data: null, 
        isTimeout 
      };
    } finally {
      stage.durationMs = Date.now() - stage.startTime;
      controller.abort(); // 실행이 이미 완료되었더라도 정리
    }
  }

  // getRemainingBudget() 제거됨 (최고 품질을 위해 독립 예산 체제로 전환)

  async run() {
    this.logger?.info('Orchestrator run (legacy wrapper) started');
    const stage1Data = await this.runStage1Search();
    return await this.runStage2Analysis(stage1Data);
  }

  /**
   * Stage 1: 검색 및 브리핑 생성
   * 기업 식별, 재무 데이터 수집, 웹 검색을 수행하여 분석을 위한 '원재료'를 준비합니다.
   */
  async runStage1Search() {
    this.startTime = Date.now();
    this.onStatusUpdate?.('정보 수집 및 브리핑 생성 중 (Stage 1)');
    this.logger?.info('Stage 1 Search started');

    // 1. Resolve Stage (Independent budget)
    const resolveRes = await this.measureStage('resolve', (sig) => this.engineResolve(this.companyName, sig));
    this.state.resolve = resolveRes.ok ? resolveRes.data : { type: 'KR', ticker: null };

    // 2. Data & Search (Parallel, Independent budgets)
    const [dataRes, searchRes] = await Promise.all([
      this.measureStage('data', (sig) => this.engineData(this.state.resolve, this.companyName, sig)),
      this.measureStage('search', (sig) => this.engineSearch(this.companyName, this.state.resolve, sig))
    ]);

    if (dataRes.ok) {
      this.state.raw.disclosures = dataRes.data.disclosures;
      this.state.raw.finance = dataRes.data.finance;
    }
    if (searchRes.ok) {
      this.state.raw.searchBriefing = searchRes.data.searchBriefing;
    }

    return {
      identity: this.state.resolve,
      raw: {
        searchBriefing: this.state.raw.searchBriefing,
        finance: this.state.raw.finance,
        disclosures: this.state.raw.disclosures,
        sources: this.state.raw.sources
      }
    };
  }

  /**
   * Stage 2: 분석 및 보고서 조립
   * 준비된 브리핑 데이터를 바탕으로 섹션별 심층 분석을 수행하고 최종 보고서를 조립합니다.
   */
  async runStage2Analysis(stage1Data) {
    if (stage1Data) {
      // 외부에서 주입된 데이터로 상태 동기화 (Stage 1 건너뛰기 가능)
      this.state.resolve = stage1Data.identity || this.state.resolve;
      this.state.raw.searchBriefing = stage1Data.raw?.searchBriefing || this.state.raw.searchBriefing;
      this.state.raw.finance = stage1Data.raw?.finance || this.state.raw.finance;
      this.state.raw.disclosures = stage1Data.raw?.disclosures || this.state.raw.disclosures;
      this.state.raw.sources = stage1Data.raw?.sources || this.state.raw.sources;
    }

    this.onStatusUpdate?.('심층 분석 및 보고서 생성 중 (Stage 2)');
    this.logger?.info('Stage 2 Analysis started');

    // 3. Analyze Stage (Output engines run in parallel)
    const analyzeRes = await this.measureStage('analyze', (sig) => this.engineAnalyze(sig));
    if (analyzeRes.ok) {
      this.state.analysis = analyzeRes.data.analysis;
      this.state.score = analyzeRes.data.score;
      this.state.iteration = analyzeRes.data.iteration;
    }

    // 4. Summarize/Compose Stage
    const composeRes = await this.measureStage('compose', (sig) => this.engineCompose(sig));
    if (composeRes.ok) {
      this.state.composerMarkdown = composeRes.data;
    }

    this.metadata.totalDurationMs = Date.now() - (this.startTime || (Date.now() - 1));
    return this.assembleFinalReport();
  }

  /**
   * STAGE 1: 기업 식별 (Resolve)
   */
  async engineResolve(companyName, signal) {
    try {
      const resolveInfo = await this.resolveTicker(signal);
      this.onStatusUpdate?.(`기업 식별 완료: ${resolveInfo.type === 'KR' ? '한국' : '미국 ' + resolveInfo.ticker}`);
      return { ok: true, data: resolveInfo };
    } catch (err) {
      return { ok: false, error: err.message, data: { type: 'KR', ticker: null } };
    }
  }

  /**
   * STAGE 2: 데이터 수집 (Data)
   */
  async engineData(identity, companyName, signal) {
    const result = { disclosures: [], finance: null };
    const warnings = [];
    
    this.onStatusUpdate?.('DART/FMP 데이터 수집 중...');
    const { type, ticker } = identity;
    
    try {
      if (type === 'KR') {
        const safeCorpName = encodeURIComponent(companyName.replace(/\s+/g, ''));
        const [dRes, fRes] = await Promise.all([
          this.internalFetch(`/api/data/dart?corp_name=${safeCorpName}`, { signal }).catch(e => { warnings.push(`DART disclosures error: ${e.message}`); return { list: [] }; }),
          this.internalFetch(`/api/data/dart-finance?corp_name=${safeCorpName}`, { signal }).catch(e => { warnings.push(`DART finance error: ${e.message}`); return null; })
        ]);
        result.disclosures = dRes.list?.map(d => ({ date: d.rcept_dt, title: d.report_nm })) || [];
        result.finance = fRes;
        this.state.raw.sources.push({ title: 'DART 전자공시시스템', uri: 'https://opendart.fss.or.kr/' });
      } else {
        result.finance = await this.internalFetch(`/api/data/fmp-finance?ticker=${ticker}`, { signal }).catch(e => { warnings.push(`FMP error: ${e.message}`); return null; });
        result.disclosures = [{ date: 'Current', title: `US SEC Filings for ${ticker}` }];
        this.state.raw.sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://financialmodelingprep.com/' });
      }
      return { ok: true, data: result, warnings };
    } catch (err) {
      return { ok: false, error: err.message, data: result, warnings };
    }
  }

  /**
   * STAGE 3: 웹 검색 (Search)
   */
  async engineSearch(companyName, identity, signal) {
    this.onStatusUpdate?.('최신 뉴스 및 시장 동향 검색 중...');
    const today = new Date().toLocaleDateString('ko-KR');
    const searchPrompt = `Evaluate '${companyName}'. Today is ${today}. identity: ${JSON.stringify(identity)}.
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
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192,
        signal
      });
      
      const fullText = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const extracted = extractJson(fullText) || fullText;
      
      let searchBriefing = {};
      try {
        const parsed = JSON.parse(extracted);
        searchBriefing = { ...normalizeSearchBriefing(parsed), rawContent: fullText };
      } catch (_parseErr) {
        searchBriefing = { ...normalizeSearchBriefing({}), rawContent: fullText };
      }
      
      const groundingMetadata = searchResult.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach(chunk => {
          if (chunk.web?.uri && !this.state.raw.sources.some(s => s.uri === chunk.web.uri)) {
            this.state.raw.sources.push({ title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri });
          }
        });
      }
      
      return { ok: true, data: { searchBriefing } };
    } catch (e) {
      return { ok: false, error: e.message, data: { searchBriefing: normalizeSearchBriefing({}) } };
    }
  }

  /**
   * STAGE 4: 분석 (Analyze) - 분산형 멀티-엔진 파이프라인
   */
  async engineAnalyze(_mainSignal) {
    this.onStatusUpdate?.('심층 분석 및 섹션별 통찰 추출 중...');
    
    // 섹션별 엔진 병렬 실행 (각각 독립된 Timeout 예산 적용)
    const [finRes, stratRes, newsRes] = await Promise.allSettled([
      this.measureStage('analyze-financial', (sig) => this.engineAnalyzeFinancial(sig)),
      this.measureStage('analyze-strategy', (sig) => this.engineAnalyzeStrategy(sig)),
      this.measureStage('analyze-news', (sig) => this.engineAnalyzeNews(sig))
    ]);

    const finalAnalysis = normalizeAnalystOutput({});
    let totalScore = 0;
    let successfulSections = 0;

    const processResult = (res, sectionKey) => {
      if (res.status === 'fulfilled' && res.value.ok) {
        finalAnalysis[sectionKey] = res.value.data[sectionKey];
        if (res.value.data.score) {
          totalScore += res.value.data.score;
          successfulSections++;
        }
      } else {
        this.logger?.warn(`Section analysis failed: ${sectionKey}`, { 
          reason: res.reason || res.value?.error 
        });
      }
    };

    processResult(finRes, 'financial');
    processResult(stratRes, 'strategy');
    processResult(newsRes, 'news');

    const averageScore = successfulSections > 0 ? Math.round(totalScore / successfulSections) : 0;

    return { 
      ok: true, 
      data: { 
        analysis: finalAnalysis, 
        score: averageScore || 80, // 기본 점수 
        iteration: 1 
      } 
    };
  }

  /**
   * 재무 섹션 분석 엔진
   */
  async engineAnalyzeFinancial(signal) {
    const context = {
      finance: this.state.raw.finance,
      disclosures: this.state.raw.disclosures,
      searchBriefing: this.state.raw.searchBriefing,
      rawSearchText: this.state.raw.searchBriefing?.rawContent || ""
    };
    
    const res = await this.executeJsonAgent('analyst-financial', 'gemini-2.5-flash', context, ['financial'], signal);
    const score = await this.engineSimpleScore('financial', res, signal);
    
    return { ok: true, data: { financial: res.financial, score } };
  }

  /**
   * 전략/거시 섹션 분석 엔진
   */
  async engineAnalyzeStrategy(signal) {
    const context = {
      searchBriefing: this.state.raw.searchBriefing,
      rawSearchText: this.state.raw.searchBriefing?.rawContent || "",
      disclosures: this.state.raw.disclosures
    };
    
    const res = await this.executeJsonAgent('analyst-strategy', 'gemini-2.5-flash', context, ['strategy'], signal);
    const score = await this.engineSimpleScore('strategy', res, signal);
    
    return { ok: true, data: { strategy: res.strategy, score } };
  }

  /**
   * 뉴스/센티먼트 섹션 분석 엔진
   */
  async engineAnalyzeNews(signal) {
    const context = {
      searchBriefing: this.state.raw.searchBriefing,
      rawSearchText: this.state.raw.searchBriefing?.rawContent || ""
    };
    
    const res = await this.executeJsonAgent('analyst-news', 'gemini-2.5-flash', context, ['news'], signal);
    const score = await this.engineSimpleScore('news', res, signal);
    
    return { ok: true, data: { news: res.news, score } };
  }

  /**
   * 섹션별 간이 품질 점수 측정
   */
  async engineSimpleScore(sectionName, data, signal) {
    try {
      const criticResult = await this.executeJsonAgent('critic', 'gemini-2.5-flash', {
        section: sectionName,
        data: data,
        companyName: this.companyName
      }, ['score'], signal);
      return criticResult.score || 80;
    } catch (_e) {
      return 80;
    }
  }

  /**
   * STAGE 5: 합성 (Compose)
   */
  async engineCompose(signal) {
    this.onStatusUpdate?.('AI 핵심 요약 및 인사이트 합성 중...');
    const result = await this.executeTextAgent('composer', 'gemini-2.5-pro', {
      ...this.state.analysis,
      companyName: this.companyName,
      rawSearchText: this.state.raw.searchBriefing?.rawContent || "", 
      financeData: this.state.raw.finance,
      disclosures: this.state.raw.disclosures
    }, signal);
    return { ok: true, data: result };
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
  async resolveTicker(signal) {
    this.onStatusUpdate?.('상장 시장 및 티커 식별 중...');
    const result = await this.executeJsonAgent('resolver', 'gemini-2.5-flash', { 
      companyName: this.companyName 
    }, ['type', 'ticker'], signal);

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
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 8192
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
      const safeCorpName = encodeURIComponent(this.companyName.replace(/\s+/g, '')); // RESTORED
      const [dRes, fRes] = await Promise.all([
        this.internalFetch(`/api/data/dart?corp_name=${safeCorpName}`)
          .catch(err => {
            this.logger?.warn('DART disclosures fetch failed', { error: err.message });
            return { list: [] };
          }),
        this.internalFetch(`/api/data/dart-finance?corp_name=${safeCorpName}`)
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

  async executeJsonAgent(agentName, model, context = {}, wantedTopKeys = [], signal) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output JSON. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    
    let result = null;
    let text = '';
    let extracted = '';
    try {
      result = await this.callGemini(model, prompt, { 
        temperature: 0.2, 
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
        signal
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
      if (err.name === 'AbortError') {
        this.logger?.warn('executeJsonAgent aborted', { agentName });
        throw err;
      }
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

  async executeTextAgent(agentName, model, context = {}, signal) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output Markdown. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    let result = null;
    try {
      result = await this.callGemini(model, prompt, { temperature: 0.3, signal });
      this.logger?.info('executeTextAgent success', { agentName });
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      if (err.name === 'AbortError') {
        this.logger?.warn('executeTextAgent aborted', { agentName });
        throw err;
      }
      this.logger?.error('executeTextAgent failed', { agentName, error: err.message });
      this._agentErrors.push({ agent: agentName, error: err.message, stage: 'generation' });
      return '';
    }
  }

  async callGemini(model, prompt, config = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    let retries = 3;
    let res;
    while (retries > 0) {
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

      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: config.signal
      });

      if (res.ok) break;

      if (res.status === 503 || res.status === 429) {
        retries--;
        if (retries === 0) {
          if (model === 'gemini-2.5-flash') {
            this.logger?.warn(`Falling back from 2.5-flash to 2.0-flash.`);
            model = 'gemini-2.0-flash';
            retries = 1;
            // URL 업데이트가 필요하므로 루프 계속
          } else if (model === 'gemini-2.5-pro') {
            this.logger?.warn(`Falling back from 2.5-pro to 1.5-pro.`);
            model = 'gemini-1.5-pro';
            retries = 1;
          } else {
             break;
          }
        } else {
          this.logger?.warn(`API ${res.status} error. Retrying in 1s... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
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
    
    // UI 계약을 보장하기 위한 안전한 정규화 (Partial Success 대응)
    const safeAnalysis = normalizeAnalystOutput(analysis || {});
    const { strategy, financial, news } = safeAnalysis;

    return {
      companyName: this.companyName || 'Unknown Company',
      report: {
        // Strategy Sections
        macroTrend: strategy.macroTrend,
        industryStatus: strategy.industryStatus,
        vision: strategy.vision,
        businessModel: strategy.businessModel,
        swotAnalysis: strategy.swotAnalysis,
        
        // News Sections
        marketSentiment: news.marketSentiment,
        recentNews: news.recentNews,
        
        // Financial Sections
        financialAnalysis: {
          overview: financial.overview,
          keyMetrics: financial.keyMetrics
        },
        
        // Final Composition
        markdown: this.state.composerMarkdown || '',
      },
      sources: raw.sources || [],
      financeData: raw.finance || null,
      score: this.state.score || 0,
      iteration: this.state.iteration || 1,
      metadata: this.metadata, // 스테이지 메타데이터 포함
      debug: { 
        agentErrors: this._agentErrors,
        isPartialResult: this._agentErrors.length > 0
      },
    };
  }
}

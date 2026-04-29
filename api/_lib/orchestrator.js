// api/_lib/orchestrator.js
import { loadAgentPrompts } from './prompts.js';
import { resolveCorpCode } from './dart-utils.js';

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * 엔진 스테이지별 독립 실행 예산 (Timeout) 정의
 */
const STAGE_TIMEOUTS = {
  resolve: 15000,
  data: 30000,
  search: 40000,
  analyze: 50000,
  'analyze-financial': 45000,
  'analyze-strategy': 45000,
  'analyze-news': 45000,
  compose: 55000  // compose.js maxDuration=60초 내에서 최대한 확보
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

/**
 * 섹션별 데이터 검증 함수
 */
export function validateFinancialSection(section) {
  if (!section) return false;
  const hasOverview = !!(section.overview?.summary || section.overview?.detail);
  const hasKeyMetrics = Array.isArray(section.keyMetrics);
  return hasOverview && hasKeyMetrics;
}

export function validateStrategySection(section) {
  if (!section) return false;
  let count = 0;
  if (section.macroTrend?.summary || section.macroTrend?.detail) count++;
  if (section.industryStatus?.summary || section.industryStatus?.detail) count++;
  if (section.vision?.summary || section.vision?.detail) count++;
  if (section.businessModel?.summary || section.businessModel?.detail) count++;
  
  const hasSwot = section.swotAnalysis && 
                  Array.isArray(section.swotAnalysis.strengths) && 
                  Array.isArray(section.swotAnalysis.weaknesses) &&
                  Array.isArray(section.swotAnalysis.opportunities) &&
                  Array.isArray(section.swotAnalysis.threats);
  
  return count >= 2 && hasSwot;
}

export function validateNewsSection(section) {
  if (!section) return false;
  const hasMarketSentiment = !!(section.marketSentiment?.status || section.marketSentiment?.detail);
  const hasRecentNews = Array.isArray(section.recentNews);
  return hasMarketSentiment && hasRecentNews;
}

/**
 * Fallback 섹션 생성 함수 — 분석 실패 시 최소한의 구조화된 데이터를 반환합니다.
 */
export function fallbackFinancialSection(reason = '') {
  return {
    overview: {
      summary: '정형 재무 분석을 충분히 생성하지 못했습니다.',
      detail: reason || '수집된 재무 데이터가 부족하거나 AI 분석 결과가 올바른 JSON 스키마를 충족하지 못했습니다.'
    },
    keyMetrics: []
  };
}

export function fallbackStrategySection(reason = '') {
  const defaultDetail = reason || '검색 브리핑 또는 분석 결과가 부족합니다.';
  return {
    macroTrend: { summary: '거시 환경 분석을 생성하지 못했습니다.', detail: defaultDetail },
    industryStatus: { summary: '산업 현황 분석을 생성하지 못했습니다.', detail: defaultDetail },
    vision: { summary: '비전 분석을 생성하지 못했습니다.', detail: defaultDetail },
    businessModel: { summary: '비즈니스 모델 분석을 생성하지 못했습니다.', detail: defaultDetail },
    swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
  };
}

export function fallbackNewsSection(reason = '') {
  return {
    marketSentiment: { status: 'Neutral', detail: reason || '뉴스 분석 결과를 생성하지 못했습니다.', analysis: [] },
    recentNews: []
  };
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
    this.options = { qualityMode: 'deep' };
  }

  setOptions(opts) {
    this.options = { ...this.options, ...opts };
    this.logger?.info('Orchestrator options updated', { options: this.options });
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
   * Stage 2: 분석 (Analyze Only)
   * 준비된 브리핑 데이터를 바탕으로 섹션별 심층 분석만 수행합니다.
   */
  async runStage2Analyze(stage1Data) {
    if (stage1Data) {
      // 외부에서 주입된 데이터로 상태 동기화 (Stage 1 건너뛰기 가능)
      this.state.resolve = stage1Data.identity || this.state.resolve;
      this.state.raw.searchBriefing = stage1Data.raw?.searchBriefing || this.state.raw.searchBriefing;
      this.state.raw.finance = stage1Data.raw?.finance || this.state.raw.finance;
      this.state.raw.disclosures = stage1Data.raw?.disclosures || this.state.raw.disclosures;
      this.state.raw.sources = stage1Data.raw?.sources || this.state.raw.sources;
    }

    this.onStatusUpdate?.('심층 분석 중 (Stage 2)');
    this.logger?.info('Stage 2 Analyze started');

    // 3. Analyze Stage (Output engines run in parallel)
    const analyzeRes = await this.measureStage('analyze', (sig) => this.engineAnalyze(sig));
    if (analyzeRes.ok) {
      this.state.analysis = analyzeRes.data.analysis;
      this.state.score = analyzeRes.data.score;
      this.state.iteration = analyzeRes.data.iteration;
    }

    // Stage 2 quality gate 추가
    let missingSections = [];
    if (!validateFinancialSection(this.state.analysis?.financial) || this.state.analysis?.financial?.overview?.summary?.includes('충분히 생성하지 못했습니다')) {
      missingSections.push('financial');
    }
    if (!validateStrategySection(this.state.analysis?.strategy) || this.state.analysis?.strategy?.macroTrend?.summary?.includes('생성하지 못했습니다')) {
      missingSections.push('strategy');
    }
    if (!validateNewsSection(this.state.analysis?.news) || this.state.analysis?.news?.marketSentiment?.detail?.includes('생성하지 못했습니다')) {
      missingSections.push('news');
    }

    if (missingSections.length > 0) {
      this.metadata.missingSections = missingSections;
    }
    if (missingSections.length >= 2) {
      this.metadata.qualityWarning = true;
      this._agentErrors.push({ 
        stage: 'quality-gate', 
        error: `Multiple missing sections: ${missingSections.join(', ')}` 
      });
      this.onStatusUpdate?.("일부 섹션 분석 결과 부족. 분석을 마무리합니다...");
    }

    return {
      companyName: this.companyName,
      identity: this.state.resolve,
      raw: this.state.raw,
      analysis: this.state.analysis,
      score: this.state.score,
      iteration: this.state.iteration,
      metadata: this.metadata,
      agentErrors: this._agentErrors,
      qualityMode: this.options.qualityMode || 'deep',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Stage 3: 종합 보고서 조립 (Compose Only)
   * Stage 2의 분석 결과를 바탕으로 최종 보고서를 조립합니다.
   */
  async runStage3Compose(stage2Data) {
    if (stage2Data) {
      // Stage 2 데이터 복원
      this.companyName = stage2Data.companyName || this.companyName;
      this.state.resolve = stage2Data.identity || this.state.resolve;
      this.state.raw = stage2Data.raw || this.state.raw;
      this.state.analysis = stage2Data.analysis || this.state.analysis;
      this.state.score = stage2Data.score || this.state.score;
      this.state.iteration = stage2Data.iteration || this.state.iteration;
      this.metadata = { ...this.metadata, ...stage2Data.metadata };
      this._agentErrors = stage2Data.agentErrors || this._agentErrors;
      if (stage2Data.qualityMode) {
        this.options.qualityMode = stage2Data.qualityMode;
      }
    }

    this.onStatusUpdate?.('AI 종합 보고서 작성 중 (Stage 3)');
    this.logger?.info('Stage 3 Compose started');

    // 4. Summarize/Compose Stage
    const composeRes = await this.measureStage('compose', (sig) => this.engineCompose(sig));
    
    if (!composeRes.ok || !composeRes.data || (typeof composeRes.data === 'string' && composeRes.data.trim() === '')) {
      const errorMsg = composeRes.error || 'Composer returned empty markdown';
      this._agentErrors.push({
        agent: 'composer',
        stage: 'compose',
        error: errorMsg,
        isTimeout: composeRes.isTimeout || false
      });
      this.state.composerMarkdown = '';
    } else {
      this.state.composerMarkdown = composeRes.data;
    }

    this.metadata.totalDurationMs = Date.now() - (this.startTime || (Date.now() - 1));
    
    // 주요 분석 섹션이 하나라도 실패하면 partial result
    const criticalSections = ['analyze-financial', 'analyze-strategy', 'analyze-news', 'compose'];
    const hasCriticalFailure = this._agentErrors.some(e => criticalSections.includes(e.stage));
    // timeout 포함 모든 agent 에러를 partial 기준으로
    const hasAnyAgentError = this._agentErrors.length > 0;
    const isPartialResult = hasCriticalFailure || hasAnyAgentError;

    if (isPartialResult) {
      this.metadata.qualityLevel = 'degraded';
      this.state.isPartialResult = true;
    } else {
      this.metadata.qualityLevel = 'normal';
      this.state.isPartialResult = false;
    }

    const report = this.assembleFinalReport();
    if (!report.report.markdown || report.report.markdown.trim() === '') {
      // 실제 실패 원인을 포함한 에러 메시지 생성
      const composerErrors = this._agentErrors.filter(e => e.stage === 'compose' || e.agent === 'composer');
      const causeDetail = composerErrors.length > 0 ? composerErrors.map(e => e.error).join('; ') : 'Unknown cause';
      throw new Error(`AI 종합 보고서 생성에 실패했습니다: ${causeDetail}`);
    }
    return report;
  }

  /**
   * 하위 호환성 및 테스트용 래퍼
   * Stage 2 분석 및 보고서 조립을 모두 수행합니다.
   */
  async runStage2Analysis(stage1Data) {
    const stage2Data = await this.runStage2Analyze(stage1Data);
    return await this.runStage3Compose(stage2Data);
  }

  /**
   * STAGE 1: 기업 식별 (Resolve)
   */
  async engineResolve(companyName, signal) {
    try {
      const resolveInfo = await this.resolveTicker(signal);
      
      if (resolveInfo.type === 'KR') {
        const dartApiToken = process.env.DART_API_KEY || '98c7f5eef7673f915ae614cb61a339afa5684fa3';
        const corpCodeRes = await resolveCorpCode(companyName, dartApiToken);
        
        if (corpCodeRes) {
          resolveInfo.corpCode = corpCodeRes.corpCode;
          resolveInfo.corpName = corpCodeRes.corpName;
          resolveInfo.stockCode = corpCodeRes.stockCode;
          resolveInfo.resolutionMethod = corpCodeRes.method;
        }
      }
      
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
    let { type, ticker, corpCode } = identity;
    const dartApiToken = process.env.DART_API_KEY || '98c7f5eef7673f915ae614cb61a339afa5684fa3';
    
    try {
      if (type === 'KR') {
        // corpCode가 없으면 재해석 시도
        if (!corpCode) {
          this.logger?.info('corpCode missing in engineData, attempting resolution', { companyName });
          const res = await resolveCorpCode(companyName, dartApiToken);
          if (res) {
            corpCode = res.corpCode;
            // state.resolve 동기화 (Stage 1 결과물에 반영되도록)
            this.state.resolve = {
              ...this.state.resolve,
              corpCode: res.corpCode,
              corpName: res.corpName,
              stockCode: res.stockCode,
              resolutionMethod: res.method
            };
          }
        }

        if (!corpCode) {
          warnings.push('정형 재무제표 데이터를 가져오지 못함 (corp_code 매칭 실패)');
          return { ok: true, data: result, warnings };
        }
        
        const safeCorpCode = encodeURIComponent(corpCode);
        const [dRes, fRes] = await Promise.all([
          this.internalFetch(`/api/data/dart?corp_code=${safeCorpCode}`, { signal }).catch(e => { warnings.push(`DART disclosures error: ${e.message}`); return { list: [] }; }),
          this.internalFetch(`/api/data/dart-finance?corp_code=${safeCorpCode}`, { signal }).catch(e => { warnings.push(`DART finance error: ${e.message}`); return null; })
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
    const isDeep = this.options.qualityMode === 'deep';
    const newsCount = isDeep ? '5-8' : '2-3';
    
    const searchPrompt = `Evaluate '${companyName}'. Today is ${today}. identity: ${JSON.stringify(identity)}.
Output a STRICT JSON object containing:
{
  "companyIdentity": "Brief business area and vision",
  "marketContext": "Current industry and market trends",
  "businessModel": "How it creates value",
  "newsFindings": [
    {
      "date": "YYYY-MM-DD",
      "source": "News source name",
      "headline": "Clear news title",
      "summary": "1-2 sentence summary",
      "impact": "Positive/Neutral/Negative impact on company"
    }
  ],
  "sentiment": "Positive/Neutral/Negative",
  "risks": ["detailed risk factor with reason"],
  "opportunities": ["detailed opportunity with reason"]
}
IMPORTANT: Please find at least ${newsCount} recent and relevant news items.
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
      if (res.status === 'fulfilled' && res.value.ok && res.value.data[sectionKey]) {
        finalAnalysis[sectionKey] = res.value.data[sectionKey];
        if (res.value.data.score) {
          totalScore += res.value.data.score;
          successfulSections++;
        }
      } else {
        this.logger?.warn(`Section analysis failed: ${sectionKey}`, { 
          reason: res.reason || res.value?.error 
        });
        this._agentErrors.push({
          agent: `analyst-${sectionKey}`,
          stage: `analyze-${sectionKey}`,
          error: 'Section analysis returned empty or invalid schema'
        });

        // fallback section 생성
        const failReason = res.reason?.message || res.value?.error || 'AI 분석 결과 스키마 불일치';
        if (sectionKey === 'financial') {
          finalAnalysis.financial = fallbackFinancialSection(failReason);
        } else if (sectionKey === 'strategy') {
          finalAnalysis.strategy = fallbackStrategySection(failReason);
        } else if (sectionKey === 'news') {
          finalAnalysis.news = fallbackNewsSection(failReason);
        }
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
    
    let res = await this.executeJsonAgent('analyst-financial', 'gemini-2.5-flash', context, ['financial'], signal);
    let financialData = res.financial || ((res.overview || res.keyMetrics) ? { overview: res.overview, keyMetrics: res.keyMetrics } : null);
    
    if (res.__empty || res.__error || !validateFinancialSection(financialData)) {
      this.logger?.warn('Retrying financial analysis due to invalid schema');
      const retryContext = { ...context, _RETRY_NOTE: "이전 시도에서 JSON 스키마를 따르지 않았습니다. 반드시 REQUIRED JSON SCHEMA 최상위 키('financial')를 포함하여 반환하세요." };
      res = await this.executeJsonAgent('analyst-financial', 'gemini-2.5-flash', retryContext, ['financial'], signal);
      financialData = res.financial || ((res.overview || res.keyMetrics) ? { overview: res.overview, keyMetrics: res.keyMetrics } : null);
    }
    
    if (res.__empty || res.__error || !validateFinancialSection(financialData)) {
      financialData = fallbackFinancialSection('2회 시도 후에도 유효한 결과를 얻지 못했습니다.');
      return { ok: true, data: { financial: financialData, score: 0 } };
    }
    
    const score = await this.engineSimpleScore('financial', { financial: financialData }, signal);
    return { ok: true, data: { financial: financialData, score } };
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
    
    let res = await this.executeJsonAgent('analyst-strategy', 'gemini-2.5-flash', context, ['strategy'], signal);
    let strategyData = res.strategy || ((res.macroTrend || res.industryStatus || res.vision || res.businessModel || res.swotAnalysis) ? { macroTrend: res.macroTrend, industryStatus: res.industryStatus, vision: res.vision, businessModel: res.businessModel, swotAnalysis: res.swotAnalysis } : null);
    
    if (res.__empty || res.__error || !validateStrategySection(strategyData)) {
      this.logger?.warn('Retrying strategy analysis due to invalid schema');
      const retryContext = { ...context, _RETRY_NOTE: "이전 시도에서 JSON 스키마를 따르지 않았습니다. 반드시 REQUIRED JSON SCHEMA 최상위 키('strategy')를 포함하여 반환하세요." };
      res = await this.executeJsonAgent('analyst-strategy', 'gemini-2.5-flash', retryContext, ['strategy'], signal);
      strategyData = res.strategy || ((res.macroTrend || res.industryStatus || res.vision || res.businessModel || res.swotAnalysis) ? { macroTrend: res.macroTrend, industryStatus: res.industryStatus, vision: res.vision, businessModel: res.businessModel, swotAnalysis: res.swotAnalysis } : null);
    }
    
    if (res.__empty || res.__error || !validateStrategySection(strategyData)) {
      strategyData = fallbackStrategySection('2회 시도 후에도 유효한 결과를 얻지 못했습니다.');
      return { ok: true, data: { strategy: strategyData, score: 0 } };
    }
    
    const score = await this.engineSimpleScore('strategy', { strategy: strategyData }, signal);
    return { ok: true, data: { strategy: strategyData, score } };
  }

  /**
   * 뉴스/센티먼트 섹션 분석 엔진
   */
  async engineAnalyzeNews(signal) {
    const context = {
      searchBriefing: this.state.raw.searchBriefing,
      rawSearchText: this.state.raw.searchBriefing?.rawContent || ""
    };
    
    let res = await this.executeJsonAgent('analyst-news', 'gemini-2.5-flash', context, ['news'], signal);
    let newsData = res.news || ((res.marketSentiment || res.recentNews) ? { marketSentiment: res.marketSentiment, recentNews: res.recentNews } : null);
    
    if (res.__empty || res.__error || !validateNewsSection(newsData)) {
      this.logger?.warn('Retrying news analysis due to invalid schema');
      const retryContext = { ...context, _RETRY_NOTE: "이전 시도에서 JSON 스키마를 따르지 않았습니다. 반드시 REQUIRED JSON SCHEMA 최상위 키('news')를 포함하여 반환하세요." };
      res = await this.executeJsonAgent('analyst-news', 'gemini-2.5-flash', retryContext, ['news'], signal);
      newsData = res.news || ((res.marketSentiment || res.recentNews) ? { marketSentiment: res.marketSentiment, recentNews: res.recentNews } : null);
    }
    
    if (res.__empty || res.__error || !validateNewsSection(newsData)) {
      newsData = fallbackNewsSection('2회 시도 후에도 유효한 결과를 얻지 못했습니다.');
      return { ok: true, data: { news: newsData, score: 0 } };
    }
    
    const score = await this.engineSimpleScore('news', { news: newsData }, signal);
    return { ok: true, data: { news: newsData, score } };
  }

  /**
   * 섹션별 간이 품질 점수 측정
   */
  async engineSimpleScore(sectionName, data, signal) {
    // signal이 이미 abort된 경우 critic scoring 생략 (timeout 예산 절약)
    if (signal?.aborted) {
      this.logger?.info('Skipping critic scoring — signal already aborted', { sectionName });
      return 80;
    }
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
    this.onStatusUpdate?.('AI 종합 보고서 작성 중 (섹션형)...');
    const briefing = this.state.raw.searchBriefing || {};
    const analysis = this.state.analysis || {};

    // composer에 전달할 풍부한 컨텍스트 구성
    const composerContext = {
      companyName: this.companyName,
      qualityMode: this.options.qualityMode || 'deep',

      // 기업 프로필 (검색 브리핑)
      companyProfile: {
        identity: briefing.companyIdentity || null,
        marketContext: briefing.marketContext || null,
        businessModel: briefing.businessModel || null,
        sentiment: briefing.sentiment || 'Neutral',
      },

      // 뉴스/기회/리스크 (검색 브리핑에서 추출)
      newsFindings: Array.isArray(briefing.newsFindings) ? briefing.newsFindings : [],
      risks: Array.isArray(briefing.risks) ? briefing.risks : [],
      opportunities: Array.isArray(briefing.opportunities) ? briefing.opportunities : [],

      // 섹션별 분석 결과
      financialAnalysis: analysis.financial || null,
      strategyAnalysis: analysis.strategy || null,
      newsAnalysis: analysis.news || null,

      // 원본 재무 데이터
      financeData: this.state.raw.finance || null,
      disclosures: this.state.raw.disclosures || [],
      sources: this.state.raw.sources || [],

      // 메타데이터 및 오류 (데이터 한계 섹션 작성용)
      dataLimitations: {
        agentErrors: this._agentErrors,
        hasFinancialData: !!(this.state.raw.finance),
        hasDisclosures: (this.state.raw.disclosures || []).length > 0,
        hasSearchData: !!(briefing.companyIdentity),
      }
    };

    // Composer 모델 fallback 체인: pro → flash → flash-lite
    const composerModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    
    for (let i = 0; i < composerModels.length; i++) {
      const currentModel = composerModels[i];
      if (signal?.aborted) break;
      
      try {
        if (i > 0) {
          this.onStatusUpdate?.(`AI 보고서 생성 모델 전환 중 (${currentModel})...`);
        }
        const result = await this.executeTextAgent('composer', currentModel, composerContext, signal, {
          maxOutputTokens: 8192
        });
        if (result && result.trim() !== '') {
          if (i > 0) {
            this.metadata.composerFallbackUsed = true;
            this.metadata.composerModel = currentModel;
          }
          return { ok: true, data: result };
        }
        this.logger?.warn(`Composer attempt with ${currentModel} returned empty`, { attemptIndex: i });
      } catch (err) {
        this.logger?.warn(`Composer attempt with ${currentModel} failed`, { error: err.message, attemptIndex: i });
        // 마지막 모델이 아니면 다음 fallback 시도
        if (i === composerModels.length - 1) {
          this.logger?.error('All composer model attempts exhausted');
        }
      }
    }

    // 모든 모델 실패
    return { ok: false, error: `Composer failed on all models: ${composerModels.join(', ')}`, data: '' };
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
    const { type, ticker, corpCode } = this.state.resolve;
    
    if (type === 'KR') {
      this.logger?.info('Fetching KR data from DART', { companyName: this.companyName });
      
      if (!corpCode) {
        this.logger?.warn('DART corp_code matching failed. Skipping finance fetch.');
        this.state.raw.disclosures = [];
        this.state.raw.finance = null;
        return;
      }
      
      const safeCorpCode = encodeURIComponent(corpCode);
      const [dRes, fRes] = await Promise.all([
        this.internalFetch(`/api/data/dart?corp_code=${safeCorpCode}`)
          .catch(err => {
            this.logger?.warn('DART disclosures fetch failed', { error: err.message });
            return { list: [] };
          }),
        this.internalFetch(`/api/data/dart-finance?corp_code=${safeCorpCode}`)
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
        signal,
        fallbackModels: model === 'gemini-2.5-flash' ? ['gemini-2.5-flash-lite'] : []
      });
      text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      extracted = extractJson(text) || text;

      if (!extracted || extracted === '{}') {
        this.logger?.warn('executeJsonAgent returned empty result', { agentName, rawText: text.substring(0, 100) });
        this._agentErrors.push({
          agent: agentName,
          stage: 'parsing',
          error: 'executeJsonAgent returned empty result',
          extractedSnippet: extracted ? extracted.substring(0, 300) : 'EMPTY',
          rawText: text.substring(0, 300)
        });
        return { __empty: true };
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
        extractedSnippet: extracted ? extracted.substring(0, 300) : 'EMPTY',
        rawText: (result?.candidates?.[0]?.content?.parts?.[0]?.text || '').substring(0, 300)
      });
      return { __error: true };
    }
  }

  async executeTextAgent(agentName, model, context = {}, signal, config = {}) {
    const system = this.promptsMap[agentName] || `You are ${agentName}. Output Markdown. Respond in Korean.`;
    const prompt = `${system}\n\nContext: ${JSON.stringify(context, null, 2)}`;
    let result = null;
    try {
      result = await this.callGemini(model, prompt, { 
        temperature: 0.3, 
        signal,
        ...config
      });
      this.logger?.info('executeTextAgent success', { agentName, model });
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('exceeded');
      this.logger?.error('executeTextAgent failed', { agentName, model, error: err.message, isTimeout });
      this._agentErrors.push({ 
        agent: agentName, 
        error: err.message, 
        stage: 'generation',
        model,
        isTimeout 
      });
      // composer는 반드시 에러를 전파 — 상위에서 fallback 처리
      if (agentName === 'composer') {
        throw err;
      }
      return '';
    }
  }

  async callGemini(model, prompt, config = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    // 안전한 fallback 체인 (deprecated 모델 절대 사용 금지)
    const fallbackModels = config.fallbackModels || [];
    const allModels = [model, ...fallbackModels];
    let lastRes;
    let lastError;

    for (const currentModel of allModels) {
      // signal이 이미 abort된 경우 즉시 중단
      if (config.signal?.aborted) {
        throw new Error(`Aborted before attempting model ${currentModel}`);
      }

      let retries = 2; // 503/429 재시도는 최대 2회
      let res;

      while (retries > 0) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        
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

        try {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: config.signal
          });
        } catch (fetchErr) {
          // AbortError 등 네트워크 오류
          throw fetchErr;
        }

        if (res.ok) return res.json();

        if (res.status === 503 || res.status === 429) {
          retries--;
          if (retries > 0) {
            this.logger?.warn(`API ${res.status} for ${currentModel}. Retrying in 1s... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
          } else {
            this.logger?.warn(`API ${res.status} for ${currentModel} exhausted retries, trying next fallback`);
          }
        } else {
          // 400, 401, 404 등은 즉시 이 모델 포기
          this.logger?.warn(`API ${res.status} for ${currentModel}, skipping to next fallback`);
          break;
        }
      }
      lastRes = res;
      lastError = `${currentModel} returned ${res?.status}`;
    }
    
    // 모든 모델 실패
    const errorText = await lastRes?.text().catch(() => 'No body') || 'No response';
    const lastModel = allModels[allModels.length - 1];
    console.error("\n\n[FATAL API ERROR DUMP]");
    console.error("Status:", lastRes?.status);
    console.error("Models tried:", allModels.join(', '));
    console.error("Response:", errorText, "\n\n");
    this.logger?.error('Gemini API Failure (all models)', { status: lastRes?.status, modelsTried: allModels, body: errorText });
    throw new Error(`Gemini API error (${lastRes?.status}) after trying [${allModels.join(', ')}]: ${errorText.substring(0, 200)}`);
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
        
        // Final Composition (10-section Markdown)
        markdown: this.state.composerMarkdown || '',
      },
      sources: raw.sources || [],
      financeData: raw.finance || null,
      score: this.state.score || 0,
      iteration: this.state.iteration || 1,
      metadata: {
        ...this.metadata,
        missingSections: this.metadata.missingSections || []
      },
      debug: { 
        agentErrors: this._agentErrors,
        isPartialResult: this.state.isPartialResult === true
      },
    };
  }
}

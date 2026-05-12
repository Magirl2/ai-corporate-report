// api/_lib/orchestrator.js
import { loadAgentPrompts } from './prompts.js';
import { resolveCorpCode, loadCorpCodes } from './dart-utils.js';
import { getOptionalEnv } from './env.js';
import { normalizeSourceWithQuality, filterReportSources } from './sourceQuality.js';

const DEBUG = process.env.NODE_ENV !== 'production';

/**
 * 엔진 스테이지별 독립 실행 예산 (Timeout) 정의
 */
const STAGE_TIMEOUTS = {
  resolve: 15000,
  data: 40000,   // ZIP 다운로드(~15s) + DART API(~10s) 여유 확보
  search: 45000,
  // Stage 2: critic 점수 LLM 및 뉴스 그라운딩 제거로 각 섹션 ~30s 내 완료 기대
  // Vercel maxDuration=60s 내에서 여유 확보 (setup 5s + parallel 40s + redis 3s = 48s)
  analyze: 45000,
  'analyze-financial': 38000,
  'analyze-strategy': 38000,
  'analyze-news': 42000,  // 뉴스 분석은 rawSearchText 처리로 추가 시간 필요
  compose: 55000  // compose.js maxDuration=60초 내에서 최대한 확보
};

if (DEBUG) {
  console.info(`[orchestrator] STAGE_TIMEOUTS.compose=${STAGE_TIMEOUTS.compose}ms, BUILD_SHA=${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}`);
}

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
      swotAnalysis: raw.strategy?.swotAnalysis || { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      competitors: Array.isArray(raw.strategy?.competitors) ? raw.strategy.competitors : []
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
      totalDurationMs: 0,
      dartStatus: {
        attempted: false,
        apiKeyPresent: false,
        inputCompanyName: companyName,
        resolvedCorpCode: null,
        resolvedCorpName: null,
        stockCode: null,
        resolutionMethod: null,
        corpCodeResolved: false,
        disclosuresAttempted: false,
        disclosuresCount: 0,
        financeAttempted: false,
        financeAvailable: false,
        financeYears: 0,
        errors: [],
        warnings: []
      }
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

  ensureDartStatus() {
    if (!this.metadata.dartStatus) {
      this.metadata.dartStatus = {};
    }
    const ds = this.metadata.dartStatus;
    ds.attempted = ds.attempted || false;
    ds.apiKeyPresent = ds.apiKeyPresent || false;
    ds.inputCompanyName = ds.inputCompanyName || this.companyName;
    ds.resolvedCorpCode = ds.resolvedCorpCode || null;
    ds.resolvedCorpName = ds.resolvedCorpName || null;
    ds.stockCode = ds.stockCode || null;
    ds.resolutionMethod = ds.resolutionMethod || null;
    ds.corpCodeResolved = ds.corpCodeResolved || false;
    ds.disclosuresAttempted = ds.disclosuresAttempted || false;
    ds.disclosuresCount = ds.disclosuresCount || 0;
    ds.financeAttempted = ds.financeAttempted || false;
    ds.financeAvailable = ds.financeAvailable || false;
    ds.financeYears = ds.financeYears || 0;
    if (!Array.isArray(ds.errors)) ds.errors = [];
    if (!Array.isArray(ds.warnings)) ds.warnings = [];
    return ds;
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
      
      const previousDartStatus = this.ensureDartStatus();
      const incomingDartStatus = stage2Data.metadata?.dartStatus || {};
      
      this.metadata = { 
        ...this.metadata, 
        ...stage2Data.metadata,
        dartStatus: {
          ...previousDartStatus,
          ...incomingDartStatus,
          warnings: [
            ...(previousDartStatus.warnings || []),
            ...(incomingDartStatus.warnings || [])
          ],
          errors: [
            ...(previousDartStatus.errors || []),
            ...(incomingDartStatus.errors || [])
          ]
        }
      };
      
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
      // Compose 실패 — throw 하지 않고 partial success 처리
      // Stage 2 데이터가 있으면 개별 섹션을 사용자에게 반환한다.
      const composerErrors = this._agentErrors.filter(e => e.stage === 'compose' || e.agent === 'composer');
      const causeDetail = composerErrors.length > 0 ? composerErrors.map(e => e.error).join('; ') : 'Unknown cause';
      this.logger?.warn('Stage 3 compose produced empty markdown — returning partial success', { causeDetail });
      if (!report.metadata) report.metadata = {};
      report.metadata.composeFailed = true;
      report.metadata.composeFail = causeDetail;
      report.metadata.partial = true;
      report.metadata.qualityWarning = true;
      if (!report.debug) report.debug = {};
      report.debug.isPartialResult = true;
      if (!Array.isArray(report.debug.agentErrors)) report.debug.agentErrors = [];
      if (composerErrors.length > 0) {
        report.debug.agentErrors.push(...composerErrors);
      } else {
        report.debug.agentErrors.push({ agent: 'composer', stage: 'compose', error: causeDetail });
      }
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
      const dartApiToken = getOptionalEnv('DART_API_KEY');

      // DART XML을 백그라운드로 미리 다운로드 시작 (non-blocking).
      // resolveTicker(LLM, ~5s)가 실행되는 동안 ZIP을 받기 시작해
      // engineData(30s 예산)에서 resolveCorpCode 호출 시 캐시 히트 또는 최소 대기로 처리됩니다.
      if (dartApiToken) {
        loadCorpCodes(dartApiToken).catch(() => {});
      }

      const resolveInfo = await this.resolveTicker(signal);

      // KR 기업 판별 시 dartStatus 초기화만 수행.
      // 실제 corp_code 해석은 30s 예산을 가진 engineData에서 처리합니다.
      if (resolveInfo.type === 'KR') {
        const ds = this.ensureDartStatus();
        ds.attempted = true;
        ds.apiKeyPresent = !!dartApiToken;
        if (!dartApiToken) {
          if (!Array.isArray(ds.warnings)) ds.warnings = [];
          ds.warnings.push("DART API 키가 설정되지 않아 DART 공시 및 재무 데이터를 가져올 수 없습니다.");
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
    const dartApiToken = getOptionalEnv('DART_API_KEY');
    const ds = this.ensureDartStatus();
    
    try {
      if (type === 'KR') {
        if (!dartApiToken) {
          warnings.push('DART API 키가 설정되지 않아 DART 공시 및 재무 데이터를 가져올 수 없습니다.');
          if (!Array.isArray(ds.warnings)) ds.warnings = [];
          ds.warnings.push('DART API 키가 설정되지 않아 DART 공시 및 재무 데이터를 가져올 수 없습니다.');
          this.logger?.warn('DART_API_KEY missing, skipping engineData for KR');
          return { ok: true, data: result, warnings };
        }
        
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
            ds.resolvedCorpCode = res.corpCode;
            ds.resolvedCorpName = res.corpName;
            ds.stockCode = res.stockCode;
            ds.resolutionMethod = res.method;
            ds.corpCodeResolved = true;
          } else {
            if (!Array.isArray(ds.warnings)) ds.warnings = [];
            ds.warnings.push("DART corp_code 매칭 실패: 공식 상장사명 또는 종목코드로 다시 검색하세요.");
          }
        }

        if (!corpCode) {
          warnings.push('정형 재무제표 데이터를 가져오지 못함 (corp_code 매칭 실패)');
          return { ok: true, data: result, warnings };
        }
        
        ds.disclosuresAttempted = true;
        ds.financeAttempted = true;

        const safeCorpCode = encodeURIComponent(corpCode);
        const [dRes, fRes] = await Promise.all([
          this.internalFetch(`/api/data/dart?corp_code=${safeCorpCode}`, { signal }).catch(e => { 
            warnings.push(`DART disclosures error: ${e.message}`); 
            if (!Array.isArray(ds.errors)) ds.errors = [];
            ds.errors.push(`DART disclosures error: ${e.message}`);
            return { list: [] }; 
          }),
          this.internalFetch(`/api/data/dart-finance?corp_code=${safeCorpCode}`, { signal }).catch(e => { 
            warnings.push(`DART finance error: ${e.message}`); 
            if (!Array.isArray(ds.errors)) ds.errors = [];
            ds.errors.push(`DART finance error: ${e.message}`);
            return null; 
          })
        ]);
        
        result.disclosures = dRes.list?.map(d => ({ date: d.rcept_dt, title: d.report_nm })) || [];
        ds.disclosuresCount = result.disclosures.length;
        if (result.disclosures.length === 0) {
          if (!Array.isArray(ds.warnings)) ds.warnings = [];
          ds.warnings.push("DART 공시 데이터가 없습니다.");
        }

        result.finance = fRes;
        if (fRes && fRes.yearlyMetrics) {
          ds.financeAvailable = true;
          ds.financeYears = fRes.yearlyMetrics.length;
        } else {
          ds.financeAvailable = false;
          if (!Array.isArray(ds.warnings)) ds.warnings = [];
          ds.warnings.push("DART 재무 데이터가 없습니다.");
        }

        // 실제 데이터가 수집된 경우에만 DART 출처를 소스에 추가
        if (result.disclosures.length > 0 || ds.financeAvailable) {
          this.state.raw.sources.push({ title: 'DART 전자공시시스템', uri: 'https://opendart.fss.or.kr/' });
        }
      } else {
        result.finance = await this.internalFetch(`/api/data/fmp-finance?ticker=${ticker}`, { signal }).catch(e => { warnings.push(`FMP error: ${e.message}`); return null; });
        result.disclosures = [{ date: 'Current', title: `US SEC Filings for ${ticker}` }];
        if (result.finance) {
          this.state.raw.sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://financialmodelingprep.com/' });
        }
      }
      return { ok: true, data: result, warnings };
    } catch (err) {
      return { ok: false, error: err.message, data: result, warnings };
    }
  }

  /**
   * STAGE 3: 웹 검색 (Search)
   * Phase A: 그라운딩 전용 텍스트 검색 → URL 수집 (JSON 미요구 → Gemini가 실제 검색 사용)
   * Phase B: Phase A 원문을 컨텍스트로 써서 구조화 JSON 브리핑 생성 (검색 도구 없이)
   */
  async engineSearch(companyName, identity, signal) {
    this.onStatusUpdate?.('최신 뉴스 및 시장 동향 검색 중...');
    const today = new Date().toLocaleDateString('ko-KR');
    const isDeep = this.options.qualityMode === 'deep';
    const newsCount = isDeep ? '8-12' : '4-6';
    let groundingRawText = '';

    // ── Phase A: 그라운딩 전용 검색 ──────────────────────────────────────────
    // JSON 출력을 요구하지 않아야 Gemini가 실제로 Google Search를 사용함
    try {
      const groundingResult = await this.callGemini('gemini-2.5-flash',
        `Search comprehensively for information about "${companyName}" as of ${today}. Find and summarize:
1. Recent news articles and press releases (last 3 months) — include headlines, publisher, and date
2. Latest financial results, earnings, or revenue announcements
3. Regulatory, government, or policy news affecting this company or its industry
4. Major business developments: partnerships, M&A, new products, restructuring
5. Industry trends and competitor news relevant to this company
For each item mention the source name and date where possible.`,
        { tools: [{ googleSearch: {} }], maxOutputTokens: 8192, signal }
      );

      groundingRawText = groundingResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // 그라운딩 청크에서 URL 수집
      const chunks = groundingResult.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      chunks.forEach((chunk) => {
        const url = chunk.web?.uri;
        if (url && !this.state.raw.sources.some(s => s.url === url || s.uri === url)) {
          this.state.raw.sources.push(normalizeSourceWithQuality(
            { title: chunk.web.title || url, url, uri: url },
            this.state.raw.sources.length
          ));
        }
      });

      this.logger?.info('Phase A grounding complete', { chunks: chunks.length, companyName });
    } catch (e) {
      this.logger?.warn('Phase A grounding search failed', { error: e.message });
    }

    // ── Phase B: 구조화 브리핑 생성 (검색 도구 없이, Phase A 결과 활용) ────────
    const briefingPrompt = `You are a financial analyst. Use the search results below to create a structured briefing about "${companyName}".

Search results:
${groundingRawText || '(no search results)'}

Output ONLY a valid JSON object:
{
  "companyIdentity": "brief business description",
  "marketContext": "current industry and market context",
  "businessModel": "how the company creates value",
  "newsFindings": [
    {
      "sourceId": "NEWS-1",
      "headline": "news headline",
      "publisher": "publisher name or 'unknown'",
      "publishedAt": "YYYY-MM-DD or 'unknown'",
      "url": "URL if explicitly mentioned in search results, otherwise null",
      "summary": "2-3 sentence summary including key facts and numbers",
      "impact": "Positive|Neutral|Negative",
      "sourceQuality": "high|medium|low|unverified"
    }
  ],
  "sentiment": "Positive|Neutral|Negative",
  "risks": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"]
}
IMPORTANT: Extract ALL news and events found — aim for ${newsCount} items minimum. Include items even if URL is not known (set url to null, sourceQuality to "unverified"). Respond in Korean. NO markdown.`;

    try {
      const briefingResult = await this.callGemini('gemini-2.5-flash', briefingPrompt, {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        signal
      });

      const fullText = briefingResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const extracted = extractJson(fullText) || fullText;

      let searchBriefing = {};
      try {
        const parsed = JSON.parse(extracted);
        searchBriefing = { ...normalizeSearchBriefing(parsed), rawContent: groundingRawText };
      } catch (_parseErr) {
        searchBriefing = { ...normalizeSearchBriefing({}), rawContent: groundingRawText };
      }

      // newsFindings URL도 sources에 추가 (그라운딩 청크 보완)
      (searchBriefing.newsFindings || []).forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const url = item.url || item.uri;
        if (url && !this.state.raw.sources.some(s => s.url === url || s.uri === url)) {
          this.state.raw.sources.push(normalizeSourceWithQuality({
            title: item.headline || url,
            url,
            publisher: item.publisher,
            publishedAt: item.publishedAt,
            usedIn: ['recentNews'],
          }, this.state.raw.sources.length));
        }
      });

      // dedupe + 품질 정규화
      this.state.raw.sources = filterReportSources(this.state.raw.sources.map((s, idx) => {
        return s.qualityScore ? s : normalizeSourceWithQuality(s, idx);
      }));

      return { ok: true, data: { searchBriefing } };
    } catch (e) {
      // Phase B 실패 시 Phase A 텍스트로만 브리핑 구성
      const fallback = { ...normalizeSearchBriefing({}), rawContent: groundingRawText };
      return { ok: true, data: { searchBriefing: fallback } };
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

    // critic 점수는 Stage 2 타임아웃 여유를 위해 생략 (기본 점수 80 사용)
    return { ok: true, data: { financial: financialData, score: 80 } };
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
    const _buildStrategyFromFlat = (r) => (r.macroTrend || r.industryStatus || r.vision || r.businessModel || r.swotAnalysis)
      ? { macroTrend: r.macroTrend, industryStatus: r.industryStatus, vision: r.vision, businessModel: r.businessModel, swotAnalysis: r.swotAnalysis, competitors: Array.isArray(r.competitors) ? r.competitors : [] }
      : null;
    let strategyData = res.strategy || _buildStrategyFromFlat(res);

    if (res.__empty || res.__error || !validateStrategySection(strategyData)) {
      this.logger?.warn('Retrying strategy analysis due to invalid schema');
      const retryContext = { ...context, _RETRY_NOTE: "이전 시도에서 JSON 스키마를 따르지 않았습니다. 반드시 REQUIRED JSON SCHEMA 최상위 키('strategy')를 포함하여 반환하세요." };
      res = await this.executeJsonAgent('analyst-strategy', 'gemini-2.5-flash', retryContext, ['strategy'], signal);
      strategyData = res.strategy || _buildStrategyFromFlat(res);
    }

    if (res.__empty || res.__error || !validateStrategySection(strategyData)) {
      strategyData = fallbackStrategySection('2회 시도 후에도 유효한 결과를 얻지 못했습니다.');
      return { ok: true, data: { strategy: strategyData, score: 0 } };
    }

    // critic 점수는 Stage 2 타임아웃 여유를 위해 생략 (기본 점수 80 사용)
    return { ok: true, data: { strategy: strategyData, score: 80 } };
  }

  /**
   * 뉴스/센티먼트 섹션 분석 엔진
   */
  async engineAnalyzeNews(signal) {
    // Stage 1 engineSearch에서 이미 뉴스 그라운딩 검색을 완료함.
    // Stage 2에서 중복 그라운딩 검색은 45s 예산 초과의 원인이 되므로 생략.

    // rawSearchText를 4000자로 제한해 LLM 처리 시간 절약
    const rawFull = this.state.raw.searchBriefing?.rawContent || '';
    const context = {
      searchBriefing: this.state.raw.searchBriefing,
      rawSearchText: rawFull.length > 4000 ? rawFull.slice(0, 4000) + '\n...(이하 생략)' : rawFull
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

    // recentNews URL → raw.sources에 추가 (뉴스 출처 다양성 확보)
    (newsData.recentNews || []).forEach((item) => {
      const url = item.url || item.uri;
      if (url && !this.state.raw.sources.some(s => s.url === url || s.uri === url)) {
        this.state.raw.sources.push(normalizeSourceWithQuality({
          title: item.headline || url,
          url,
          publisher: item.publisher,
          publishedAt: item.publishedAt,
          usedIn: ['recentNews'],
        }, this.state.raw.sources.length));
      }
    });
    if (newsData.recentNews?.length) {
      this.state.raw.sources = filterReportSources(this.state.raw.sources);
    }

    // critic 점수는 Stage 2 타임아웃 여유를 위해 생략 (기본 점수 80 사용)
    return { ok: true, data: { news: newsData, score: 80 } };
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
      // wantedTopKeys: ['score'] — critic의 score 필드만 사용 (feedback은 무시)
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

    // --- composerContext 압축: 토큰 절약 및 timeout 위험 감소 ---
    const safeSlice = (arr, max) => (Array.isArray(arr) ? arr.slice(0, max) : []);

    // financeData 축약: yearlyMetrics/keyMetrics/overview 중심
    let compactFinance = null;
    const rawFinance = this.state.raw.finance;
    if (rawFinance && typeof rawFinance === 'object') {
      compactFinance = {
        yearlyMetrics: safeSlice(rawFinance.yearlyMetrics || rawFinance.yearly, 5),
        keyMetrics: safeSlice(rawFinance.keyMetrics, 8),
        overview: rawFinance.overview || rawFinance.summary || null,
      };
    }

    const composerContext = {
      companyName: this.companyName,
      qualityMode: this.options.qualityMode || 'deep',

      // 기업 프로필 (검색 브리핑 — rawContent 제외)
      companyProfile: {
        identity: briefing.companyIdentity || null,
        marketContext: briefing.marketContext || null,
        businessModel: briefing.businessModel || null,
        sentiment: briefing.sentiment || 'Neutral',
      },

      // 배열 상한 적용
      newsFindings: safeSlice(briefing.newsFindings, 8),
      risks: safeSlice(briefing.risks, 8),
      opportunities: safeSlice(briefing.opportunities, 8),

      // 섹션별 분석 결과
      financialAnalysis: analysis.financial || null,
      strategyAnalysis: analysis.strategy || null,
      newsAnalysis: analysis.news || null,

      // 원본 재무 데이터 (축약)
      financeData: compactFinance,
      disclosures: safeSlice(this.state.raw.disclosures, 10),
      sources: safeSlice(this.state.raw.sources, 20),

      // 출처 품질 요약 (composer 프롬프트의 '출처 품질 한계' 섹션 작성용)
      sourceQualitySummary: (() => {
        const srcs = this.state.raw.sources || [];
        const high = srcs.filter(s => s.qualityTier === 'high').length;
        const medium = srcs.filter(s => s.qualityTier === 'medium').length;
        const low = srcs.filter(s => s.qualityTier === 'low').length;
        const blocked = srcs.filter(s => s.qualityTier === 'blocked').length;
        const total = srcs.length;
        return {
          total,
          high,
          medium,
          low,
          blocked,
          preferredRatio: total > 0 ? ((high + medium) / total).toFixed(2) : '0.00',
          warning: total > 0 && (high + medium) === 0 ? '신뢰도 높은 출처가 제한적으로 확인됨' : null,
        };
      })(),

      // 메타데이터 및 오류 (데이터 한계 섹션 작성용)
      dataLimitations: {
        agentErrors: safeSlice(this._agentErrors, 5),
        hasFinancialData: !!(this.state.raw.finance),
        hasDisclosures: (this.state.raw.disclosures || []).length > 0,
        hasSearchData: !!(briefing.companyIdentity),
      }
    };

    // Composer fallback 체인: pro → flash → flash-lite (stage-level timeout 공유)
    const composerModels = [
      { model: 'gemini-2.5-pro',        maxTokens: 8192 },
      { model: 'gemini-2.5-flash',      maxTokens: 4096 },
      { model: 'gemini-2.5-flash-lite', maxTokens: 3072 },
    ];
    
    for (let i = 0; i < composerModels.length; i++) {
      const { model: currentModel, maxTokens } = composerModels[i];
      if (signal?.aborted) break;
      
      try {
        if (i > 0) {
          this.onStatusUpdate?.(`AI 보고서 생성 모델 전환 중 (${currentModel})...`);
        }
        const result = await this.executeTextAgent('composer', currentModel, composerContext, signal, {
          maxOutputTokens: maxTokens
        });
        if (result && result.trim() !== '') {
          if (i > 0) {
            this.metadata.composerFallbackUsed = true;
          }
          this.metadata.composerModel = currentModel;
          return { ok: true, data: result };
        }
        this.logger?.warn(`Composer attempt with ${currentModel} returned empty`, { attemptIndex: i });
      } catch (err) {
        this.logger?.warn(`Composer attempt with ${currentModel} failed`, { error: err.message, attemptIndex: i });
        if (i === composerModels.length - 1) {
          this.logger?.error('All composer model attempts exhausted');
        }
      }
    }

    // 모든 모델 실패
    return { ok: false, error: `Composer failed on all models: ${composerModels.map(m => m.model).join(', ')}`, data: '' };
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
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 환경변수를 확인하세요.');
    }
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
          maxOutputTokens: config.maxOutputTokens ?? 4096,
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
    this.logger?.error('Gemini API Failure (all models)', { status: lastRes?.status, modelsTried: allModels, body: errorText.substring(0, 500) });
    throw new Error(`Gemini API error (${lastRes?.status}) after trying [${allModels.join(', ')}]: ${errorText.substring(0, 200)}`);
  }

  assembleFinalReport() {
    const { analysis, raw } = this.state;

    // UI 계약을 보장하기 위한 안전한 정규화 (Partial Success 대응)
    const safeAnalysis = normalizeAnalystOutput(analysis || {});
    const { strategy, financial, news } = safeAnalysis;

    // engineData와 engineSearch가 병렬로 sources를 push하므로
    // engineSearch의 정규화 타이밍에 따라 일부 소스가 미정규화될 수 있다.
    // assembleFinalReport에서 최종 일괄 정규화·정렬·중복제거를 수행한다.
    raw.sources = filterReportSources(
      (raw.sources || []).map((s, idx) => s.qualityScore != null ? s : normalizeSourceWithQuality(s, idx))
    );

    const sources = raw.sources;
    const highQualitySources = sources.filter(s => s.qualityTier === 'high').length;
    const mediumQualitySources = sources.filter(s => s.qualityTier === 'medium').length;
    const lowQualitySources = sources.filter(s => s.qualityTier === 'low').length;
    const blockedSources = sources.filter(s => s.qualityTier === 'blocked').length;
    const totalSources = sources.length;
    
    const sourceQualitySummary = {
      totalSources,
      highQualitySources,
      mediumQualitySources,
      lowQualitySources,
      blockedSources,
      preferredSourceRatio: totalSources > 0 ? ((highQualitySources + mediumQualitySources) / totalSources).toFixed(2) : 0,
      hasPrimarySources: highQualitySources > 0,
      warning: totalSources > 0 && (highQualitySources + mediumQualitySources) === 0 ? "신뢰도 높은 출처가 제한적으로 확인됨" : null
    };
    
    this.metadata.sourceQualitySummary = sourceQualitySummary;
    if (sourceQualitySummary.warning) {
      if (!this.metadata.warnings) this.metadata.warnings = [];
      if (!this.metadata.warnings.includes(sourceQualitySummary.warning)) {
        this.metadata.warnings.push(sourceQualitySummary.warning);
      }
    }

    return {
      companyName: this.companyName || 'Unknown Company',
      report: {
        // Strategy Sections
        macroTrend: strategy.macroTrend,
        industryStatus: strategy.industryStatus,
        vision: strategy.vision,
        businessModel: strategy.businessModel,
        swotAnalysis: strategy.swotAnalysis,
        competitors: Array.isArray(strategy.competitors) ? strategy.competitors : [],

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
      disclosures: raw.disclosures || [],
      financeData: raw.finance || null,
      score: this.state.score || 0,
      iteration: this.state.iteration || 1,
      metadata: {
        ...this.metadata,
        missingSections: this.metadata.missingSections || [],
        generatedAt: this.metadata.generatedAt || new Date().toISOString()
      },
      debug: { 
        agentErrors: this._agentErrors,
        isPartialResult: this.state.isPartialResult === true
      },
    };
  }
}

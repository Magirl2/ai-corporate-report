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

/**
 * Multi-Agent Sisyphus Loop Orchestrator
 * FLOW: Resolver → Collector → Normalizer → Financial → Disclosure → News → Strategy → Composer → Validator → Critic
 */
export class SisyphusOrchestrator {
  constructor(companyName, onStatusUpdate) {
    this.companyName = companyName;
    this.onStatusUpdate = onStatusUpdate;
    this.iterationCount = 0;
    this.maxIterations = 3;
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
      composition: null,
      validation: { isValid: true, errors: [] },
      critic: { score: 0, feedback: '', weakAgents: [] },
    };
  }

  async run() {
    this.onStatusUpdate?.(`[시작] '${this.companyName}' 심층 분석 시시포스 루프 기동`);

    // 1. Resolver (Flash) - Ticker/Exchange 식별
    this.state.resolve = await resolveTicker(this.companyName);
    this.onStatusUpdate?.(`[Resolver] ${this.state.resolve.type === 'KR' ? '한국 KRX' : '미국 ' + this.state.resolve.ticker} 식별 완료`);

    // 2. Collector (Native Tools + Search)
    await this.collectData();

    // Loop Start
    while (this.iterationCount < this.maxIterations) {
      this.iterationCount++;
      const isLastLoop = this.iterationCount === this.maxIterations;
      this.onStatusUpdate?.(`[루프 ${this.iterationCount}/${this.maxIterations}] 분석 및 정제 시작`);

      // 3. Normalizer (Flash) - 데이터 표준화
      this.state.normalized = await this.executeAgent('normalizer', 'gemini-2.5-flash', { 
        raw: this.state.raw,
        resolver: this.state.resolve
      });

      // 4~7. Parallel Analysis (Flash/Pro)
      this.onStatusUpdate?.(`[분석] 4개 전문 분야 동시 분석 중...`);
      const [financial, disclosure, news, strategy] = await Promise.all([
        this.executeAgent('financial-analyst', 'gemini-2.5-flash', { normalized: this.state.normalized }),
        this.executeAgent('disclosure-analyst', 'gemini-2.5-flash', { rawDisclosures: this.state.raw.disclosures }),
        this.executeAgent('news-analyst', 'gemini-2.5-flash', { searchBriefing: this.state.raw.searchBriefing }),
        this.executeAgent('strategy-analyst', 'gemini-2.5-pro', { normalized: this.state.normalized, briefing: this.state.raw.searchBriefing })
      ]);
      
      this.state.analysis = { financial, disclosure, news, strategy };

      // 8. Composer (Pro) - 보고서 합성
      this.state.composition = await this.executeAgent('composer', 'gemini-2.5-pro', { 
        ...this.state.analysis,
        companyName: this.companyName,
        iteration: this.iterationCount,
        prevFeedback: this.state.critic.feedback
      });

      // 9. Validator (Flash) - 팩트 체크
      this.state.validation = await this.executeAgent('validator', 'gemini-2.5-flash', { 
        report: this.state.composition, 
        sourceData: this.state.raw 
      });

      if (!this.state.validation.isValid) {
        this.onStatusUpdate?.(`⚠️ 유효성 경고: ${this.state.validation.errors.map(e => e.issue).join(', ')}`);
      }

      // 10. Critic (Pro) - 품질 평가
      this.state.critic = await this.executeAgent('critic', 'gemini-2.5-pro', { 
        report: this.state.composition,
        validation: this.state.validation
      });

      this.onStatusUpdate?.(`📊 품질 점수: ${this.state.critic.score}/100`);

      if (this.state.critic.score >= 85) {
        this.onStatusUpdate?.(`✅ 목표 점수 달성. 프로세스를 종료합니다.`);
        break;
      }

      if (!isLastLoop) {
        this.onStatusUpdate?.(`🔄 품질 보강을 위해 재분석을 진행합니다. (사유: ${this.state.critic.feedback})`);
      } else {
        this.onStatusUpdate?.(`최대 반복 횟수에 도달하여 현재 결과물을 확정합니다.`);
      }
    }

    return this.assembleFinalReport();
  }

  async collectData() {
    this.onStatusUpdate?.(`[Collector] DART/FMP 및 최신 뉴스 수집 중...`);
    const { type, ticker } = this.state.resolve;
    const sources = [];

    // [Step A] Financial & Disclosure APIs
    let disclosures = '';
    let finance = null;

    if (type === 'KR') {
      [disclosures, finance] = await Promise.all([
        fetchDartDisclosures(this.companyName),
        fetchDartFinance(this.companyName)
      ]);
      sources.push({ title: 'DART 전자공시시스템', uri: 'https://opendart.fss.or.kr/' });
    } else {
      finance = await fetchFmpFinance(ticker);
      disclosures = `US SEC Filings for ${ticker} (Refer to web search for details)`;
      sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://financialmodelingprep.com/' });
    }

    // [Step B] Deep Search Briefing (Uses gemini-2.5-pro with tools)
    this.onStatusUpdate?.(`[Collector] 메인 엔진 심층 웹 검색 중...`);
    const searchPrompt = `Evaluate '${this.companyName}' (${type}: ${ticker || 'KRX'}). Search for recent news, earnings calls, and strategic pivots. Output a detailed exhaustive briefing in English.`;
    
    const searchResult = await fetchWithRetry(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        contents: [{ parts: [{ text: searchPrompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 10000 }
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

  async executeAgent(agentName, model, context = {}) {
    const agentPrompt = `You are the specialized '${agentName}' agent for corporate analysis.
      Current Context: ${JSON.stringify(context)}
      Instructions: Provide high-quality analysis. Output MUST be in JSON format matching the schema for ${agentName}.
      Language: Respond in Korean (unless it's the Collector briefing).`;

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          contents: [{ parts: [{ text: agentPrompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return JSON.parse(extractJson(text) || '{}');
    } catch (err) {
      console.error(`Error in ${agentName}:`, err);
      return { error: err.message };
    }
  }

  assembleFinalReport() {
    const { composition, analysis, raw, critic, iterationCount } = this.state;
    
    // UI가 기대하는 구조와의 완벽한 호환성 확보
    return {
      companyName: this.companyName,
      report: {
        macroTrend: analysis.strategy?.macroTrend || {},
        industryStatus: analysis.strategy?.industryStatus || {},
        vision: analysis.strategy?.vision || {},
        businessModel: analysis.strategy?.businessModel || {},
        swotAnalysis: analysis.strategy?.swotAnalysis || {},
        marketSentiment: analysis.news?.marketSentiment || {},
        financialAnalysis: {
          overview: analysis.financial?.overview || {},
          keyMetrics: analysis.financial?.keyMetrics || []
        },
        recentNews: analysis.news?.recentNews || [],
        ...composition // Composer가 만든 추가적인 내러티브나 마크다운 섹션
      },
      sources: raw.sources,
      score: critic.score,
      iteration: iterationCount,
      financeData: raw.finance
    };
  }
}

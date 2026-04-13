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

    // 3. Normalizer (Flash) - 데이터 표준화 (루프 밖에서 1회만 실행)
    this.onStatusUpdate?.(`[데이터 정제] 수집된 원시 데이터 표준화 중...`);
    this.state.normalized = await this.executeAgent('normalizer', 'gemini-2.5-flash', { 
      raw: this.state.raw,
      resolver: this.state.resolve
    });

    // 4~7. Batch Analysis (Flash/Pro) - 503 방어와 속도 개선을 위해 2개씩 짝지어서 병렬 처리 (루프 밖에서 1회만 실행)
    this.onStatusUpdate?.(`[분석] 4개 전문 분야 분석 중 (그룹 1/2)...`);
    const [financial, disclosure] = await Promise.all([
      this.executeAgent('financial-analyst', 'gemini-2.5-flash', { normalized: this.state.normalized }),
      this.executeAgent('disclosure-analyst', 'gemini-2.5-flash', { rawDisclosures: this.state.raw.disclosures })
    ]);

    this.onStatusUpdate?.(`[분석] 4개 전문 분야 분석 중 (그룹 2/2)...`);
    const [news, strategy] = await Promise.all([
      this.executeAgent('news-analyst', 'gemini-2.5-flash', { searchBriefing: this.state.raw.searchBriefing }),
      this.executeAgent('strategy-analyst', 'gemini-2.5-pro', { normalized: this.state.normalized, briefing: this.state.raw.searchBriefing })
    ]);
    
    this.state.analysis = { financial, disclosure, news, strategy };

    // Loop Start - 보고서 합성, 팩트 체크, 품질 평가만 루프를 돕니다.
    while (this.iterationCount < this.maxIterations) {
      this.iterationCount++;
      const isLastLoop = this.iterationCount === this.maxIterations;
      this.onStatusUpdate?.(`[루프 ${this.iterationCount}/${this.maxIterations}] 보고서 합성 및 검증 시작...`);

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

      // 강제 에러 방어: validation 객체가 정상적이지 않을 경우 기본값 주입
      if (!this.state.validation || typeof this.state.validation.isValid !== 'boolean') {
        this.state.validation = { isValid: false, errors: [{ issue: 'API 응답 오류로 인한 검증 실패(데이터 누락)' }] };
      }

      if (!this.state.validation.isValid) {
        const errors = Array.isArray(this.state.validation.errors) ? this.state.validation.errors : [];
        const issueMsg = errors.length > 0 ? errors.map(e => e.issue).join(', ') : '알 수 없는 검증 오류';
        this.onStatusUpdate?.(`⚠️ 유효성 경고: ${issueMsg}`);
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
    
    // 이전에 사용된 강력한 9대 전략 기조 프롬프트를 부활시키고, DART 재무 데이터를 검색 엔진에 직접 주입합니다.
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

  async executeAgent(agentName, model, context = {}) {
    // 💡 Vite로 번들링된 .md 파일 시스템 프롬프트를 매핑해서 가져옵니다.
    const systemInstruction = agentPromptsMap[agentName] 
      ? `## SYSTEM DOMAIN EXPERTISE & RULES:\n${agentPromptsMap[agentName]}` 
      : `You are the specialized '${agentName}' agent for corporate analysis. Output MUST be in JSON format matching the schema for ${agentName}.`;

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
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

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

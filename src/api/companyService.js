// src/api/companyService.js
import { extractJson } from '../utils/formatters';


const fetchDartDisclosures = async (companyName) => {
  try {
    const encodedName = encodeURIComponent(companyName);
    const url = `/api/dart?corp_name=${encodedName}&page_count=5`;
    const response = await fetch(url);

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      console.error('DART API 오류 응답:', response.status);
      return "DART API 응답 오류입니다. 잠시 후 다시 시도해 주세요.";
    }
    const data = await response.json();

    if (data.status === "000" && data.list) {
      return data.list.map(d => `- [${d.rcept_dt}] ${d.report_nm}`).join('\n');
    }
    return "해당 기업의 최근 공시 내역이 없거나 한국 상장사가 아닙니다.";
  } catch (error) {
    console.error("DART API 에러:", error);
    return "공시 정보를 가져오는 중 에러가 발생했습니다.";
  }
};

// DART 재무제표 수치 가져오기
const fetchDartFinance = async (companyName) => {
  try {
    const encodedName = encodeURIComponent(companyName);
    const response = await fetch(`/api/dart-finance?corp_name=${encodedName}`);

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      console.error('DART Finance API 오류:', response.status);
      return null;
    }
    return await response.json(); // { keyMetrics, raw, bsnsYear }
  } catch (error) {
    console.error("DART Finance 에러:", error);
    return null;
  }
};

const US_TICKER_MAP = {
  '애플': 'AAPL',
  '엔비디아': 'NVDA',
  '테슬라': 'TSLA',
  '마이크로소프트': 'MSFT',
  '구글': 'GOOGL',
  '알파벳': 'GOOGL',
  '아마존': 'AMZN',
  '메타': 'META',
  '페이스북': 'META',
  '넷플릭스': 'NFLX',
  '에이엠디': 'AMD',
  '인텔': 'INTC',
  '퀄컴': 'QCOM',
  '브로드컴': 'AVGO',
  '티에스엠씨': 'TSM',
  '에이에스엠엘': 'ASML',
  '코인베이스': 'COIN',
  '팔란티어': 'PLTR',
  '마이크론': 'MU',
  '슈퍼마이크로컴퓨터': 'SMCI',
  '일라이릴리': 'LLY',
  '노보노디스크': 'NVO',
  '월마트': 'WMT',
  '코스트코': 'COST',
  '제이피모건': 'JPM',
  '뱅크오브아메리카': 'BAC',
  '비자': 'V',
  '마스터카드': 'MA',
  '존슨앤존슨': 'JNJ',
  '유나이티드헬스': 'UNH',
  '쿠팡': 'CPNG',
  '버크셔해서웨이': 'BRK.B',
  '암': 'ARM'
};

const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 1500));
    }
  }
};

const detectTickerByAI = async (companyName) => {
  const url = `/api/gemini`;
  const prompt = `
Task: Identify the stock exchange of "${companyName}".
If it is a South Korean company traded on KRX (KOSPI/KOSDAQ, e.g., 삼성전자, 카카오), output EXACTLY the word: KOREAN
If it is a US or global company traded on US exchanges (e.g., Apple, Nvidia, 조비 에비에이션), output EXACTLY its official US ticker symbol (e.g., AAPL, NVDA, JOBY).
DO NOT output any markdown, punctuation, or thinking blocks. Output ONLY the uppercase ticker or the word KOREAN.
`;
  try {
    const result = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 100
        }
      })
    });
    
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text?.toUpperCase() || '';
    
    // 1. KOREAN이 명시적으로 포함되어 있으면 무조건 한국 주식
    if (text.includes('KOREAN')) return 'KOREAN';

    // 2. <thought>와 같은 중간 텍스트가 껴있을 수 있으므로 알파벳 대문자로 된 1~8글자 단어들 중 마지막 것을 추출
    const words = text.match(/\b[A-Z0-9-]{1,8}\b/g);
    if (words && words.length > 0) {
      return words[words.length - 1]; // 생각 과정(Chain of Thought) 이후 가장 마지막에 나온 단어를 결과로 채택
    }

    return text.trim();
  } catch (error) {
    console.error("AI Ticker detection failed", error);
  }
  return null;
};

const resolveTicker = async (companyName) => {
  const trimmedName = companyName.trim();
  const upperName = trimmedName.toUpperCase();
  
  // 1. 한국어 매핑 확인 (빠른 캐시)
  if (US_TICKER_MAP[trimmedName]) return { type: 'US', ticker: US_TICKER_MAP[trimmedName] };
  if (US_TICKER_MAP[upperName]) return { type: 'US', ticker: US_TICKER_MAP[upperName] };

  // 2. 이미 짧은 영어 티커 형태인 경우 (예: AAPL, NVDA)
  if (/^[A-Z]{1,6}$/.test(upperName) && !/[가-힣]/.test(trimmedName)) {
    return { type: 'US', ticker: upperName };
  }

  // 3. AI(Gemini)를 통해 가장 유사한 티커 조회 (예: '조비 에비에이션' -> 'JOBY')
  const aiResult = await detectTickerByAI(trimmedName);
  if (aiResult === 'KOREAN') {
    return { type: 'KR', ticker: null };
  } else if (aiResult && /^[A-Z0-9-]{1,8}$/.test(aiResult) && aiResult !== 'UNKNOWN') {
    return { type: 'US', ticker: aiResult };
  }

  // 기본값 폴백 (알 수 없는 경우 한글 포함 여부로 판단)
  if (/[가-힣]/.test(trimmedName)) return { type: 'KR', ticker: null };
  return { type: 'US', ticker: upperName };
};

// FMP 재무제표 수치 가져오기 (미국 주식용)
const fetchFmpFinance = async (ticker) => {
  try {
    const apiKey = import.meta.env.VITE_FMP_API_KEY;
    if (!apiKey) {
      console.error("FMP API 키가 없습니다.");
      return null;
    }
    
    // Fetch Income Statement (Annual)
    const incUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=4&apikey=${apiKey}`;
    const balUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=4&apikey=${apiKey}`;
    
    const [incRes, balRes] = await Promise.all([
      fetch(incUrl),
      fetch(balUrl)
    ]);

    if (!incRes.ok || !balRes.ok) {
      console.error('FMP API 오류:', incRes.status, balRes.status);
      return null;
    }

    const incData = await incRes.json();
    const balData = await balRes.json();

    if (!Array.isArray(incData) || !Array.isArray(balData) || incData.length === 0 || balData.length === 0) {
      if (incData['Error Message']) {
         console.error('FMP API 에러 메시지:', incData['Error Message']);
      }
      return null;
    }

    const rawByYear = {};
    for (let i = 0; i < Math.max(incData.length, balData.length); i++) {
      const inc = incData[i] || {};
      const bal = balData[i] || {};
      const year = inc.calendarYear || bal.calendarYear || (new Date().getFullYear() - i).toString();
      
      const rev = inc.revenue || 0;
      const op = inc.operatingIncome || 0;
      const net = inc.netIncome || 0;
      const eq = bal.totalStockholdersEquity || bal.totalEquity || 0;
      const liab = bal.totalLiabilities || 0;

      rawByYear[year] = {
        year,
        revenue: rev,
        opIncome: op,
        netInc: net,
        equity: eq,
        liab: liab,
        revenueRaw: rev.toLocaleString(),
        opIncomeRaw: op.toLocaleString(),
        netIncRaw: net.toLocaleString(),
        equityRaw: eq.toLocaleString(),
        liabRaw: liab.toLocaleString(),
      };
    }

    const validYears = Object.keys(rawByYear).sort((a, b) => b - a);
    const displayYears = validYears.slice(0, 3);

    const displayYearData = displayYears.map(year => rawByYear[year]);

    const yearlyMetrics = displayYearData.map((cur) => {
      const prevYearStr = (parseInt(cur.year) - 1).toString();
      const prev = rawByYear[prevYearStr] || {};

      const curRev = cur.revenue;
      const prevRev = prev.revenue;

      const revGrowth = prevRev ? ((curRev - prevRev) / Math.abs(prevRev)) * 100 : 0;
      const opMargin = curRev ? (cur.opIncome / curRev) * 100 : 0;
      const roe = cur.equity ? (cur.netInc / cur.equity) * 100 : 0;
      const debtRatio = cur.equity ? (cur.liab / cur.equity) * 100 : 0;

      return {
        year: cur.year,
        revenueGrowth: revGrowth ? `${revGrowth > 0 ? '+' : ''}${revGrowth.toFixed(1)}%` : null,
        operatingMargin: opMargin ? `${opMargin.toFixed(1)}%` : null,
        roe: roe ? `${roe.toFixed(1)}%` : null,
        debtRatio: debtRatio ? `${debtRatio.toFixed(1)}%` : null,
        raw: {
          revenue: cur.revenueRaw,
          opIncome: cur.opIncomeRaw,
          netIncome: cur.netIncRaw,
          equity: cur.equityRaw,
          liab: cur.liabRaw,
        }
      };
    });

    if (yearlyMetrics.length === 0) return null;

    const currentYearStr = yearlyMetrics[0].year;
    const latestRaw = yearlyMetrics[0].raw;
    const latestKeyMetrics = {
      revenueGrowth: yearlyMetrics[0].revenueGrowth || '데이터 없음',
      operatingMargin: yearlyMetrics[0].operatingMargin || '데이터 없음',
      roe: yearlyMetrics[0].roe || '데이터 없음',
      debtRatio: yearlyMetrics[0].debtRatio || '데이터 없음',
    };

    return {
      bsnsYear: currentYearStr,
      raw: {
        ...latestRaw,
        currency: incData[0]?.reportedCurrency || 'USD'
      },
      keyMetrics: latestKeyMetrics,
      yearlyMetrics
    };
  } catch (error) {
    console.error("FMP Finance 에러:", error);
    return null;
  }
};

export const fetchCompanyData = async (companyName, onStatusUpdate) => {
  const url = `/api/gemini`;
  
  onStatusUpdate?.(`[${companyName}] 기업 종류 및 티커 식별 중...`);
  const stockInfo = await resolveTicker(companyName);
  const isKoreanStock = stockInfo.type === 'KR';

  let disclosureInfo = '';
  let financeData = null;
  let financeContext = '';
  
  const sources = [];

  if (isKoreanStock) {
    onStatusUpdate?.(`[${companyName}] DART 공시 데이터 수집 중...`);
    disclosureInfo = await fetchDartDisclosures(companyName);

    onStatusUpdate?.(`[${companyName}] DART 재무제표 수집 중...`);
    financeData = await fetchDartFinance(companyName);

    sources.push({ title: 'DART 전자공시시스템 (Open DART)', uri: 'https://opendart.fss.or.kr/' });

    financeContext = financeData
      ? `
DART 재무제표 실수치 (${financeData.bsnsYear}년 기준, 단위: 원):
- 매출액: ${financeData.raw.revenue}
- 영업이익: ${financeData.raw.opIncome}
- 당기순이익: ${financeData.raw.netIncome}
- 자본총계: ${financeData.raw.equity}
- 부채총계: ${financeData.raw.liab}

계산된 지표 (이 값을 keyMetrics에 그대로 사용하세요):
- 매출 성장률: ${financeData.keyMetrics.revenueGrowth ?? '데이터 없음'}
- 영업이익률: ${financeData.keyMetrics.operatingMargin ?? '데이터 없음'}
- ROE: ${financeData.keyMetrics.roe ?? '데이터 없음'}
- 부채비율: ${financeData.keyMetrics.debtRatio ?? '데이터 없음'}
`
      : 'DART 재무제표 실수치를 가져오지 못했습니다. 웹 검색으로 추정하여 채워주세요.';
  } else {
    const ticker = stockInfo.ticker;
    onStatusUpdate?.(`[${companyName}] 미국 기업(티커: ${ticker}) 정보 수집 중...`);
    disclosureInfo = `US Stock (${companyName}, Ticker: ${ticker}): Please rely on web search for recent SEC filings and news.`;

    onStatusUpdate?.(`[${companyName}] FMP 재무제표 수집 중...`);
    financeData = await fetchFmpFinance(ticker);
    
    sources.push({ title: 'Financial Modeling Prep (FMP)', uri: 'https://site.financialmodelingprep.com/' });

    financeContext = financeData
      ? `
FMP 재무제표 실수치 (${financeData.bsnsYear}년 기준, 단위: ${financeData.raw.currency}):
- 매출액: ${financeData.raw.revenue}
- 영업이익: ${financeData.raw.opIncome}
- 당기순이익: ${financeData.raw.netIncome}
- 자본총계: ${financeData.raw.equity}
- 부채총계: ${financeData.raw.liab}

계산된 지표 (이 값을 keyMetrics에 그대로 사용하세요):
- 매출 성장률: ${financeData.keyMetrics.revenueGrowth ?? '데이터 없음'}
- 영업이익률: ${financeData.keyMetrics.operatingMargin ?? '데이터 없음'}
- ROE: ${financeData.keyMetrics.roe ?? '데이터 없음'}
- 부채비율: ${financeData.keyMetrics.debtRatio ?? '데이터 없음'}
`
      : 'FMP 재무제표 실수치를 가져오지 못했습니다. 웹 검색으로 추정하여 채워주세요.';
  }

  const today = new Date().toLocaleDateString('ko-KR');
  const contextTitle = isKoreanStock ? '[Korean DART Disclosure List]' : '[US SEC / Company Context]';
  const financeTitle = isKoreanStock ? '[Korean DART Financial Data]' : '[US FMP Financial Data]';
  const disclosureInstruction = isKoreanStock 
    ? 'You MUST ground all references to official DART disclosures strictly in the provided [Korean DART Disclosure List]. DO NOT invent, assume, or hallucinate any recent disclosures (especially regarding trading suspension, delisting, or bankruptcy) that are not explicitly listed in the DART data.'
    : 'You MUST ground all references to official SEC filings or major announcements strictly in your web search findings. DO NOT invent, assume, or hallucinate any recent events (especially regarding trading suspension, delisting, or bankruptcy).';

  // --- STAGE 1: Main Search Engine (gemini-2.5-pro) ---
  onStatusUpdate?.(`[${companyName}] 메인 엔진: 최신 뉴스 및 기업 환경 심층 웹 검색 중...`);

  const searchPrompt = `
    Today's date is ${today}. You are a Senior Equity Research Analyst & Corporate Strategy Consultant at a top-tier global firm.
    Your mission is to conduct an **EXPRESS INVESTIGATIVE RESEARCH** for '${companyName}' using the **Product Strategy Canvas (9 Sections)** and **Value Proposition (JTBD)** frameworks.

    **REQUIRED RESEARCH VERTICALS (BASED ON STRATEGY SKILLS):**
    1. **Vision & Mission**: What is their North Star? Long-term aspirational goals and core values.
    2. **Target Segments**: Who are their high-value customers? Precise market demographics and personas.
    3. **Value Proposition (Jobs-to-be-Done)**: What specific pain points do they solve? "What are they hired to do?" for customers.
    4. **Product Infrastructure**: Core features, UX/UI, and product distribution channels (Omni-channel strategy).
    5. **Trade-offs (Focus)**: What have they explicitly decided NOT to do? Strategic sacrifices for efficiency.
    6. **Key Metrics (KPIs)**: Revenue, ARR, Retention, Churn, or industry-specific metrics (e.g., Load factor, DAU/MAU).
    7. **Growth & Monetization Loops**: Viral loops, content loops, and precise pricing/revenue models.
    8. **Capabilities**: Internal proprietary technology, data assets, and operational excellence.
    9. **Defensibility (Moats)**: Why can't competitors easily copy them? (Network effects, Brand, Switching costs).

    **CRITICAL RESEARCH INSTRUCTIONS:**
    - Conduct your search in English.
    - Write the entire briefing in English using Professional Analyst terminology.
    - FACT CHECK: ${disclosureInstruction}
    - Label rumors as "unconfirmed market rumors" with no official support as of ${today}.
    - OUTPUT VOLUME: Provide a **remarkably exhaustive** briefing. Aim for 25,000+ characters or 8,000+ tokens. Provide raw data, exact statistics, executive quotes, and historical context.
    - SOURCE ATTRIBUTION: Include multiple news headlines and direct citations from earnings calls or CEO interviews.

    ${contextTitle}
    ${disclosureInfo}

    ${financeTitle}
    ${financeContext}
  `;

  const searchResult = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: searchPrompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 65536
      }
    })
  });

  const researchBriefing = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!researchBriefing) {
    console.error('메인 엔진 응답 구조:', JSON.stringify(searchResult).substring(0, 500));
    const blockReason = searchResult.candidates?.[0]?.finishReason || searchResult.promptFeedback?.blockReason;
    throw new Error(`메인 엔진의 검색 데이터를 읽을 수 없습니다. (사유: ${blockReason || '응답 없음'})`);
  }

  // --- 추출: 검색 출처 (Grounding Metadata) ---
  const groundingMetadata = searchResult.candidates?.[0]?.groundingMetadata;

  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach(chunk => {
      if (chunk.web && chunk.web.uri) {
        if (!sources.some(s => s.uri === chunk.web.uri)) {
          sources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri
          });
        }
      }
    });
  }

  // --- STAGE 2: 5 Output Engines (gemini-2.5-flash) in Parallel ---
  // 10개 파트를 5개 그룹으로 분배하여 병렬 분석합니다.
  onStatusUpdate?.(`[${companyName}] 서브 엔진(5개 그룹) 병렬 상세 분석 전개 중 (0/5)...`);

  const createGroupPrompt = (groupName, groupInstructions, outputFormat) => `
    당신은 '${companyName}' 기업 분석 보고서를 작성하는 최고의 전문가입니다.
    아래는 메인 리서치 AI가 수집한 방대한 최신 자료(영어)입니다.
    
    [통합 리서치 브리핑]
    ${researchBriefing}
    
    위 자료를 바탕으로 보고서의 [${groupName}] 파트들을 분석하여 한국어로 작성해 주세요. 
    
    각 파트의 'detail' 필드는 증권사 리서치센터가 발행하는 전문 심층 리포트 수준으로 작성해야 합니다.
    - 각 detail 필드는 최소 2,000~3,000자 이상 (약 4~6개 문단)으로, 구체적인 수치/통계, 인과관계 분석, 역사적 맥락, 미래 전망을 모두 포함해야 합니다.
    - 마크다운의 ### 소제목, **강조**, - 불릿 리스트를 적극 활용하여 구조화된 리포트 형태로 작성하세요.
    - 짧거나 피상적인 답변은 절대 불가합니다. 보고서의 가치는 깊이와 분량에서 나옵니다.
    
    지시사항: 
    ${groupInstructions}
    
    CRITICAL FACT-CHECKING:
    - 보고서의 모든 내용은 위 [통합 리서치 브리핑]에 근거해야 합니다.
    - 특히 상장폐지 사유 발생, 주권매매거래정지, 부도 등 기업의 존립에 영향을 미치는 치명적인 부정적 공시(DART)는 반드시 브리핑 내의 실제 DART 목록에 존재할 경우에만 구체적인 날짜와 함께 인용하세요.
    - 브리핑 내용 중 출처가 불분명하거나 루머성 정보인 경우 반드시 '시장 루머' 혹은 '확인되지 않은 정보'임을 명시해야 합니다.
    
    CRITICAL: 문단을 나눌 때는 줄바꿈을 사용하고, 마크다운 문법(예: **강조**, - 불릿 리스트, ### 소제목 등)을 적극 활용하여 가독성을 높이세요!
    CRITICAL: JSON 문자열 내부에 줄바꿈은 \\n으로 이스케이프 처리하고, 탭(Tab) 등의 제어문자는 절대 사용하지 마세요.
    CRITICAL: JSON의 Value(내용) 텍스트 안에 큰따옴표(")를 절대 사용하지 마세요. 강조가 필요하면 작은따옴표(')를 쓰세요.
    출력은 반드시 다른 텍스트 없이 아래 JSON 구조만 출력하세요. (마크다운 백틱 등 금지)
    출력 포맷:
    ${outputFormat}
  `;

  const groupTasks = [
    {
      key: 'group1',
      prompt: createGroupPrompt(
        '거시 경제 및 산업 전문가 (PESTLE & 5 Forces Analyst)',
        `[에이전트 역할: 외부 시황과 거시 경제 트렌드를 'PESTLE 분석'과 'Porter의 5 Forces' 프레임워크로 완벽히 해부합니다.]
- macroTrend: PESTLE (Political, Economic, Social, Technological, Legal, Environmental) 관점에서 이 기업이 처한 외부 비즈니스 환경의 거시적 흐름을 구체적으로 서술하세요. 각 요소를 명확히 분리하여 텍스트로 기술하되 전체 문단으로 엮어 detail에 넣습니다. (개별 기업 내부 전략은 절대 언급 금지)
- industryStatus: Porter's Five Forces (경쟁 강도, 공급자 교섭력, 구매자 교섭력, 대체재 위협, 신규 진입 위협) 기반으로 이 기업이 속한 섹터의 경쟁 구도와 매력도를 철저히 분석하세요.
[MECE 경계 조항]: 개별 기업의 "비전, 수익 모델, 리스크"에 대해서는 다음 에이전트들이 담당하므로 여기서는 절대로 서술하지 마세요.`,
        `{
  "macroTrend": { "summary": "PESTLE 핵심 1문장 요약", "detail": "PESTLE 구조에 기반한 매우 구체적이고 깊이 있는 거시 지표 중심 분석 내용" },
  "industryStatus": { "summary": "5 Forces 1문장 요약", "detail": "Porter의 5 Forces 프레임워크를 기반으로 한 산업 경쟁 매력도 및 현황 서술" }
}`
      )
    },
    {
      key: 'group2',
      prompt: createGroupPrompt(
        '제품 전략 & 비전 파트너 (Product Vision & Strategy)',
        `[에이전트 역할: 기업의 제품 전략(Product Strategy) 및 장기적 비전에만 집중합니다.]
- vision: 이 기업이 발표한 경영진의 미래 비전, 장기 로드맵, 그리고 목표하는 시장 점유율 전략을 분석. "어떤 솔루션(제품/서비스)으로 미래를 준비하는가?"에만 집중하세요.
[MECE 경계 조항]: 단기적인 "자금수익 구조(비즈니스 모델)"나 "재무 수치, 단기 리스크"에 대한 내용은 절대 포함하지 마세요. 오직 회사의 제품 중심 미래 지향성에만 초점을 맞추세요.`,
        `{
  "vision": { "summary": "장기 제품/시장 비전 1문장 요약", "detail": "가치 제안(Value Proposition)과 미래 로드맵을 기반으로 한 제품 중심의 비전 세부 전개 내용" }
}`
      )
    },
    {
      key: 'group3',
      prompt: createGroupPrompt(
        '비즈니스 솔루션 파트너 (Business Model Canvas Analyst)',
        `[에이전트 역할: 기업의 세부 수익 구조를 'Business Model Canvas' 기반으로 해부합니다.]
- businessModel: 이 기업 구체적으로 어떤 구조로 돈을 벌고 있는지 분석하세요. 핵심 파트너, 가치 제안, 수익원(캐시카우), 비용 구조, 고객 세그먼트를 묶어서 구체적으로 서술하세요. 
[MECE 경계 조항]: "광범위한 거시 트렌드"나 "미래 청사진(비전)", 그리고 "위협(Threat)/리스크"는 절대 적지 마세요. 위협은 다음 SWOT 파트에서 다룹니다. 오직 현행 돈을 버는 구조 그 자체에만 국한하여 서술하세요.`,
        `{
  "businessModel": { "summary": "수익 구조 1문장 요약", "detail": "Business Model Canvas 핵심 요소 중심의 부문별 매출 기여 및 구조 분석" }
}`
      )
    },
    {
      key: 'group4',
      prompt: createGroupPrompt(
        'SWOT 전문 분석가 (SWOT Strategy Master)',
        `[에이전트 역할: 모든 브리핑 데이터에서 요소를 추출하여 완벽히 구분된 SWOT 프레임워크로 재구성합니다.]
- swotAnalysis: 강점(Strength, 내부), 약점(Weakness, 내부 역량 부족), 기회(Opportunity, 외부 환경 유리함), 위협(Threat, 리스크/외부 견제/단기운영위기)의 매트릭스 형태로 상세히 도출하세요.
[MECE 경계 조항]: 이전 단계에서 리스크가 제거되었으므로, **모든 리스크와 법적 제재, 자금 압박, 경쟁 위협 등의 악재는 여기 SWOT의 Weakness와 Threat**에 철저히 흡수시켜 작성하세요. 반드시 S,W,O,T 4가지 구분에 맞는지 논리성을 엄격히 따지며 중복되는 항목이 없도록 철저히 통제하세요.`,
        `{
  "swotAnalysis": { 
    "strength": { "summary": "강점 요약", "detail": "내부적 핵심 역량 상세" },
    "weakness": { "summary": "약점 및 리스크 요약", "detail": "내부적 한계와 재무적/구조적 결함 리스크 상세" },
    "opportunity": { "summary": "기회 요약", "detail": "시장 상황 변화에 의한 돌파구 상세" },
    "threat": { "summary": "위협 및 리스크 요약", "detail": "경쟁/규제 및 모든 형태의 파생 외부 리스크, 운영 위협 상세" }
  }
}`
      )
    },
    {
      key: 'group5',
      prompt: createGroupPrompt(
        '객관적 재무 감사관 & 투자 심리 (Financial Auditor & Sentiment)',
        `[에이전트 역할: 사실과 숫자를 기반으로 한 객관적 팩트 구성 및 시장 심리를 판단합니다.]
- financialAnalysis.overview: 숫자에 의한 재무 상태 안정성 및 건전성을 과거/현재 대비 평가합니다.
- financialAnalysis.keyMetrics: 주어진 재무 테이블 지표를 변형 없이 JSON으로 추출합니다.
- marketSentiment: 주가 및 실적에 반응하는 투자자들의 동향, 애널리스트들의 매수/매도 심리를 5가지 기조로 분석하세요.
- recentNews: 브리핑에서 가장 영향력 있는 뉴스 기사 헤드라인 2~3개를 축약합니다.
[MECE 경계 조항]: 추상적인 비전이나 제품 확장에 대해 떠들지 마세요. 재무 통계, 기사 팩트 점검, 그리고 철저히 주가를 둘러싼 투자자의 냉정한 심리만 다루세요.`,
        `{
  "financialAnalysis": {
    "overview": { "summary": "1문장 요약", "detail": "수익, 부채비용 관점에서의 철저한 재무 분해" },
    "keyMetrics": [ { "revenueGrowth": "수치", "operatingMargin": "수치", "roe": "수치", "debtRatio": "수치", "eps": "수치" } ]
  },
  "marketSentiment": { "status": "Positive/Neutral/Negative 중 택 1", "analysis": [{ "summary": "주요 심리 한 줄 요약", "detail": "상세 팩트/시장 반응" }] },
  "recentNews": [
    { "headline": "뉴스 제목", "summary": "핵심 1문장 요약", "detail": "뉴스 본문 및 객관적인 팩트 체크 내용" }
  ]
}`
      )
    }
  ];

  let completedTasks = 0;

  const generateGroup = async (task) => {
    const result = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: task.prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 65536,
          responseMimeType: "application/json"
        }
      })
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = extractJson(text);
    if (!jsonStr) throw new Error(`${task.key} 파트 그룹을 분석할 수 없습니다.`);

    // AI가 실수로 넣은 실제 제어 문자(탭 등)를 공백으로 치환 (JSON 파싱 에러 방지용)
    // 줄바꿈(\n)은 마크다운 렌더링을 위해 보존합니다.
    const sanitizedJsonStr = jsonStr.replace(/[\r\t\u00A0\u2028\u2029]+/g, ' ');

    let parsedGroup;
    try {
      parsedGroup = JSON.parse(sanitizedJsonStr);
    } catch (parseError) {
      console.error("JSON Parsing Error! 문제의 문자열:", sanitizedJsonStr);
      parsedGroup = JSON.parse(extractJson(text));
    }

    completedTasks++;
    onStatusUpdate?.(`[${companyName}] 서브 엔진 완료 (${completedTasks}/5)`);
    return parsedGroup;
  };

  // Execute the 5 groups in parallel
  const groupResults = await Promise.all(groupTasks.map(generateGroup));

  // 각주 일괄 삭제
  const cleanFootnotes = (data) => {
    if (typeof data === 'string') {
      return data.replace(/\s*\[[\d\s,]+\]/g, '');
    }
    if (Array.isArray(data)) {
      return data.map(cleanFootnotes);
    }
    if (data !== null && typeof data === 'object') {
      const cleaned = {};
      for (let key in data) {
        cleaned[key] = cleanFootnotes(data[key]);
      }
      return cleaned;
    }
    return data;
  };

  let reportJson = {
    companyName: companyName,
    macroTrend: {},
    report: {
      marketSentiment: {},
      vision: {},
      businessModel: {},
      industryStatus: {},
      swotAnalysis: {},
      financialAnalysis: {
        overview: {},
        keyMetrics: []
      },
      recentNews: []
    }
  };

  let mergedGroup = {};
  groupResults.forEach(res => {
    mergedGroup = { ...mergedGroup, ...res };
  });

  mergedGroup = cleanFootnotes(mergedGroup);

  if (mergedGroup.macroTrend) reportJson.macroTrend = mergedGroup.macroTrend;
  if (mergedGroup.industryStatus) reportJson.report.industryStatus = mergedGroup.industryStatus;
  if (mergedGroup.marketSentiment) reportJson.report.marketSentiment = mergedGroup.marketSentiment;
  if (mergedGroup.vision) reportJson.report.vision = mergedGroup.vision;
  if (mergedGroup.businessModel) reportJson.report.businessModel = mergedGroup.businessModel;
  if (mergedGroup.swotAnalysis) reportJson.report.swotAnalysis = mergedGroup.swotAnalysis;
  if (mergedGroup.financialAnalysis) reportJson.report.financialAnalysis = mergedGroup.financialAnalysis;
  if (mergedGroup.recentNews) reportJson.report.recentNews = mergedGroup.recentNews;

  if (financeData?.yearlyMetrics || financeData) reportJson.financeData = financeData; // dartFinance -> financeData

  // 출처 정보 추가
  reportJson.sources = sources;

  return reportJson;
};
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
    Today's date is ${today}. You are a top-tier financial analyst. 
    Conduct an extremely expansive web search using the Google Search tool for the most recent news, macro-economic conditions, stock market trends, product releases, competitor actions, and industry issues regarding '${companyName}'.
    IMPORTANT: You must conduct your search in English, and you MUST write your entire research briefing notes completely in English.
    Combine your extensive web search findings with the provided data below to create a remarkably verbose and comprehensive research briefing.
    
    CRITICAL FACTUAL INTEGRITY: 
    - ${disclosureInstruction}
    - If you find high-impact negative rumors in web search that are NOT official, you MUST explicitly label them as "unconfirmed market rumors" and clarify that there is no official disclosure to support them as of ${today}.
    
    Include specific facts, raw numbers, exact statistics, executive quotes, and multiple news headlines (in English) so that another AI can use it to write an exhaustive report.
    CRITICAL INSTRUCTION: DO NOT summarize. Output a remarkably exhaustive and high-volume briefing (Aim for at least 15,000~20,000+ characters or 7,000+ tokens). Break down every aspect of the company, industry, and macroeconomic context in granular detail so that the next AI phase has a massive amount of data to process.

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
        '시장 환경 분석 (macroTrend, industryStatus)',
        `- macroTrend: 기업을 둘러싼 거시 경제적 요인, 시장 트렌드를 구체적으로 서술하세요.
- industryStatus: 기업이 속한 산업의 현황, 경쟁 구도, 점유율, 규제 등을 구체적으로 서술하세요.`,
        `{
  "macroTrend": { "summary": "1문장 핵심 요약", "detail": "매우 구체적이고 깊이 있는 분석 내용" },
  "industryStatus": { "summary": "1문장 요약", "detail": "업계 동향 및 경쟁사 분석을 포함한 매우 구체적인 내용" }
}`
      )
    },
    {
      key: 'group2',
      prompt: createGroupPrompt(
        '투자 심리 & 비전 (marketSentiment, vision)',
        `- marketSentiment: 현재 주식 시장의 심리와 평가를 5가지 주요 이유를 들어 구체적으로 서술하세요. 각 항목은 핵심 한 줄 요약(summary)과 2~3문단 분량의 상세 분석(detail)으로 구성하세요.\n- vision: 기업의 중장기 비전 및 목표, 성장 전략을 구체적으로 서술하세요.`,
        `{
  "marketSentiment": { "status": "Positive/Neutral/Negative 중 택 1", "analysis": [{ "summary": "핵심 이유 한 줄 요약", "detail": "2~3문단 분량의 구체적인 상세 분석" }] },
  "vision": { "summary": "1문장 요약", "detail": "미래 전략 및 향후 행보에 대한 매우 구체적인 내용" }
}`
      )
    },
    {
      key: 'group3',
      prompt: createGroupPrompt(
        '비즈니스 & 리스크 전략 (businessModel, riskOutlook)',
        `- businessModel: 기업이 돈을 버는 수익 창출 구조와 주요 제품군을 캐시카우 중심으로 구체적으로 서술하세요.
- riskOutlook: 단/장기 예상되는 잠재적 리스크와 기업의 대응 전망을 구체적으로 서술하세요.`,
        `{
  "businessModel": { "summary": "1문장 요약", "detail": "수익 모델 및 주요 사업 구조에 대한 매우 구체적인 내용" },
  "riskOutlook": { "summary": "1문장 요약", "detail": "잠재적 이슈 및 리스크 관리에 대한 매우 구체적인 내용" }
}`
      )
    },
    {
      key: 'group4',
      prompt: createGroupPrompt(
        'SWOT 전략 분석 (swotAnalysis)',
        `- swotAnalysis: 강점, 약점, 기회, 위협을 각각 요약(summary)과 상세 분석(detail)으로 분리하여 구체적으로 서술하세요.`,
        `{
  "swotAnalysis": { 
    "strength": { "summary": "2~3문장 강점 요약", "detail": "구체적인 강점 상세 분석" },
    "weakness": { "summary": "2~3문장 약점 요약", "detail": "구체적인 약점 상세 분석" },
    "opportunity": { "summary": "2~3문장 기회 요약", "detail": "구체적인 기회 상세 분석" },
    "threat": { "summary": "2~3문장 위협 요약", "detail": "구체적인 위협 상세 분석" }
  }
}`
      )
    },
    {
      key: 'group5',
      prompt: createGroupPrompt(
        '재무 및 최신 동향 (financialOverview, financialKeyMetrics, recentNews)',
        `- financialAnalysis.overview: 제공된 재무 수치를 바탕으로 재무 건전성 및 실적 추이를 평가하세요.
- financialAnalysis.keyMetrics: 제공된 DART 재무 지표를 정확히 일치시켜 JSON 배열(길이 1)로 반환하세요. 앞서 제공된 지표가 없다면 웹 검색 기반 추정치를 기재하세요.
- recentNews: 가장 의미 있고 중요한 최신 메이저 뉴스 2~3개를 선정해 상세 내용을 다루세요.`,
        `{
  "financialAnalysis": {
    "overview": { "summary": "1문장 요약", "detail": "매출, 이익 흐름, 부채 등을 종합한 재무 성과 집중 평가 내용" },
    "keyMetrics": [ { "revenueGrowth": "매출 성장률 (예: +12.3%)", "operatingMargin": "영업이익률 (예: 8.7%)", "roe": "자기자본이익률 (예: 18.5%)", "debtRatio": "부채비율 (예: 142.0%)", "eps": "주당순이익 (예: 4,250원)" } ]
  },
  "recentNews": [
    { "headline": "뉴스 제목", "summary": "1문장 핵심 요약", "detail": "뉴스에서 파생된 영향, 배경 등 상세 내용" }
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
      riskOutlook: {},
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
  if (mergedGroup.riskOutlook) reportJson.report.riskOutlook = mergedGroup.riskOutlook;
  if (mergedGroup.financialAnalysis) reportJson.report.financialAnalysis = mergedGroup.financialAnalysis;
  if (mergedGroup.recentNews) reportJson.report.recentNews = mergedGroup.recentNews;

  if (financeData?.yearlyMetrics || financeData) reportJson.financeData = financeData; // dartFinance -> financeData

  // 출처 정보 추가
  reportJson.sources = sources;

  return reportJson;
};
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

// ✅ [추가 1] DART 재무제표 수치 가져오기
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

export const fetchCompanyData = async (companyName, onStatusUpdate) => {
  const url = `/api/gemini`;

  onStatusUpdate?.(`[${companyName}] DART 공시 데이터 수집 중...`);
  const dartInfo = await fetchDartDisclosures(companyName);

  // ✅ [추가 2] 재무제표 수치 병렬 수집
  onStatusUpdate?.(`[${companyName}] DART 재무제표 수집 중...`);
  const dartFinance = await fetchDartFinance(companyName);

  const today = new Date().toLocaleDateString('ko-KR');

  // ✅ [추가 3] DART 실수치 주입
  const dartFinanceContext = dartFinance
    ? `
DART 재무제표 실수치 (${dartFinance.bsnsYear}년 기준, 단위: 원):
- 매출액: ${dartFinance.raw.revenue}
- 영업이익: ${dartFinance.raw.opIncome}
- 당기순이익: ${dartFinance.raw.netIncome}
- 자본총계: ${dartFinance.raw.equity}
- 부채총계: ${dartFinance.raw.liab}

계산된 지표 (이 값을 keyMetrics에 그대로 사용하세요):
- 매출 성장률: ${dartFinance.keyMetrics.revenueGrowth ?? '데이터 없음'}
- 영업이익률: ${dartFinance.keyMetrics.operatingMargin ?? '데이터 없음'}
- ROE: ${dartFinance.keyMetrics.roe ?? '데이터 없음'}
- 부채비율: ${dartFinance.keyMetrics.debtRatio ?? '데이터 없음'}
`
    : 'DART 재무제표 실수치를 가져오지 못했습니다. 웹 검색으로 추정하여 채워주세요.';

  // --- STAGE 1: Main Search Engine (gemini-2.5-pro) ---
  onStatusUpdate?.(`[${companyName}] 메인 엔진: 최신 뉴스 및 기업 환경 심층 웹 검색 중...`);
  
  const searchPrompt = `
    Today's date is ${today}. You are a top-tier financial analyst. 
    Conduct an in-depth web search using the Google Search tool for the most recent news, stock market trends, and industry issues regarding '${companyName}'.
    IMPORTANT: You must conduct your search in English, and you MUST write your entire research briefing notes completely in English.
    Combine your web search findings with the provided Korea DART data below to create a highly detailed, comprehensive research briefing.
    Include specific facts, numbers, and news headlines (in English) so that another AI can use it to write a detailed report.
    Do not summarize; provide as much detail as possible.

    [Korean DART Disclosure List]
    ${dartInfo}
    
    [Korean DART Financial Data]
    ${dartFinanceContext}
  `;

  const searchResult = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-pro',
      contents: [{ parts: [{ text: searchPrompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        temperature: 0.2
      }
    })
  });

  const researchBriefing = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!researchBriefing) throw new Error("메인 엔진의 검색 데이터를 읽을 수 없습니다.");

  // --- STAGE 2: 10 Small Output Engines (gemini-2.5-flash) in Parallel ---
  onStatusUpdate?.(`[${companyName}] 서브 엔진(10개 파트) 병렬 상세 분석 전개 중 (0/10)...`);

  const createSubPrompt = (partName, instructions, outputFormat) => `
    당신은 '${companyName}' 기업 분석 보고서를 작성하는 최고의 전문가입니다.
    아래는 메인 리서치 AI가 수집한 방대한 최신 자료(영어)입니다.
    
    [통합 리서치 브리핑]
    ${researchBriefing}
    
    위 자료를 바탕으로 보고서의 [${partName}] 파트를 분석하여 한국어로 작성해 주세요. 
    간단한 요약으로 끝내지 말고 매우 상세하고 깊이 있는 전문가 수준의 설명을 제공해야 합니다.
    
    지시사항: ${instructions}
    
    CRITICAL: 반드시 모든 내용을 완벽하고 일관된 '한국어(Korean)'로 작성해야 합니다!
    출력은 반드시 다른 텍스트 없이 아래 JSON 구조만 출력하세요. (마크다운 백틱 등 금지)
    출력 포맷:
    ${outputFormat}
  `;

  const subTasks = [
    {
      key: 'macroTrend',
      prompt: createSubPrompt('거시적 트렌드 (macroTrend)', 
        '기업을 둘러싼 거시 경제적 요인, 시장 트렌드를 구체적으로 서술하세요.', 
        `{ "summary": "1문장 핵심 요약", "detail": "매우 구체적이고 깊이 있는 분석 내용" }`)
    },
    {
      key: 'marketSentiment',
      prompt: createSubPrompt('시장 심리 (marketSentiment)', 
        '현재 주식 시장의 심리와 평가를 3가지 주요 이유를 들어 구체적으로 서술하세요.', 
        `{ "status": "Positive/Neutral/Negative 중 택 1", "analysis": ["구체적인 이유 1", "구체적인 이유 2", "구체적인 이유 3"] }`)
    },
    {
      key: 'vision',
      prompt: createSubPrompt('기업 비전 (vision)', 
        '기업의 중장기 비전 및 목표, 성장 전략을 구체적으로 서술하세요.', 
        `{ "summary": "1문장 요약", "detail": "미래 전략 및 향후 행보에 대한 매우 구체적인 내용" }`)
    },
    {
      key: 'businessModel',
      prompt: createSubPrompt('비즈니스 모델 (businessModel)', 
        '기업이 돈을 버는 수익 창출 구조와 주요 제품군을 캐시카우 중심으로 구체적으로 서술하세요.', 
        `{ "summary": "1문장 요약", "detail": "수익 모델 및 주요 사업 구조에 대한 매우 구체적인 내용" }`)
    },
    {
      key: 'industryStatus',
      prompt: createSubPrompt('산업 현황 (industryStatus)', 
        '기업이 속한 산업의 현황, 경쟁 구도, 점유율, 규제 등을 구체적으로 서술하세요.', 
        `{ "summary": "1문장 요약", "detail": "업계 동향 및 경쟁사 분석을 포함한 매우 구체적인 내용" }`)
    },
    {
      key: 'swotAnalysis',
      prompt: createSubPrompt('SWOT 분석 (swotAnalysis)', 
        '강점, 약점, 기회, 위협을 각각 상세히 서술하세요.', 
        `{ "strength": "강점 상세 설명", "weakness": "약점 상세 설명", "opportunity": "기회 상세 설명", "threat": "위협 상세 설명" }`)
    },
    {
      key: 'riskOutlook',
      prompt: createSubPrompt('리스크 및 전망 (riskOutlook)', 
        '단/장기 예상되는 잠재적 리스크와 기업의 대응 전망을 구체적으로 서술하세요.', 
        `{ "summary": "1문장 요약", "detail": "잠재적 이슈 및 리스크 관리에 대한 매우 구체적인 내용" }`)
    },
    {
      key: 'financialOverview',
      prompt: createSubPrompt('재무 분석 개요 (financialAnalysis.overview)', 
        '제공된 재무 수치를 바탕으로 재무 건전성 및 실적 추이를 평가하세요.', 
        `{ "summary": "1문장 요약", "detail": "매출, 이익 흐름, 부채 등을 종합한 재무 성과 집중 평가 내용" }`)
    },
    {
      key: 'financialKeyMetrics',
      prompt: createSubPrompt('재무 핵심 지표 (financialAnalysis.keyMetrics)', 
        '제공된 DART 재무 지표를 정확히 일치시켜 JSON 배열(길이 1)로 반환하세요. 앞서 제공된 지표가 없다면 웹 검색 기반 추정치를 기재하세요.', 
        `[ { "revenueGrowth": "매출 성장률 (예: +12.3%)", "operatingMargin": "영업이익률 (예: 8.7%)", "roe": "자기자본이익률 (예: 18.5%)", "debtRatio": "부채비율 (예: 142.0%)", "eps": "주당순이익 (예: 4,250원)" } ]`)
    },
    {
      key: 'recentNews',
      prompt: createSubPrompt('최근 뉴스 (recentNews)', 
        '가장 의미 있고 중요한 최신 메이저 뉴스 2~3개를 선정해 상세 내용을 다루세요.', 
        `[ { "headline": "뉴스 제목", "summary": "1문장 핵심 요약", "detail": "뉴스에서 파생된 영향, 배경 등 상세 내용" }, ... ]`)
    }
  ];

  let completedTasks = 0;
  
  const generatePart = async (task) => {
    const result = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: task.prompt }] }],
        generationConfig: {
          temperature: 0.2
        }
      })
    });
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = extractJson(text);
    if (!jsonStr) throw new Error(`${task.key} 파트를 분석할 수 없습니다.`);
    
    const parsedPart = JSON.parse(jsonStr);
    
    completedTasks++;
    onStatusUpdate?.(`[${companyName}] 서브 엔진 생성 완료 (${completedTasks}/10)`);
    
    return { key: task.key, data: parsedPart };
  };

  // Execute the 10 tasks in parallel
  const partResults = await Promise.all(subTasks.map(generatePart));

  // 💡 마법의 청소기: 뉴스, SWOT, 전망 등 모든 데이터에서 [숫자, 숫자] 형태의 각주를 일괄 삭제합니다.
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

  partResults.forEach(res => {
    const cleanedData = cleanFootnotes(res.data);
    if (res.key === 'macroTrend') reportJson.macroTrend = cleanedData;
    else if (res.key === 'financialOverview') reportJson.report.financialAnalysis.overview = cleanedData;
    else if (res.key === 'financialKeyMetrics') reportJson.report.financialAnalysis.keyMetrics = cleanedData;
    else reportJson.report[res.key] = cleanedData;
  });

  if (dartFinance?.yearlyMetrics) reportJson.dartFinance = dartFinance;
  
  return reportJson;
};
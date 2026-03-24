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
    Conduct an extremely expansive web search using the Google Search tool for the most recent news, macro-economic conditions, stock market trends, product releases, competitor actions, and industry issues regarding '${companyName}'.
    IMPORTANT: You must conduct your search in English, and you MUST write your entire research briefing notes completely in English.
    Combine your extensive web search findings with the provided Korea DART data below to create a remarkably verbose and comprehensive research briefing.
    Include specific facts, raw numbers, exact statistics, executive quotes, and multiple news headlines (in English) so that another AI can use it to write an exhaustive report.
    CRITICAL INSTRUCTION: DO NOT summarize. Output the absolute maximum amount of detail possible (Aim for 3,000 ~ 5,000+ words). Break down every aspect of the company and industry in granular detail.

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
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    })
  });

  const researchBriefing = searchResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!researchBriefing) throw new Error("메인 엔진의 검색 데이터를 읽을 수 없습니다.");

  // --- STAGE 2: 3 Combined Output Engines (gemini-2.5-flash) in Parallel ---
  // API 비용 절감 및 속도 제한 방지를 위해 10개 파트를 3개 그룹으로 묶어 병렬 분석합니다.
  onStatusUpdate?.(`[${companyName}] 서브 엔진(3개 그룹) 병렬 상세 분석 전개 중 (0/3)...`);

  const createGroupPrompt = (groupName, groupInstructions, outputFormat) => `
    당신은 '${companyName}' 기업 분석 보고서를 작성하는 최고의 전문가입니다.
    아래는 메인 리서치 AI가 수집한 방대한 최신 자료(영어)입니다.
    
    [통합 리서치 브리핑]
    ${researchBriefing}
    
    위 자료를 바탕으로 보고서의 [${groupName}] 파트들을 분석하여 한국어로 작성해 주세요. 
    
    ❗분량 및 디테일 강제 준수 (CRITICAL)❗
    당신은 3~4개 파트를 묶어서 처리하지만, 절대 내용을 대충 요약해서는 안 됩니다. 
    각 파트의 'detail' 필드는 현업 애널리스트가 쓰듯 최소 3개의 문단, 500자 이상의 매우 깊이 있고 방대한 리포트로 꽉 채워서 작성해야 합니다!! 내용이 부실하거나 빈약하면 보고서 전체가 반려됩니다.
    
    지시사항: 
    ${groupInstructions}
    
    CRITICAL: 반드시 모든 내용을 완벽하고 일관된 '한국어(Korean)'로 작성해야 합니다!
    CRITICAL: JSON 문자열 내부에 실제 줄바꿈(Enter) 탭(Tab) 등의 제어문자를 절대 사용하지 마세요. (Bad control character 에러 발생) 줄바꿈이 필요하다면 반드시 문자 그대로의 '\\n' 을 명시하세요.
    출력은 반드시 다른 텍스트 없이 아래 JSON 구조만 출력하세요. (마크다운 백틱 등 금지)
    출력 포맷:
    ${outputFormat}
  `;

  const groupTasks = [
    {
      key: 'group1',
      prompt: createGroupPrompt(
        '시장 및 산업 분석 (macroTrend, industryStatus, marketSentiment)',
        `- macroTrend: 기업을 둘러싼 거시 경제적 요인, 시장 트렌드를 구체적으로 서술하세요.
- industryStatus: 기업이 속한 산업의 현황, 경쟁 구도, 점유율, 규제 등을 구체적으로 서술하세요.
- marketSentiment: 현재 주식 시장의 심리와 평가를 3가지 주요 이유를 들어 구체적으로 서술하세요.`,
        `{
  "macroTrend": { "summary": "1문장 핵심 요약", "detail": "매우 구체적이고 깊이 있는 분석 내용" },
  "industryStatus": { "summary": "1문장 요약", "detail": "업계 동향 및 경쟁사 분석을 포함한 매우 구체적인 내용" },
  "marketSentiment": { "status": "Positive/Neutral/Negative 중 택 1", "analysis": ["구체적인 이유 1", "구체적인 이유 2", "구체적인 이유 3"] }
}`
      )
    },
    {
      key: 'group2',
      prompt: createGroupPrompt(
        '비즈니스 & 리스크 전략 (vision, businessModel, swotAnalysis, riskOutlook)',
        `- vision: 기업의 중장기 비전 및 목표, 성장 전략을 구체적으로 서술하세요.
- businessModel: 기업이 돈을 버는 수익 창출 구조와 주요 제품군을 캐시카우 중심으로 구체적으로 서술하세요.
- swotAnalysis: 강점, 약점, 기회, 위협을 각각 요약본과 엄청난 디테일로 분리하여 상세히 분석하세요.
- riskOutlook: 단/장기 예상되는 잠재적 리스크와 기업의 대응 전망을 구체적으로 서술하세요.`,
        `{
  "vision": { "summary": "1문장 요약", "detail": "미래 전략 및 향후 행보에 대한 매우 구체적인 내용" },
  "businessModel": { "summary": "1문장 요약", "detail": "수익 모델 및 주요 사업 구조에 대한 매우 구체적인 내용" },
  "swotAnalysis": { 
    "strength": { "summary": "1~2문장 강점 요약", "detail": "매우 깊고 방대한 강점 상세 분석" },
    "weakness": { "summary": "1~2문장 약점 요약", "detail": "매우 깊고 방대한 약점 상세 분석" },
    "opportunity": { "summary": "1~2문장 기회 요약", "detail": "매우 깊고 방대한 기회 상세 분석" },
    "threat": { "summary": "1~2문장 위협 요약", "detail": "매우 깊고 방대한 위협 상세 분석" }
  },
  "riskOutlook": { "summary": "1문장 요약", "detail": "잠재적 이슈 및 리스크 관리에 대한 매우 구체적인 내용" }
}`
      )
    },
    {
      key: 'group3',
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
          maxOutputTokens: 8192
        }
      })
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = extractJson(text);
    if (!jsonStr) throw new Error(`${task.key} 파트 그룹을 분석할 수 없습니다.`);

    const parsedGroup = JSON.parse(jsonStr);

    completedTasks++;
    onStatusUpdate?.(`[${companyName}] 서브 엔진 완료 (${completedTasks}/3)`);

    return parsedGroup;
  };

  // Execute the 3 groups in parallel
  const groupResults = await Promise.all(groupTasks.map(generateGroup));

  // 💡 마법의 청소기: 각주 일괄 삭제
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

  if (dartFinance?.yearlyMetrics) reportJson.dartFinance = dartFinance;

  return reportJson;
};
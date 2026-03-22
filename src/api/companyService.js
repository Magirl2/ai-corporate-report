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

  onStatusUpdate?.(`[${companyName}] 최신 웹 검색 및 AI 통합 분석 중...`);

  const today = new Date().toLocaleDateString('ko-KR');

  // ✅ [추가 3] DART 실수치를 프롬프트 컨텍스트로 주입, keyMetrics 필드 명시
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

  const prompt = `
    Today's date is ${today}. You must use the Google Search tool to find the most recent news, stock trends, and current events for '${companyName}'.
    Combine this real-time web search data with the following Korea DART data:
    
    [공시 목록]
    ${dartInfo}
    
    [재무 수치]
    ${dartFinanceContext}
    
    CRITICAL: You MUST provide a comprehensive business report filling out EVERY SINGLE FIELD in the JSON format below. Do not leave any field empty or use placeholders like "...".
    
    Output STRICTLY in this JSON format:
    {
      "companyName": "Official Name",
      "macroTrend": { "summary": "요약 1문장", "detail": "상세 분석 내용" },
      "report": {
        "marketSentiment": { "status": "Positive/Neutral/Negative", "analysis": ["이유1", "이유2", "이유3"] },
        "vision": { "summary": "비전 요약 1문장", "detail": "비전 상세 내용" },
        "businessModel": { "summary": "비즈니스 모델 요약 1문장", "detail": "비즈니스 모델 상세 내용" },
        "industryStatus": { "summary": "산업 현황 요약 1문장", "detail": "산업 현황 상세 내용" },
        "swotAnalysis": { "strength": "강점 설명", "weakness": "약점 설명", "opportunity": "기회 설명", "threat": "위협 설명" },
        "riskOutlook": { "summary": "리스크 전망 요약 1문장", "detail": "리스크 전망 상세 내용" },
        "financialAnalysis": {
          "overview": { "summary": "재무 분석 요약 1문장", "detail": "재무 분석 상세 내용" },
          "keyMetrics": [
            {
              "revenueGrowth": "매출 성장률 (예: +12.3%)",
              "operatingMargin": "영업이익률 (예: 8.7%)",
              "roe": "자기자본이익률 (예: 18.5%)",
              "debtRatio": "부채비율 (예: 142.0%)",
              "eps": "주당순이익 (예: 4,250원)"
            }
          ]
        },
        "recentNews": [
          { "headline": "최신 뉴스 제목 1", "summary": "뉴스 요약", "detail": "뉴스 상세 내용" },
          { "headline": "최신 뉴스 제목 2", "summary": "뉴스 요약", "detail": "뉴스 상세 내용" }
        ]
      }
    }
    Translate all content to Korean.
  `;

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0
      }
    })
  });

const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("분석 데이터를 읽을 수 없습니다.");
  
  let parsed = JSON.parse(jsonStr);

  // 💡 마법의 청소기: 뉴스, SWOT, 전망 등 모든 데이터에서 [숫자, 숫자] 형태의 각주를 일괄 삭제합니다.
  const cleanFootnotes = (data) => {
    if (typeof data === 'string') {
      // 텍스트일 경우 각주 패턴과 그 앞의 띄어쓰기를 지웁니다.
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

  // 파싱된 데이터 전체를 청소기에 한 번 돌려 화면으로 보냅니다.
  parsed = cleanFootnotes(parsed);

  if (dartFinance?.yearlyMetrics) parsed.dartFinance = dartFinance;
  return parsed;
};
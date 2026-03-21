import { extractJson } from '../utils/formatters';

// --- 1. DART API 호출 (차단 없는 안전한 프록시 방식으로 교체) ---
const fetchDartDisclosures = async (companyName) => {
  try {
    // 공백 제거 마법 적용
    const dartKey = import.meta.env.VITE_DART_API_KEY?.trim(); 
    if (!dartKey) return "DART API 키가 설정되지 않았습니다.";

    const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${dartKey}&corp_name=${companyName}&page_count=5`;
    // 차단 확률이 적은 allorigins의 /get 방식 사용
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    const proxyData = await response.json();

    if (!proxyData.contents) return "프록시 응답 오류가 발생했습니다.";
    // 문자열로 온 데이터를 다시 JSON으로 변환
    const data = JSON.parse(proxyData.contents);

    if (data.status === "000" && data.list) {
      return data.list.map(d => `- [${d.rcept_dt}] ${d.report_nm}`).join('\n');
    }
    return "해당 기업의 최근 공시 내역이 없거나 한국 상장사가 아닙니다.";
  } catch (error) {
    console.error("DART API 에러:", error);
    return "공시 정보를 가져오는 중 에러가 발생했습니다.";
  }
};

// --- 2. API 재시도 로직 ---
const fetchWithRetry = async (url, options, retries = 5) => {
  let delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429) throw new Error("RATE_LIMIT");
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (err.message === "RATE_LIMIT" || i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// --- 3. 핵심 분석 실행 ---
export const fetchCompanyData = async (companyName, onStatusUpdate) => {
  // 🚨 404 에러의 주범인 '보이지 않는 공백'을 .trim()으로 강제 제거!
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini API 키가 설정되지 않았습니다.");

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  onStatusUpdate?.(`[${companyName}] DART 전자공시 데이터 수집 중...`);
  const dartInfo = await fetchDartDisclosures(companyName);

  onStatusUpdate?.(`[${companyName}] AI 통합 분석 및 리포트 작성 중...`);

  const prompt = `
    Analyze the company: '${companyName}'.
    
    [Official DART Disclosures Data from Korea]:
    ${dartInfo}

    Provide a comprehensive business report in JSON format.
    Include:
    1. Macro trends impacting them.
    2. Market sentiment (Positive, Neutral, Negative) with 3 reasons.
    3. Core business model and vision.
    4. Financial health metrics for the last 3 years (Growth, Margin, Debt, ROE, EPS).
    5. Two recent significant news headlines. (If it's a Korean company, you MUST analyze and include the 'Official DART Disclosures Data' provided above in this section).
    6. Future risks and outlook.

    Response must be ONLY JSON in this structure:
    {
      "companyName": "Official Name",
      "macroTrend": { "summary": "Short summary", "detail": "Longer detail" },
      "report": {
        "marketSentiment": { "status": "Positive/Neutral/Negative", "analysis": ["Reason 1", "Reason 2", "Reason 3"] },
        "vision": { "summary": "...", "detail": "..." },
        "businessModel": { "summary": "...", "detail": "..." },
        "industryStatus": { "summary": "...", "detail": "..." },
        "financialAnalysis": {
          "overview": { "summary": "...", "detail": "..." },
          "keyMetrics": [
            { "year": "2024", "revenueGrowth": "X%", "operatingMargin": "X%", "debtRatio": "X%", "roe": "X%", "eps": "X" }
          ]
        },
        "recentNews": [
          { "headline": "Title", "summary": "Summary", "detail": "Detail" }
        ],
        "marketRiskAndOutlook": { "summary": "...", "detail": "..." }
      }
    }
    Translate all text content to Korean.
  `;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }]
  };

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("분석 결과를 처리할 수 없습니다.");
  return JSON.parse(jsonStr);
};
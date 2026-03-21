import { extractJson } from '../utils/formatters';

const fetchDartDisclosures = async (companyName) => {
  try {
    const dartKey = import.meta.env.VITE_DART_API_KEY?.trim(); 
    if (!dartKey) return "DART API 키가 설정되지 않았습니다.";
    const url = `/api/dart?crtfc_key=${dartKey}&corp_name=${companyName}&page_count=5`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "000" && data.list) {
      return data.list.map(d => `- [${d.rcept_dt}] ${d.report_nm}`).join('\n');
    }
    return "최근 공시 내역이 없거나 비상장사입니다.";
  } catch (error) {
    console.error("DART API 에러:", error);
    return "공시 정보를 가져오지 못했습니다.";
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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  onStatusUpdate?.(`[${companyName}] DART 공시 수집 중...`);
  const dartInfo = await fetchDartDisclosures(companyName);

  onStatusUpdate?.(`[${companyName}] AI 통합 심층 분석 중...`);
  const prompt = `
    Analyze '${companyName}' using DART data: ${dartInfo}. 
    Provide a comprehensive business report strictly in the following JSON format:
    {
      "companyName": "Official Name",
      "macroTrend": { "summary": "요약", "detail": "상세내용" },
      "report": {
        "marketSentiment": { "status": "Positive/Neutral/Negative", "analysis": ["이유1", "이유2", "이유3"] },
        "vision": { "summary": "...", "detail": "..." },
        "businessModel": { "summary": "...", "detail": "..." },
        "industryStatus": { "summary": "...", "detail": "..." },
        "swotAnalysis": { "strength": "...", "weakness": "...", "opportunity": "...", "threat": "..." },
        "financialAnalysis": { "overview": { "summary": "...", "detail": "..." } },
        "recentNews": [{ "headline": "제목", "summary": "요약", "detail": "상세" }]
      }
    }
    Translate all content to Korean.
  `;

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("데이터 해석 오류");
  return JSON.parse(jsonStr);
};
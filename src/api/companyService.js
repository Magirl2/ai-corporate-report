// src/api/companyService.js
import { extractJson } from '../utils/formatters';

const fetchDartDisclosures = async (companyName) => {
  try {
    const dartKey = import.meta.env.VITE_DART_API_KEY?.trim();
    if (!dartKey) return "DART API 키가 설정되지 않았습니다.";

    // ✅ 필수: 브라우저 환경에서 한글 회사명이 깨지지 않도록 인코딩
    const encodedName = encodeURIComponent(companyName);
    const url = `/api/dart?crtfc_key=${dartKey}&corp_name=${encodedName}&page_count=5`;
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  onStatusUpdate?.(`[${companyName}] DART 공시 데이터 수집 중...`);
  const dartInfo = await fetchDartDisclosures(companyName);

  onStatusUpdate?.(`[${companyName}] 최신 웹 검색 및 AI 통합 분석 중...`);
  
  const today = new Date().toLocaleDateString('ko-KR'); 
  
  // 1️⃣ 프롬프트에서 주석(//)을 모두 제거했습니다.
  const prompt = `
    Today's date is ${today}. You must use the Google Search tool to find the most recent news, stock trends, and current events for '${companyName}'.
    Combine this real-time web search data with the following Korea DART data: ${dartInfo}. 
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
        "riskOutlook": { "summary": "...", "detail": "..." },
        "financialAnalysis": { "overview": { "summary": "...", "detail": "..." } },
        "recentNews": [{ "headline": "제목", "summary": "요약", "detail": "상세" }]
      }
    }
    Translate all content to Korean.
  `;

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      contents: [{ parts: [{ text: prompt }] }],
      // ✅ 실시간 웹 검색 도구는 그대로 유지합니다.
      tools: [{ googleSearch: {} }],
      generationConfig: {
        // ❌ 에러의 주범인 responseMimeType 줄은 완전히 삭제하세요!
        
        // ✅ 대신 글이 중간에 끊기지 않도록 출력 토큰(단어) 수를 최대치로 넉넉하게 늘려줍니다.
        maxOutputTokens: 16834,
        // ✅ 답변을 더 기계적이고(JSON 형식 파괴 방지) 일관되게 만들도록 온도(창의성)를 낮춥니다.
        temperature: 0.2 
      }
    })
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("분석 데이터를 읽을 수 없습니다.");
  return JSON.parse(jsonStr);
};
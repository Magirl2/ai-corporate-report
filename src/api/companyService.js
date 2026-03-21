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

  onStatusUpdate?.(`[${companyName}] AI 통합 심층 분석 중...`);
  const prompt = `
    Analyze '${companyName}' using Korea DART data: ${dartInfo}. 
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
        "riskOutlook": { "summary": "...", "detail": "..." }, // ✅ 이 줄을 새로 추가했습니다!
        "financialAnalysis": { "overview": { "summary": "...", "detail": "..." } },
        "recentNews": [{ "headline": "제목", "summary": "요약", "detail": "상세" }]
      }
    }
    Translate all content to Korean.
  `;

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // ✅ 에러를 유발하던 404 주범(tools 옵션) 제거! AI가 자체 데이터 + DART 데이터만으로 분석합니다.
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  const jsonStr = extractJson(text);
  if (!jsonStr) throw new Error("분석 데이터를 읽을 수 없습니다.");
  return JSON.parse(jsonStr);
};
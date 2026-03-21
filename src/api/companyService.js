import { extractJson } from '../utils/formatters';

const fetchDartDisclosures = async (companyName) => {
  try {
    const dartKey = import.meta.env.VITE_DART_API_KEY?.trim();
    if (!dartKey) return "DART API 키가 설정되지 않았습니다.";

    // ✅ 수정 1: 한글 회사명을 안전하게 인코딩 (013 에러 방지)
    const encodedName = encodeURIComponent(companyName);
    const url = `/api/dart?crtfc_key=${dartKey}&corp_name=${encodedName}&page_count=5`;
    
    const response = await fetch(url);

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      return "DART API 응답 오류입니다.";
    }
    
    const data = await response.json();

    // DART 특유의 성공 코드 "000" 확인
    if (data.status === "000" && data.list) {
      return data.list.map(d => `- [${d.rcept_dt}] ${d.report_nm}`).join('\n');
    }
    // 데이터가 없는 경우(013 등) 처리
    return `최근 공시 내역이 없습니다. (DART 응답: ${data.message || '데이터 없음'})`;
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
  // v1beta 엔드포인트 유지
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  onStatusUpdate?.(`[${companyName}] DART 공시 데이터 수집 중...`);
  const dartInfo = await fetchDartDisclosures(companyName);

  onStatusUpdate?.(`[${companyName}] AI 통합 심층 분석 중...`);
  const prompt = `
    Analyze '${companyName}' using Korea DART data: ${dartInfo}. 
    Provide a comprehensive business report strictly in JSON format.
    Translate all content to Korean.
  `;

  const result = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      contents: [{ parts: [{ text: prompt }] }],
      // ✅ 수정 2: 정확한 툴 명칭 사용 (google_search_retrieval)
      tools: [{ google_search_retrieval: {} }],
      // ✅ 추가 3: 안정적인 JSON 응답을 위해 설정 추가
      generationConfig: {
        response_mime_type: "application/json"
      }
    })
  });

  // Gemini의 응답 구조에 맞춰 텍스트 추출
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error("분석 데이터를 생성하지 못했습니다.");

  try {
    // generationConfig 덕분에 바로 JSON.parse가 가능할 확률이 높습니다.
    return JSON.parse(text);
  } catch (e) {
    // 만약 마크다운 형식이 포함되었다면 기존 추출기 사용
    const jsonStr = extractJson(text);
    if (!jsonStr) throw new Error("JSON 추출 실패");
    return JSON.parse(jsonStr);
  }
};
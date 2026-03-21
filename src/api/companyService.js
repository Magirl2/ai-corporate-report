// src/api/companyService.js

// --- 1. DART API 호출 (allorigins 대신 안전한 자체 프록시 사용) ---
const fetchDartDisclosures = async (companyName) => {
  try {
    const dartKey = import.meta.env.VITE_DART_API_KEY?.trim(); 
    if (!dartKey) return "DART API 키가 설정되지 않았습니다.";

    // 💡 CORS 에러의 원인이었던 복잡한 allorigins 프록시를 지우고, Vercel/Vite 프록시 경로를 사용합니다.
    const url = `/api/dart?crtfc_key=${dartKey}&corp_name=${companyName}&page_count=5`;

    const response = await fetch(url);
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

// --- 2. API 재시도 헬퍼 함수 ---
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
};

// --- JSON 텍스트 추출 헬퍼 함수 ---
const extractJson = (text) => {
  if (!text) return null;
  const match = text.match(/
http://googleusercontent.com/immersive_entry_chip/0

### ⚠️ 주의사항 (아주 중요!)
위 코드의 DART 프록시가 정상적으로 작동하려면 이전 답변에서 말씀드린 **`vercel.json` 파일 생성**과 **`vite.config.js` 파일 수정**이 반드시 함께 되어 있어야 합니다. 

이 3가지를 모두 마치셨다면 GitHub에 올려주세요! 코드가 아주 멋지게 동작할 것입니다.
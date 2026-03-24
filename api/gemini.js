export default async function handler(req, res) {
  // 1. CORS 설정 (웹 브라우저에서 이 API를 호출할 수 있도록 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 브라우저의 사전 요청(Preflight)에 대한 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. POST 요청만 허용됩니다.' });
  }

  try {
    // 2. Vercel 서버 환경변수에서 API 키 읽어오기 (보안 핵심!)
    // 주의: VITE_ 접두사가 붙지 않은 GEMINI_API_KEY를 사용해야 합니다.
    const apiKey = process.env.GEMINI_API_KEY; 
    
    if (!apiKey) {
      console.error('서버에 API 키가 없습니다.');
      return res.status(500).json({ error: 'Gemini API 키가 서버에 설정되지 않았습니다.' });
    }

    // 3. 클라이언트가 요청한 모델명 확인 API 엔드포인트 주소 구성
    let model = req.body.model || 'gemini-2.5-flash'; 
    
    // Google API 페이로드에서 model 필드 제거
    const payload = { ...req.body };
    delete payload.model;

    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const MAX_RETRIES = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // 4. 프론트엔드에서 받은 데이터를 구글 서버로 전달
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // 성공 시 즉시 반환 (5. 성공적으로 받은 결과를 프론트엔드로 다시 전달)
      if (response.ok) {
        return res.status(200).json(data);
      }

      // 구글 API에서 에러를 반환했을 경우의 처리
      // 503(Service Unavailable) 또는 429(Too Many Requests) 에러 발생 시 재시도 수행
      if (response.status === 503 || response.status === 429) {
        console.warn(`Gemini API Error ${response.status} (attempt ${attempt}/${MAX_RETRIES}):`, data.error?.message);
        
        if (attempt < MAX_RETRIES) {
          // 마지막 재시도 시에는 수요가 적은 flash 모델로 폴백 시도
          if (attempt === MAX_RETRIES - 1) {
            console.warn('Retrying with gemini-2.5-flash as fallback...');
            model = 'gemini-2.5-flash';
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // 지수 백오프 대기 시간 증가
          continue; // 다음 시도로 이동
        }
      }

      // 재시도 대상 에러가 아니거나 최대 재시도 횟수를 초과한 경우 에러 반환
      console.error('Gemini API Error:', data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Gemini API 호출에 실패했습니다.' 
      });
    }
    
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: '서버 통신 중 알 수 없는 오류가 발생했습니다.' });
  }
}
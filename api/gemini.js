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

    // 3. 구글 Gemini API 엔드포인트 주소 구성
    // (기존 프론트엔드에서 사용하시던 모델명으로 변경하셔도 됩니다. 예: gemini-1.5-flash)
    const model = 'gemini-2.5-pro'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 4. 프론트엔드에서 받은 데이터(req.body)를 그대로 구글 서버로 전달
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // 구글 API에서 에러를 반환했을 경우의 처리
    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(response.status).json({ 
        error: data.error?.message || 'Gemini API 호출에 실패했습니다.' 
      });
    }

    // 5. 성공적으로 받은 결과를 프론트엔드로 다시 전달
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: '서버 통신 중 알 수 없는 오류가 발생했습니다.' });
  }
}
// ✅ Vercel 무료 플랜 최대 실행 시간인 60초로 연장 (기본값 10초)
export const maxDuration = 60;

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

    const MAX_RETRIES = 5;
    let delay = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        // HTML 에러 페이지 방어 (응답이 JSON인지 확인)
        const contentType = response.headers.get('content-type') || '';
        let data = {};
        
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.warn(`[Gemini Proxy] 응답이 JSON이 아닙니다. (상태: ${response.status}) 내용 중략:`, text.substring(0, 100));
          data = { error: { message: `비정상적인 응답 (HTML/텍스트). 상태 코드: ${response.status}` } };
        }

        // 성공 시 즉시 반환
        if (response.ok) {
          return res.status(200).json(data);
        }

        // 503(Service Unavailable), 429(Too Many Requests), 500 등 서버측 에러 시 재시도 수행
        if ([500, 502, 503, 504, 429].includes(response.status)) {
          console.warn(`[Gemini Proxy] API Error ${response.status} (attempt ${attempt}/${MAX_RETRIES}):`, data.error?.message);

          if (attempt < MAX_RETRIES) {
            // 마지막 2번의 재시도 시에는 수요가 적은 flash 모델로 자동 폴백 시도
            if (attempt >= MAX_RETRIES - 2) {
              console.warn(`[Gemini Proxy] 모델 부하 의심. gemini-2.5-flash로 강제 폴백(Fallback) 시도...`);
              model = 'gemini-2.5-flash';
              url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            }

            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5; // 너무 길게 기다리지 않도록 1.5배수로 조절
            continue;
          }
        }

        // 재시도 대상 에러가 아니거나 최대 재시도 횟수를 초과한 경우 에러 반환
        console.error('[Gemini Proxy] 최종 에러 반환:', data);
        return res.status(response.status).json({
          error: data.error?.message || 'Gemini API 호출에 실패했습니다.'
        });
      } catch (fetchErr) {
        console.warn(`[Gemini Proxy] 네트워크/Fetch 레벨 에러 (attempt ${attempt}/${MAX_RETRIES}):`, fetchErr.message);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }
        throw fetchErr;
      }
    }

  } catch (error) {
    console.error('Gemini proxy error:', error);
    return res.status(500).json({ error: '서버 통신 중 알 수 없는 오류가 발생했습니다.' });
  }
}
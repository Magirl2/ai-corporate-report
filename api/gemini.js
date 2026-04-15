// api/gemini.js
// ✅ Vercel 무료 플랜 최대 실행 시간인 60초로 연장 (기본값 10초)
export const maxDuration = 60;

export default async function handler(req, res) {
  // 1. CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. POST 요청만 허용됩니다.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('서버에 GEMINI_API_KEY가 없습니다.');
      return res.status(500).json({ error: 'Gemini API 키가 서버에 설정되지 않았습니다.' });
    }

    let model = req.body.model || 'gemini-2.5-flash';
    const payload = { ...req.body };
    delete payload.model;

    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 💡 최적화: 재시도 4회, 초기 대기 500ms (기존 5회, 1000ms)
    // Pro 503 시 2번째 시도부터 flash로 즉시 폴백해 대기 시간을 최소화
    const MAX_RETRIES = 4;
    let delay = 500;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const contentType = response.headers.get('content-type') || '';
        let data = {};

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.warn(`[Gemini Proxy] 비JSON 응답 (status: ${response.status}):`, text.substring(0, 100));
          data = { error: { message: `비정상 응답. 상태 코드: ${response.status}` } };
        }

        if (response.ok) {
          return res.status(200).json(data);
        }

        // 503/429/500: 재시도
        if ([500, 502, 503, 504, 429].includes(response.status)) {
          console.warn(`[Gemini Proxy] API ${response.status} (attempt ${attempt}/${MAX_RETRIES}):`, data.error?.message);

          if (attempt < MAX_RETRIES) {
            // 💡 2번째 시도부터 flash로 폴백 (기존 4번째→2번째로 앞당김)
            if (attempt >= 2 && !model.includes('flash')) {
              console.warn(`[Gemini Proxy] gemini-2.5-flash로 폴백...`);
              model = 'gemini-2.5-flash';
              url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 1.5;
            continue;
          }
        }

        console.error('[Gemini Proxy] 최종 에러:', data);
        return res.status(response.status).json({
          error: data.error?.message || 'Gemini API 호출에 실패했습니다.'
        });

      } catch (fetchErr) {
        console.warn(`[Gemini Proxy] 네트워크 에러 (attempt ${attempt}/${MAX_RETRIES}):`, fetchErr.message);
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
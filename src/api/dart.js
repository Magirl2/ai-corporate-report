// api/dart.js - Vercel 서버리스 함수 (DART API 프록시)
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 클라이언트로부터 받은 쿼리 파라미터를 그대로 DART API에 전달
    const params = new URLSearchParams(req.query).toString();
    const dartUrl = `https://opendart.fss.or.kr/api/list.json?${params}`;

    const response = await fetch(dartUrl);

    // DART API가 JSON이 아닌 응답을 돌려줄 경우를 대비
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('DART API non-JSON response:', text.slice(0, 200));
      return res.status(502).json({ error: 'DART API가 유효하지 않은 응답을 반환했습니다.' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('DART proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
}
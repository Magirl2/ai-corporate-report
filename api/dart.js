// api/dart.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Vercel 환경에서 안전하게 쿼리스트링 추출
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    
    // 2. DART API 필수 요건: 회사명 검색 시 '시작일(bgn_de)'이 무조건 있어야 함!
    if (!searchParams.has('bgn_de')) {
      searchParams.append('bgn_de', '20240101'); 
    }

    const dartUrl = `https://opendart.fss.or.kr/api/list.json?${searchParams.toString()}`;

    const response = await fetch(dartUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)',
        'Accept': 'application/json',
      }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'DART API가 유효하지 않은 응답을 반환했습니다.' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('DART proxy error:', error);
    // 에러 상세 내용을 볼 수 있도록 details 추가
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}
// api/dart.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    
    // 💡 핵심: 오늘 기준 정확히 3개월 전 날짜 계산
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    };

    // DART API 규칙: 고유번호 없이 회사명 검색 시 최대 3개월까지만 조회 가능
    if (!searchParams.has('bgn_de')) {
      searchParams.append('bgn_de', formatDate(threeMonthsAgo)); 
    }
    if (!searchParams.has('end_de')) {
      searchParams.append('end_de', formatDate(today)); 
    }

    // 💡 누락된 API 키 파라미터 강제 주입
    searchParams.append('crtfc_key', process.env.DART_API_KEY);

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
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}
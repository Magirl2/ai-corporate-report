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
    
    // 💡 주요 기업 고유번호 매핑 (dart-finance.js와 동일)
    // corp_name 대신 corp_code를 사용해야 정확한 기업의 공시만 반환됩니다.
    const COMMON_CORPS = {
      '삼성전자': '00126380',
      'SK하이닉스': '00164779',
      '현대자동차': '00164742',
      'LG에너지솔루션': '01515350',
      '기아': '00164788',
      '카카오': '00258801',
      'NAVER': '00266961'
    };

    const corpName = searchParams.get('corp_name');
    const corpCode = corpName ? COMMON_CORPS[corpName] : null;

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

    // 💡 corp_code가 있으면 corp_name 대신 사용 (정확한 필터링)
    if (corpCode) {
      searchParams.delete('corp_name');
      searchParams.append('corp_code', corpCode);
    }

    // 💡 Vercel 환경 변수 명칭 불일치 방어 (DART_API_KEY vs VITE_DART_API_KEY)
    const DART_API_KEY = process.env.DART_API_KEY || process.env.VITE_DART_API_KEY || "98c7f5eef7673f915ae614cb61a339afa5684fa3";
    if (!DART_API_KEY) throw new Error('DART_API_KEY is missing');
    searchParams.append('crtfc_key', DART_API_KEY);

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

    // 💡 핵심: 검색한 기업과 정확히 일치하는 공시만 필터링
    if (corpName && data.status === '000' && data.list) {
      data.list = data.list.filter(item => item.corp_name === corpName);
      if (data.list.length === 0) {
        data.status = '013';
        data.message = `'${corpName}'의 최근 3개월 내 DART 공시 정보가 없어 출력하지 않았습니다.`;
      }
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('DART proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}
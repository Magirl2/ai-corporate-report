// api/dart.js — 기업 공시 목록 조회 (유사 기업명 자동 매칭)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const DART_API_KEY = process.env.DART_API_KEY || '98c7f5eef7673f915ae614cb61a339afa5684fa3';
    if (!DART_API_KEY) throw new Error('DART_API_KEY is missing');

    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const corpName     = searchParams.get('corp_name') || '';
    const pageCount    = searchParams.get('page_count') || '5';

    if (!corpName) {
      return res.status(400).json({ error: 'corp_name 파라미터가 필요합니다.' });
    }

    // ─── 기업명 정규화 & 키워드 추출 (dart-finance.js와 동일한 로직) ────────
    const normalizeName = (name) =>
      name
        .replace(/\s*(주식회사|㈜|\(주\)|그룹)\s*/gi, '')
        .replace(/\s+/g, '')
        .trim();

    const INDUSTRY_SUFFIXES = [
      '제약', '전자', '바이오', '케미칼', '화학', '건설', '증권', '은행',
      '금융', '생명', '화재', '보험', '에너지', '철강', '자동차', '오일',
      '가스', '통신', '홀딩스', '엔터', '미디어', '푸드', '푸즈', '식품',
      '물산', '산업', '개발', '기공', '공업', '상사', '로직스', '로지스틱스',
    ];
    const extractKeyword = (name) => {
      for (const s of INDUSTRY_SUFFIXES) {
        if (name.endsWith(s) && name.length > s.length) return name.slice(0, -s.length);
      }
      return name;
    };

    const normalized = normalizeName(corpName);
    const keyword    = extractKeyword(normalized);
    const firstToken = corpName.trim().split(/\s+/)[0];

    // ─── COMMON_CORPS 즉시 탐색 ─────────────────────────────────────────────
    const COMMON_CORPS = {
      '삼성전자': '00126380', 'SK하이닉스': '00164779',
      '현대자동차': '00164742', '기아': '00164788', '현대모비스': '00164815',
      'LG에너지솔루션': '01515350', '삼성SDI': '00126371', 'LG화학': '00401706',
      'SK이노베이션': '00126421', 'POSCO홀딩스': '00432584', '포스코홀딩스': '00432584',
      '셀트리온': '00421045', '삼성바이오로직스': '00877059',
      'LG전자': '00401731', 'LG디스플레이': '00201111', 'LG생활건강': '00366474',
      '한국전력': '00104894', 'NAVER': '00266961', '네이버': '00266961',
      '카카오': '00258801', '카카오뱅크': '01316289', '카카오페이': '01185458',
      'KB금융': '00679551', '신한지주': '00382199', '우리금융지주': '01016767', '하나금융지주': '00547223',
      '삼성생명': '00115440', '삼성화재': '00126362', '삼성물산': '00126256',
      'SK텔레콤': '00429904', 'SKT': '00429904', 'SK': '00164842', 'KT': '00781904', 'LG유플러스': '00869061',
      '현대건설': '00164753', '두산에너빌리티': '00264660', '한화솔루션': '00115592', '대한항공': '00114007',
    };

    let resolvedCorpCode = COMMON_CORPS[corpName] || COMMON_CORPS[normalized] || COMMON_CORPS[keyword] || null;
    let resolvedCorpName = corpName; // 실제 DART 등록 기업명 (매칭 결과로 업데이트됨)

    // ─── STEP 1: COMMON_CORPS에 없으면 유사 검색으로 corpCode 탐색 ────────────
    if (!resolvedCorpCode) {
      const today = new Date();

      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${dd}`;
      };

      const candidates = [...new Set([normalized, keyword, firstToken])].filter(s => s && s.length >= 2);

      // 2개 윈도우 × 다수 후보 병렬 조회
      const windows = Array.from({ length: 2 }, (_, i) => {
        const end   = new Date(today);
        end.setMonth(today.getMonth() - i * 3);
        const start = new Date(end);
        start.setMonth(end.getMonth() - 3);
        return { bgn: formatDate(start), end: formatDate(end) };
      });

      const scoreCorp = (item) => {
        const n = normalizeName(item.corp_name || '');
        if (n === normalized)                              return 4;
        if (n.startsWith(normalized))                      return 3;
        if (normalized.startsWith(n) && n.length >= 2)    return 3;
        if (n.startsWith(keyword) && keyword.length >= 2)  return 2;
        if (keyword.startsWith(n) && n.length >= 2)        return 2;
        if (n.includes(keyword) && keyword.length >= 2)    return 1;
        return 0;
      };

      const allSearches = candidates.flatMap(c => windows.map(w => ({ c, w })));
      const allResults  = await Promise.all(
        allSearches.map(({ c, w }) =>
          fetch(
            `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
            `&corp_name=${encodeURIComponent(c)}&bgn_de=${w.bgn}&end_de=${w.end}&page_count=100`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          ).then(r => r.json()).catch(() => ({ status: 'error' }))
        )
      );

      let bestScore = 0;
      let bestCorp  = null;
      for (const result of allResults) {
        if (result.status !== '000' || !result.list?.length) continue;
        for (const item of result.list) {
          const s = scoreCorp(item);
          if (s > bestScore) { bestScore = s; bestCorp = item; }
        }
      }

      if (bestCorp && bestScore >= 1) {
        resolvedCorpCode = bestCorp.corp_code;
        resolvedCorpName = bestCorp.corp_name;
        console.log(`[DART disclosure] "${corpName}" → "${resolvedCorpName}" (score:${bestScore})`);
      }
    }

    // ─── STEP 2: corpCode로 공시 목록 조회 ──────────────────────────────────
    // corpCode가 있으면 날짜 제한 없이 조회 가능
    const today         = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}${m}${dd}`;
    };

    let dartUrl;
    if (resolvedCorpCode) {
      // corp_code가 있으면 날짜 제한이 더 느슨하게 적용됨 → 6개월로 확장
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      dartUrl =
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
        `&corp_code=${resolvedCorpCode}&bgn_de=${fmt(sixMonthsAgo)}&end_de=${fmt(today)}&page_count=${pageCount}`;
    } else {
      // corpCode를 못 찾은 경우 corp_name + 3개월로 폴백
      dartUrl =
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
        `&corp_name=${encodeURIComponent(normalized)}&bgn_de=${fmt(threeMonthsAgo)}&end_de=${fmt(today)}&page_count=${pageCount}`;
    }

    const response = await fetch(dartUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)', 'Accept': 'application/json' }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json({ error: 'DART API가 유효하지 않은 응답을 반환했습니다.' });
    }

    const data = await response.json();

    // 매칭된 기업명과 실제 공시 기업명이 다를 수 있으므로 유사도 기준 필터링
    if (data.status === '000' && data.list) {
      if (resolvedCorpCode) {
        // corp_code로 조회 시 이미 정확하므로 필터 불필요
      } else {
        // corp_name 검색 시 유사 기업만 유지
        data.list = data.list.filter(item => {
          const n = normalizeName(item.corp_name || '');
          return n === normalized || n.startsWith(keyword) || n.includes(keyword);
        });
        if (data.list.length === 0) {
          data.status = '013';
          data.message = `'${corpName}'의 최근 공시 정보가 없습니다.`;
        }
      }
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('DART proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}
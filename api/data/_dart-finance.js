// api/dart-finance.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const DART_API_KEY = process.env.DART_API_KEY || '98c7f5eef7673f915ae614cb61a339afa5684fa3';

  if (!DART_API_KEY) {
    return res.status(500).json({ error: 'DART API 인증 키가 설정되어 있지 않습니다.' });
  }

  try {
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const corpName = searchParams.get('corp_name');

    if (!corpName) {
      return res.status(400).json({ error: 'corp_name 파라미터가 필요합니다.' });
    }

    // ─── COMMON_CORPS: 자주 검색되는 기업 corp_code 하드코딩 ───────────────
    const COMMON_CORPS = {
      '삼성전자':       '00126380',
      'SK하이닉스':     '00164779',
      '현대자동차':     '00164742',
      '기아':           '00164788',
      '현대모비스':     '00164815',
      'LG에너지솔루션': '01515350',
      '삼성SDI':        '00126371',
      'LG화학':         '00401706',
      'SK이노베이션':   '00126421',
      'POSCO홀딩스':    '00432584',
      '포스코홀딩스':   '00432584',
      '셀트리온':       '00421045',
      '삼성바이오로직스': '00877059',
      'LG전자':         '00401731',
      'LG디스플레이':    '00201111',
      'LG생활건강':     '00366474',
      '한국전력':       '00104894',
      'NAVER':          '00266961',
      '네이버':         '00266961',
      '카카오':         '00258801',
      '카카오뱅크':     '01316289',
      '카카오페이':     '01185458',
      'KB금융':         '00679551',
      '신한지주':       '00382199',
      '우리금융지주':   '01016767',
      '하나금융지주':   '00547223',
      '삼성생명':       '00115440',
      '삼성화재':       '00126362',
      '삼성물산':       '00126256',
      'SK텔레콤':       '00429904',
      'SKT':            '00429904',
      'SK':             '00164842',
      'KT':             '00781904',
      'LG유플러스':     '00869061',
      '현대건설':       '00164753',
      '두산에너빌리티': '00264660',
      '한화솔루션':     '00115592',
      '대한항공':       '00114007',
    };

    // ─── 기업명 정규화 & 키워드 추출 ─────────────────────────────────────────
    // 1) 법인구분어 제거 + 공백 제거
    const normalizeName = (name) =>
      name
        .replace(/\s*(주식회사|㈜|\(주\)|그룹)\s*/gi, '')
        .replace(/\s+/g, '')   // "삼천당 제약" → "삼천당제약"
        .trim();

    // 2) 업종 접미사 제거 — 핵심 키워드 추출
    //    "삼천당제약" → "삼천당" / "현대건설" → "현대건설" (일치 없으면 그대로)
    const INDUSTRY_SUFFIXES = [
      '제약', '전자', '바이오', '케미칼', '화학', '건설', '증권', '은행',
      '금융', '생명', '화재', '보험', '에너지', '철강', '자동차', '오일',
      '가스', '통신', '홀딩스', '엔터', '미디어', '푸드', '푸즈', '식품',
      '물산', '산업', '개발', '기공', '공업', '상사', '로직스', '로지스틱스',
    ];
    const extractKeyword = (name) => {
      for (const s of INDUSTRY_SUFFIXES) {
        if (name.endsWith(s) && name.length > s.length) {
          return name.slice(0, -s.length);
        }
      }
      return name;
    };

    // 검색 후보 생성
    const normalized = normalizeName(corpName);          // "삼천당 제약" → "삼천당제약"
    const keyword    = extractKeyword(normalized);        // "삼천당제약"  → "삼천당"
    const firstToken = corpName.trim().split(/\s+/)[0];  // "삼천당 제약"  → "삼천당"

    // COMMON_CORPS 즉시 탐색 (API 호출 없이)
    let corpCode =
      COMMON_CORPS[corpName]   ||
      COMMON_CORPS[normalized] ||
      COMMON_CORPS[keyword]    ||
      null;

    const today = new Date();

    if (!corpCode) {
      // ─── STEP 1: 복수 후보 × 2개 시간 윈도우 병렬 조회 ─────────────────
      // 후보 중복 제거 + 2자 미만 제거
      const candidates = [...new Set([normalized, keyword, firstToken])]
        .filter(s => s && s.length >= 2);

      const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}${m}${dd}`;
      };

      // 최근 3개월 × 2 윈도우 = 최근 6개월 커버 (DART 3개월 제한 준수)
      const windows = Array.from({ length: 2 }, (_, i) => {
        const end   = new Date(today);
        end.setMonth(today.getMonth() - i * 3);
        const start = new Date(end);
        start.setMonth(end.getMonth() - 3);
        return { bgn: formatDate(start), end: formatDate(end) };
      });

      // 점수 함수: DART 기업명 ↔ 사용자 입력 매칭 품질 (높을수록 좋음)
      const scoreCorp = (item) => {
        const n = normalizeName(item.corp_name || '');
        if (n === normalized)                              return 4; // 정규화 완전 일치
        if (n.startsWith(normalized))                      return 3; // 정규화 시작 일치
        if (normalized.startsWith(n) && n.length >= 2)    return 3;
        if (n.startsWith(keyword) && keyword.length >= 2)  return 2; // 키워드 시작 일치
        if (keyword.startsWith(n) && n.length >= 2)        return 2;
        if (n.includes(keyword)   && keyword.length >= 2)  return 1; // 키워드 포함
        return 0;
      };

      // 후보 × 윈도우 모든 조합 병렬 조회
      const allSearches = candidates.flatMap(c => windows.map(w => ({ c, w })));
      const allResults  = await Promise.all(
        allSearches.map(({ c, w }) =>
          fetch(
            `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
            `&corp_name=${encodeURIComponent(c)}&bgn_de=${w.bgn}&end_de=${w.end}&page_count=100`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          .then(r => r.json())
          .catch(() => ({ status: 'error' }))
        )
      );

      // 모든 결과에서 점수 최고 기업 선택
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
        corpCode = bestCorp.corp_code;
        console.log(`[DART] "${corpName}" → "${bestCorp.corp_name}" (score:${bestScore}, code:${corpCode})`);
      }
    }

    if (!corpCode) {
      return res.status(404).json({
        error: `'${corpName}'의 DART 공시 정보를 찾지 못했습니다. 정확한 기업명을 입력하거나 한국 상장사인지 확인해 주세요.`
      });
    }

    // ─── STEP 2: 최근 5개 연도 재무제표 병렬 조회 ───────────────────────────
    const currentYear = today.getFullYear();
    const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

    const fetchYear = async (year) => {
      const base =
        `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json` +
        `?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`;

      const r = await fetch(base + '&fs_div=CFS', { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const data = await r.json();

      if (data.status !== '000' || !data.list?.length) {
        const fallback = await fetch(base + '&fs_div=OFS', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const fb = await fallback.json();
        return { year, list: fb.list || [] };
      }
      return { year, list: data.list };
    };

    const results = await Promise.all(years.map(fetchYear));

    const validResults = results
      .filter(r => r.list && r.list.length > 0)
      .sort((a, b) => b.year - a.year);

    // ─── STEP 3: 연도별 원시 수치 추출 ──────────────────────────────────────
    const rawByYear = {};
    for (const { year, list } of validResults) {
      const find = (names, sj_divs, accountIds = []) =>
        list.find(r =>
          ((r.account_id && accountIds.includes(r.account_id)) ||
            names.some(n => r.account_nm && r.account_nm.trim().startsWith(n))) &&
          (!sj_divs || sj_divs.includes(r.sj_div))
        );

      const toNum = (str) => (str ? parseInt(str.replace(/,/g, ''), 10) : NaN);

      const rev = find(['매출액', '수익(매출액)', '수익'], ['IS', 'CIS'], ['ifrs-full_Revenue', 'ifrs_Revenue']);
      const op  = find(['영업이익', '영업이익(손실)'], ['IS', 'CIS'], ['dart_OperatingIncomeLoss']);
      const net = find(['당기순이익', '당기순이익(손실)', '연결당기순이익'], ['IS', 'CIS'], ['ifrs-full_ProfitLoss', 'ifrs_ProfitLoss']);
      const eq  = find(['자본총계'], ['BS'], ['ifrs-full_Equity', 'ifrs_Equity']);
      const lb  = find(['부채총계'], ['BS'], ['ifrs-full_Liabilities', 'ifrs_Liabilities']);

      rawByYear[year] = {
        revenue:     toNum(rev?.thstrm_amount),
        opIncome:    toNum(op?.thstrm_amount),
        netInc:      toNum(net?.thstrm_amount),
        equity:      toNum(eq?.thstrm_amount),
        liab:        toNum(lb?.thstrm_amount),
        revenueRaw:  rev?.thstrm_amount || '-',
        opIncomeRaw: op?.thstrm_amount  || '-',
        netIncRaw:   net?.thstrm_amount || '-',
        equityRaw:   eq?.thstrm_amount  || '-',
        liabRaw:     lb?.thstrm_amount  || '-',
      };
    }

    // ─── STEP 4: 표시용 3개 연도 지표 계산 ──────────────────────────────────
    const validYears = validResults.map(r => r.year);
    if (validYears.length === 0) {
      return res.status(404).json({ error: '최근 5년간의 재무제표 데이터를 찾을 수 없습니다.' });
    }

    const displayYears = validYears.slice(0, 3);
    const pct     = (v, base) => (base !== 0 && !isNaN(v) && !isNaN(base)) ? `${((v - base) / Math.abs(base) * 100).toFixed(1)}%` : null;
    const margin  = (num, den) => (den !== 0 && !isNaN(num) && !isNaN(den)) ? `${(num / den * 100).toFixed(1)}%` : null;

    const yearlyMetrics = displayYears.map((year) => {
      const cur  = rawByYear[year]     || {};
      const prev = rawByYear[year - 1] || {};
      return {
        year,
        revenueGrowth:   prev.revenue ? pct(cur.revenue, prev.revenue) : null,
        operatingMargin: margin(cur.opIncome, cur.revenue),
        roe:             margin(cur.netInc, cur.equity),
        debtRatio:       margin(cur.liab, cur.equity),
        raw: {
          revenue:   cur.revenueRaw,
          opIncome:  cur.opIncomeRaw,
          netIncome: cur.netIncRaw,
          equity:    cur.equityRaw,
          liab:      cur.liabRaw,
        }
      };
    });

    return res.status(200).json({
      corpName,
      bsnsYear:    String(displayYears[0]),
      keyMetrics: {
        revenueGrowth:   yearlyMetrics[0].revenueGrowth,
        operatingMargin: yearlyMetrics[0].operatingMargin,
        roe:             yearlyMetrics[0].roe,
        debtRatio:       yearlyMetrics[0].debtRatio,
      },
      raw:         yearlyMetrics[0].raw,
      yearlyMetrics,
    });

  } catch (error) {
    console.error('DART finance proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}
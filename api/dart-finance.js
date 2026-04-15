// api/dart-finance.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 💡 Vercel 환경 변수에서는 접두사가 있을 수도, 없을 수도 있으므로 둘 다 체크하여 호환성을 확보합니다.
  const DART_API_KEY = process.env.DART_API_KEY || process.env.VITE_DART_API_KEY || "98c7f5eef7673f915ae614cb61a339afa5684fa3"; // .env의 기본값 폴백 포함
  
  if (!DART_API_KEY) {
    console.error('CRITICAL: DART_API_KEY가 설정되어 있지 않습니다.');
    return res.status(500).json({ error: 'DART API 인증 키가 설정되어 있지 않습니다. 관리자에게 문의하세요.' });
  }

  try {
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const corpName = searchParams.get('corp_name');

    if (!corpName) {
      return res.status(400).json({ error: 'corp_name 파라미터가 필요합니다.' });
    }

    // ─── COMMON_CORPS: 자주 검색되는 기업 corp_code 하드코딩 (API 호출 없이 즉시 반환) ───
    const COMMON_CORPS = {
      // 반도체·IT
      '삼성전자': '00126380',
      'SK하이닉스': '00164779',
      // 자동차
      '현대자동차': '00164742',
      '기아': '00164788',
      '현대모비스': '00164815',
      // 배터리·소재
      'LG에너지솔루션': '01515350',
      '삼성SDI': '00126371',
      'LG화학': '00401706',
      'SK이노베이션': '00126421',
      'POSCO홀딩스': '00432584',
      '포스코홀딩스': '00432584',
      // 바이오·헬스
      '셀트리온': '00421045',
      '삼성바이오로직스': '00877059',
      // 전자·전기
      'LG전자': '00401731',
      '한국전력': '00104894',
      // IT·플랫폼
      'NAVER': '00266961',
      '네이버': '00266961',
      '카카오': '00258801',
      '카카오뱅크': '01316289',
      // 금융
      'KB금융': '00679551',
      '신한지주': '00382199',
      '하나금융지주': '00547223',
      '우리금융지주': '01016767',
      '삼성생명': '00115440',
      // 통신
      'SK텔레콤': '00429904',
      'SKT': '00429904',
      'KT': '00781904',
      'LG유플러스': '00869061',
      // 건설·에너지
      '현대건설': '00164753',
      '두산에너빌리티': '00264660',
    };

    // 입력 기업명 정규화 (주식회사, ㈜ 등 제거)
    const normalizeName = (name) =>
      name.replace(/\s*(주식회사|㈜|\(주\))\s*/g, '').trim();
    const normalized = normalizeName(corpName);

    // COMMON_CORPS에서 정규화된 이름으로도 탐색
    let corpCode =
      COMMON_CORPS[corpName] ||
      COMMON_CORPS[normalized] ||
      null;

    const today = new Date();

    if (!corpCode) {
      // ─── STEP 1: 3개월 윈도우 4개를 병렬 조회 ───────────
      // DART list.json은 한 번 호출에 최대 3개월만 허용하지만,
      // 윈도우 4개(총 12개월)를 동시에 보내면 제한 내에서 더 많은 기간을 커버합니다.
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}${m}${d}`;
      };

      // 3개월 단위 4개 윈도우 생성 (최신 순)
      const windows = Array.from({ length: 4 }, (_, i) => {
        const endDate = new Date(today);
        endDate.setMonth(today.getMonth() - i * 3);
        const startDate = new Date(endDate);
        startDate.setMonth(endDate.getMonth() - 3);
        return { bgn: formatDate(startDate), end: formatDate(endDate) };
      });

      // 최고 매칭 점수 함수 (0~3: 높을수록 좋은 매칭)
      const scoreCorp = (item) => {
        const n = item.corp_name || '';
        const normN = normalizeName(n);
        if (n === corpName || normN === normalized) return 3;           // 완전 일치
        if (n.startsWith(corpName) || corpName.startsWith(n)) return 2;  // 시작 일치
        if (n.startsWith(normalized) || normalized.startsWith(normN)) return 2;
        if (n.includes(normalized) || normalized.includes(normN)) return 1; // 포함 일치
        return 0;
      };

      // 4개 윈도우 병렬 조회 → 결과 병합 후 최고 매칭 반환
      const windowResults = await Promise.all(
        windows.map(w =>
          fetch(
            `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
            `&corp_name=${encodeURIComponent(normalized)}&bgn_de=${w.bgn}&end_de=${w.end}&page_count=100`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          )
          .then(r => r.json())
          .catch(() => ({ status: 'error' }))
        )
      );

      let bestScore = 0;
      let bestCorp = null;
      for (const result of windowResults) {
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
      return res.status(404).json({ error: `'${corpName}'의 DART 공시 정보를 찾지 못했습니다. 정확한 기업명을 입력하거나 한국 상장사인지 확인하세요.` });
    }


    // ─── STEP 2: 최근 5개 연도 재무제표 병렬 조회 (데이터 있는 연도 동적 선택) ───
    const currentYear = today.getFullYear();
    // 가장 최신의 3개 연도를 보여주기 위해 넉넉히 5년치를 조회 (당해 연도가 아직 안 나왔을 수 있으므로)
    const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5];

    const fetchYear = async (year) => {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json` +
        `?crtfc_key=${DART_API_KEY}` +
        `&corp_code=${corpCode}` +
        `&bsns_year=${year}` +
        `&reprt_code=11011` +
        `&fs_div=CFS`;

      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' }
      });
      const data = await r.json();

      if (data.status !== '000' || !data.list?.length) {
        const fallback = await fetch(url.replace('fs_div=CFS', 'fs_div=OFS'), {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const fallbackData = await fallback.json();
        return { year, list: fallbackData.list || [] };
      }
      return { year, list: data.list };
    };

    const results = await Promise.all(years.map(fetchYear));

    // 실제 공시 데이터가 존재하는 연도만 필터링 후 최신순 정렬
    const validResults = results
      .filter(r => r.list && r.list.length > 0)
      .sort((a, b) => b.year - a.year);

    // ─── STEP 3: 연도별 원시 수치 추출 ──────────────────────────────────
    const rawByYear = {};
    for (const { year, list } of validResults) {
      // 💡 핵심 수정: 재무제표 구분(sj_div)을 명시적으로 필터링하여 엉뚱한 표(예: 자본변동표 등)에서 값을 가져오는 오류를 방지합니다.
      // BS: 재무상태표, IS: 손익계산서, CIS: 포괄손익계산서
      const find = (names, sj_divs, accountIds = []) => list.find(r => 
        ( (r.account_id && accountIds.includes(r.account_id)) || names.some(n => r.account_nm && r.account_nm.trim().startsWith(n)) ) && 
        (!sj_divs || sj_divs.includes(r.sj_div))
      );
      
      // 값이 없을 때 0이 아닌 NaN(숫자 아님)으로 처리하여 억지 계산을 방지합니다.
      const toNum = (str) => str ? parseInt(str.replace(/,/g, ''), 10) : NaN;

      const rev = find(['매출액', '수익(매출액)', '수익'], ['IS', 'CIS'], ['ifrs-full_Revenue', 'ifrs_Revenue']);
      const op  = find(['영업이익', '영업이익(손실)'], ['IS', 'CIS'], ['dart_OperatingIncomeLoss']);
      const net = find(['당기순이익', '당기순이익(손실)', '연결당기순이익', '연결당기순이익(손실)'], ['IS', 'CIS'], ['ifrs-full_ProfitLoss', 'ifrs_ProfitLoss']);
      const eq  = find(['자본총계'], ['BS'], ['ifrs-full_Equity', 'ifrs_Equity']);
      const lb  = find(['부채총계'], ['BS'], ['ifrs-full_Liabilities', 'ifrs_Liabilities']);

      rawByYear[year] = {
        revenue:     toNum(rev?.thstrm_amount),
        opIncome:    toNum(op?.thstrm_amount),
        netInc:      toNum(net?.thstrm_amount),
        equity:      toNum(eq?.thstrm_amount),
        liab:        toNum(lb?.thstrm_amount),
        revenueRaw:  rev?.thstrm_amount    || '-',
        opIncomeRaw: op?.thstrm_amount  || '-',
        netIncRaw:   net?.thstrm_amount || '-',
        equityRaw:   eq?.thstrm_amount  || '-',
        liabRaw:     lb?.thstrm_amount  || '-',
      };
    }
    // ─── STEP 4: 표시용 3개 연도 지표 계산 ───────────────────────────────
    const validYears = validResults.map(r => r.year);
    if (validYears.length === 0) {
      return res.status(404).json({ error: '최근 5년간의 재무제표 데이터를 찾을 수 없습니다.' });
    }
    const displayYears = validYears.slice(0, 3);

    const yearlyMetrics = displayYears.map((year) => {
      const cur  = rawByYear[year]     || {};
      const prev = rawByYear[year - 1] || {};

      const pct = (v, base) =>
        base !== 0 && !isNaN(v) && !isNaN(base) ? `${((v - base) / Math.abs(base) * 100).toFixed(1)}%` : null;

      const calcMargin = (num, den) => 
        (den !== 0 && !isNaN(num) && !isNaN(den)) ? `${(num / den * 100).toFixed(1)}%` : null;

      return {
        year,
        revenueGrowth:   prev.revenue ? pct(cur.revenue, prev.revenue) : null,
        operatingMargin: calcMargin(cur.opIncome, cur.revenue),
        roe:             calcMargin(cur.netInc, cur.equity),
        debtRatio:       calcMargin(cur.liab, cur.equity),
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
      bsnsYear: String(displayYears[0]),
      keyMetrics: {
        revenueGrowth:   yearlyMetrics[0].revenueGrowth,
        operatingMargin: yearlyMetrics[0].operatingMargin,
        roe:             yearlyMetrics[0].roe,
        debtRatio:       yearlyMetrics[0].debtRatio,
      },
      raw: yearlyMetrics[0].raw,
      yearlyMetrics,
    });

  } catch (error) {
    console.error('DART finance proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}
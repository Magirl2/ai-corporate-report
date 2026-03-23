// api/dart-finance.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const DART_API_KEY = process.env.DART_API_KEY;

  try {
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const corpName = searchParams.get('corp_name');

    if (!corpName) {
      return res.status(400).json({ error: 'corp_name 파라미터가 필요합니다.' });
    }

    // ─── STEP 1: list.json으로 corp_code 우회 조회 (3개월 제한 준수) ──────────
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    };

    let corpCode = null;
    let bgnDe = formatDate(threeMonthsAgo);
    let endDe = formatDate(today);

    // 최근 3개월 조회
    let listRes = await fetch(
      `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}&corp_name=${encodeURIComponent(corpName)}&bgn_de=${bgnDe}&end_de=${endDe}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' } }
    );
    let listData = await listRes.json();

    if (listData.status === '000' && listData.list?.length > 0) {
      corpCode = listData.list[0].corp_code;
    } else {
      // 💡 안정성 추가: 최근 3개월 내에 공시가 없다면, 3~6개월 전 데이터로 한 번 더 시도
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      bgnDe = formatDate(sixMonthsAgo);
      endDe = formatDate(threeMonthsAgo);
      
      listRes = await fetch(
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}&corp_name=${encodeURIComponent(corpName)}&bgn_de=${bgnDe}&end_de=${endDe}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      listData = await listRes.json();
      
      if (listData.status === '000' && listData.list?.length > 0) {
        corpCode = listData.list[0].corp_code;
      }
    }

    if (!corpCode) {
      return res.status(404).json({ error: `'${corpName}'에 해당하는 기업을 찾을 수 없거나 최근 6개월 내 공시가 없습니다.` });
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
      const find = (names, sj_divs) => list.find(r => names.includes(r.account_nm) && (!sj_divs || sj_divs.includes(r.sj_div)));
      
      // 값이 없을 때 0이 아닌 NaN(숫자 아님)으로 처리하여 억지 계산을 방지합니다.
      const toNum = (str) => str ? parseInt(str.replace(/,/g, ''), 10) : NaN;

      const rev = find(['매출액', '수익(매출액)'], ['IS', 'CIS']);
      const op  = find(['영업이익', '영업이익(손실)'], ['IS', 'CIS']);
      const net = find(['당기순이익', '당기순이익(손실)', '연결당기순이익', '연결당기순이익(손실)'], ['IS', 'CIS']);
      const eq  = find(['자본총계'], ['BS']);
      const lb  = find(['부채총계'], ['BS']);

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

      return {
        year,
        revenueGrowth:   prev.revenue ? pct(cur.revenue, prev.revenue) : null,
        operatingMargin: cur.revenue  ? `${(cur.opIncome / cur.revenue * 100).toFixed(1)}%` : null,
        roe:             cur.equity   ? `${(cur.netInc   / cur.equity  * 100).toFixed(1)}%` : null,
        debtRatio:       cur.equity   ? `${(cur.liab     / cur.equity  * 100).toFixed(1)}%` : null,
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
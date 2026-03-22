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

    // ─── STEP 2: 최근 4개 연도 재무제표 병렬 조회 ───────────────────────
    const currentYear = today.getFullYear();
    const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

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

    // ─── STEP 3: 연도별 원시 수치 추출 ──────────────────────────────────
    const rawByYear = {};
    for (const { year, list } of results) {
      const find = (nm) => list.find(r => r.account_nm === nm);
      const toNum = (str) => parseInt((str || '0').replace(/,/g, ''), 10);

      rawByYear[year] = {
        revenue:     toNum(find('매출액')?.thstrm_amount),
        opIncome:    toNum(find('영업이익')?.thstrm_amount),
        netInc:      toNum(find('당기순이익')?.thstrm_amount),
        equity:      toNum(find('자본총계')?.thstrm_amount),
        liab:        toNum(find('부채총계')?.thstrm_amount),
        revenueRaw:  find('매출액')?.thstrm_amount    || '-',
        opIncomeRaw: find('영업이익')?.thstrm_amount  || '-',
        netIncRaw:   find('당기순이익')?.thstrm_amount || '-',
        equityRaw:   find('자본총계')?.thstrm_amount  || '-',
        liabRaw:     find('부채총계')?.thstrm_amount  || '-',
      };
    }

    // ─── STEP 4: 표시용 3개 연도 지표 계산 ───────────────────────────────
    const displayYears = years.slice(0, 3);
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
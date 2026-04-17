// api/dart-finance.js
import { resolveCorpCode } from '../_lib/dart-utils.js';

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

    // ─── STEP 1: 통합 유틸리티를 통한 기업 코드 탐색 ────────────────────────────
    const resolution = await resolveCorpCode(corpName, DART_API_KEY);
    
    if (!resolution?.corpCode) {
      return res.status(404).json({
        error: `'${corpName}'의 DART 공시 정보를 찾지 못했습니다. 정확한 기업명을 입력하거나 한국 상장사인지 확인해 주세요.`
      });
    }

    const corpCode = resolution.corpCode;
    const today = new Date();

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
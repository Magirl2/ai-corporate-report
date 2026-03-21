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

    // ─── STEP 1: 회사명으로 corp_code 조회 (corpSearch → 첫 번째 결과 사용) ──
    const corpUrl = `https://opendart.fss.or.kr/api/corpSearch.json?crtfc_key=${DART_API_KEY}&corp_name=${encodeURIComponent(corpName)}&page_count=1`;
    const corpRes = await fetch(corpUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' }
    });

    if (!corpRes.ok) {
      return res.status(502).json({ error: 'DART 기업 조회에 실패했습니다.' });
    }

    const corpData = await corpRes.json();

    // corpSearch.json은 list 배열로 반환
    if (corpData.status !== '000' || !corpData.list?.length) {
      return res.status(404).json({ error: `'${corpName}'에 해당하는 기업을 찾을 수 없습니다.` });
    }

    const corpCode = corpData.list[0].corp_code;

    // ─── STEP 2: 재무제표 조회 ────────────────────────────────────────
    // bsns_year: 직전 사업연도, reprt_code: 11011 = 사업보고서(연간)
    // fs_div: CFS = 연결재무제표, OFS = 별도재무제표
    const bsnsYear = String(new Date().getFullYear() - 1); // 전년도 기준
    const financeUrl = `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json` +
      `?crtfc_key=${DART_API_KEY}` +
      `&corp_code=${corpCode}` +
      `&bsns_year=${bsnsYear}` +
      `&reprt_code=11011` +   // 사업보고서
      `&fs_div=CFS`;          // 연결재무제표 우선

    const finRes = await fetch(financeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' }
    });

    if (!finRes.ok) {
      return res.status(502).json({ error: 'DART 재무제표 조회에 실패했습니다.' });
    }

    const finData = await finRes.json();

    // 연결재무제표 없으면 별도재무제표로 재시도
    if (finData.status !== '000' || !finData.list?.length) {
      const fallbackUrl = financeUrl.replace('fs_div=CFS', 'fs_div=OFS');
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' }
      });
      const fallbackData = await fallbackRes.json();
      return res.status(200).json(extractMetrics(fallbackData.list || [], corpName, bsnsYear));
    }

    return res.status(200).json(extractMetrics(finData.list, corpName, bsnsYear));

  } catch (error) {
    console.error('DART finance proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}

// ─── 필요한 지표만 추출하는 헬퍼 함수 ──────────────────────────────────────
function extractMetrics(list, corpName, bsnsYear) {
  // account_nm 기준으로 항목을 찾는 유틸
  const find = (nm) => list.find(r => r.account_nm === nm);

  const revenue      = find('매출액');
  const revenuePrev  = find('매출액');   // 전기 thstrm_amount vs frmtrm_amount
  const operatingPL  = find('영업이익');
  const netIncome    = find('당기순이익');
  const totalAssets  = find('자산총계');
  const totalLiab    = find('부채총계');
  const totalEquity  = find('자본총계');

  const toNum = (str) => parseInt((str || '0').replace(/,/g, ''), 10);

  const revenueThis  = toNum(revenue?.thstrm_amount);
  const revenuePast  = toNum(revenue?.frmtrm_amount);   // 전기 매출
  const opIncome     = toNum(operatingPL?.thstrm_amount);
  const netInc       = toNum(netIncome?.thstrm_amount);
  const equity       = toNum(totalEquity?.thstrm_amount);
  const liab         = toNum(totalLiab?.thstrm_amount);

  // 매출 성장률
  const revenueGrowth = revenuePast !== 0
    ? `${((revenueThis - revenuePast) / Math.abs(revenuePast) * 100).toFixed(1)}%`
    : null;

  // 영업이익률
  const operatingMargin = revenueThis !== 0
    ? `${(opIncome / revenueThis * 100).toFixed(1)}%`
    : null;

  // ROE (자기자본이익률)
  const roe = equity !== 0
    ? `${(netInc / equity * 100).toFixed(1)}%`
    : null;

  // 부채비율
  const debtRatio = equity !== 0
    ? `${(liab / equity * 100).toFixed(1)}%`
    : null;

  return {
    corpName,
    bsnsYear,
    keyMetrics: {
      revenueGrowth,
      operatingMargin,
      roe,
      debtRatio,
    },
    // 원본 금액도 포함 (Gemini 프롬프트에 컨텍스트로 넘길 용도)
    raw: {
      revenue:  revenue?.thstrm_amount  || '-',
      opIncome: operatingPL?.thstrm_amount || '-',
      netIncome: netIncome?.thstrm_amount  || '-',
      equity:   totalEquity?.thstrm_amount || '-',
      liab:     totalLiab?.thstrm_amount   || '-',
    }
  };
}
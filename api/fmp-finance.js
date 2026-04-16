export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.FMP_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'FMP API 키가 설정되어 있지 않습니다.' });
  }

  try {
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return res.status(400).json({ error: 'ticker 파라미터가 필요합니다.' });
    }

    const incUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=4&apikey=${apiKey}`;
    const balUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=4&apikey=${apiKey}`;

    const [incRes, balRes] = await Promise.all([
      fetch(incUrl),
      fetch(balUrl)
    ]);

    if (!incRes.ok || !balRes.ok) {
      console.error('FMP API 오류:', incRes.status, balRes.status);
      return res.status(500).json({ error: 'FMP API 연동 중 오류가 발생했습니다.' });
    }

    const incData = await incRes.json();
    const balData = await balRes.json();

    if (!Array.isArray(incData) || !Array.isArray(balData) || incData.length === 0 || balData.length === 0) {
      return res.status(404).json({ error: '재무제표 데이터를 찾을 수 없습니다.' });
    }

    const rawByYear = {};
    for (let i = 0; i < Math.max(incData.length, balData.length); i++) {
      const inc = incData[i] || {};
      const bal = balData[i] || {};
      const year = inc.calendarYear || bal.calendarYear || (new Date().getFullYear() - i).toString();
      
      const rev = inc.revenue || 0;
      const op = inc.operatingIncome || 0;
      const net = inc.netIncome || 0;
      const eq = bal.totalStockholdersEquity || bal.totalEquity || 0;
      const liab = bal.totalLiabilities || 0;

      rawByYear[year] = {
        year,
        revenue: rev,
        opIncome: op,
        netInc: net,
        equity: eq,
        liab: liab,
        revenueRaw: rev.toLocaleString(),
        opIncomeRaw: op.toLocaleString(),
        netIncRaw: net.toLocaleString(),
        equityRaw: eq.toLocaleString(),
        liabRaw: liab.toLocaleString(),
      };
    }

    const validYears = Object.keys(rawByYear).sort((a, b) => b - a);
    const displayYears = validYears.slice(0, 3);
    const displayYearData = displayYears.map(year => rawByYear[year]);

    const yearlyMetrics = displayYearData.map((cur) => {
      const prevYearStr = (parseInt(cur.year) - 1).toString();
      const prev = rawByYear[prevYearStr] || {};
      const curRev = cur.revenue;
      const prevRev = prev.revenue;
      const revGrowth = prevRev ? ((curRev - prevRev) / Math.abs(prevRev)) * 100 : 0;
      const opMargin = curRev ? (cur.opIncome / curRev) * 100 : 0;
      const roe = cur.equity ? (cur.netInc / cur.equity) * 100 : 0;
      const debtRatio = cur.equity ? (cur.liab / cur.equity) * 100 : 0;

      return {
        year: cur.year,
        revenueGrowth: revGrowth ? `${revGrowth > 0 ? '+' : ''}${revGrowth.toFixed(1)}%` : null,
        operatingMargin: opMargin ? `${opMargin.toFixed(1)}%` : null,
        roe: roe ? `${roe.toFixed(1)}%` : null,
        debtRatio: debtRatio ? `${debtRatio.toFixed(1)}%` : null,
        raw: {
          revenue: cur.revenueRaw,
          opIncome: cur.opIncomeRaw,
          netIncome: cur.netIncRaw,
          equity: cur.equityRaw,
          liab: cur.liabRaw,
        }
      };
    });

    if (yearlyMetrics.length === 0) {
      return res.status(404).json({ error: '재무제표 데이터를 파싱할 수 없습니다.' });
    }

    return res.status(200).json({
      bsnsYear: yearlyMetrics[0].year,
      raw: {
        ...yearlyMetrics[0].raw,
        currency: incData[0]?.reportedCurrency || 'USD'
      },
      keyMetrics: {
        revenueGrowth: yearlyMetrics[0].revenueGrowth || '데이터 없음',
        operatingMargin: yearlyMetrics[0].operatingMargin || '데이터 없음',
        roe: yearlyMetrics[0].roe || '데이터 없음',
        debtRatio: yearlyMetrics[0].debtRatio || '데이터 없음',
      },
      yearlyMetrics
    });

  } catch (error) {
    console.error('FMP finance proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}

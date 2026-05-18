import { createErrorResponse, ErrorCategory } from '../../errors.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const apiKey = process.env.FMP_API_KEY;

    if (!apiKey) {
      return res.status(500).json(createErrorResponse(ErrorCategory.INTERNAL, 'CONFIG_ERROR', 'FMP API 키가 설정되어 있지 않습니다.'));
    }

    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const ticker = searchParams.get('ticker');

    if (!ticker) {
      return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'BAD_REQUEST', 'ticker 파라미터가 필요합니다.'));
    }

    const incUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=4&apikey=${apiKey}`;
    const balUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=4&apikey=${apiKey}`;
    const incQUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=1&apikey=${apiKey}`;
    const balQUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=quarter&limit=1&apikey=${apiKey}`;

    const fetchWithTimeout = (url, ms = 10000) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ms);
      return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    };

    const [incRes, balRes, incQRes, balQRes] = await Promise.all([
      fetchWithTimeout(incUrl),
      fetchWithTimeout(balUrl),
      fetchWithTimeout(incQUrl),
      fetchWithTimeout(balQUrl),
    ]);

    if (!incRes.ok || !balRes.ok) {
      console.error('FMP API 오류:', incRes.status, balRes.status);
      return res.status(502).json(createErrorResponse(ErrorCategory.UPSTREAM, 'FMP_API_ERROR', 'FMP API 연동 중 오류가 발생했습니다.'));
    }

    const incData = await incRes.json();
    const balData = await balRes.json();

    if (!Array.isArray(incData) || !Array.isArray(balData) || incData.length === 0 || balData.length === 0) {
      return res.status(404).json(createErrorResponse(ErrorCategory.UPSTREAM, 'NO_FMP_DATA', '재무제표 데이터를 찾을 수 없습니다.'));
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

    const incQData = incQRes.ok ? await incQRes.json() : [];
    const balQData = balQRes.ok ? await balQRes.json() : [];

    let quarterlyEntry = null;
    if (Array.isArray(incQData) && incQData.length > 0) {
      const incQ = incQData[0];
      const balQ = Array.isArray(balQData) && balQData.length > 0 ? balQData[0] : {};
      const periodLabel = incQ.period || 'Q?';
      const yearLabel = `${incQ.calendarYear || new Date().getFullYear()} ${periodLabel}`;

      const rev = incQ.revenue || 0;
      const op  = incQ.operatingIncome || 0;
      const net = incQ.netIncome || 0;
      const eq  = balQ.totalStockholdersEquity || balQ.totalEquity || 0;
      const liab = balQ.totalLiabilities || 0;
      const qMgn = (num, den) => den ? `${(num / den * 100).toFixed(1)}%` : null;

      quarterlyEntry = {
        year: yearLabel,
        isQuarterly: true,
        revenueGrowth: null,
        operatingMargin: rev ? qMgn(op, rev) : null,
        roe:             eq  ? qMgn(net, eq)  : null,
        debtRatio:       eq  ? qMgn(liab, eq) : null,
        raw: {
          revenue:   rev.toLocaleString(),
          opIncome:  op.toLocaleString(),
          netIncome: net.toLocaleString(),
          equity:    eq.toLocaleString(),
          liab:      liab.toLocaleString(),
          currency:  incQ.reportedCurrency || 'USD',
          period:    periodLabel,
        },
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

    const annualMetrics = yearlyMetrics; // already built above
    const allMetrics = [
      ...(quarterlyEntry ? [quarterlyEntry] : []),
      ...annualMetrics,
    ];

    if (annualMetrics.length === 0) {
      return res.status(404).json(createErrorResponse(ErrorCategory.UPSTREAM, 'NO_FMP_DATA', '재무제표 데이터를 파싱할 수 없습니다.'));
    }

    const displayEntry = quarterlyEntry || annualMetrics[0];

    return res.status(200).json({
      bsnsYear: quarterlyEntry ? quarterlyEntry.year : annualMetrics[0].year,
      raw: {
        ...(displayEntry.raw),
        currency: displayEntry.raw.currency || incData[0]?.reportedCurrency || 'USD',
      },
      keyMetrics: {
        revenueGrowth:   annualMetrics[0].revenueGrowth   || '데이터 없음',
        operatingMargin: displayEntry.operatingMargin     || '데이터 없음',
        roe:             displayEntry.roe                 || '데이터 없음',
        debtRatio:       displayEntry.debtRatio           || '데이터 없음',
      },
      yearlyMetrics: allMetrics,
    });

  } catch (error) {
    console.error('FMP finance proxy error:', error);
    return res.status(500).json(createErrorResponse(ErrorCategory.INTERNAL, 'INTERNAL_ERROR', '서버 내부 오류가 발생했습니다.'));
  }
}

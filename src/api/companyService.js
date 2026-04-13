import { extractJson } from '../utils/formatters';
import { SisyphusOrchestrator } from './sisyphusOrchestrator';

export const fetchDartDisclosures = async (companyName) => {
  try {
    const encodedName = encodeURIComponent(companyName);
    const url = `/api/dart?corp_name=${encodedName}&page_count=5`;
    const response = await fetch(url);

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      console.error('DART API 오류 응답:', response.status);
      return "DART API 응답 오류입니다. 잠시 후 다시 시도해 주세요.";
    }
    const data = await response.json();

    if (data.status === "000" && data.list) {
      return data.list.map(d => `- [${d.rcept_dt}] ${d.report_nm}`).join('\n');
    }
    return "해당 기업의 최근 공시 내역이 없거나 한국 상장사가 아닙니다.";
  } catch (error) {
    console.error("DART API 에러:", error);
    return "공시 정보를 가져오는 중 에러가 발생했습니다.";
  }
};

// DART 재무제표 수치 가져오기
export const fetchDartFinance = async (companyName) => {
  try {
    const encodedName = encodeURIComponent(companyName);
    const response = await fetch(`/api/dart-finance?corp_name=${encodedName}`);

    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      console.error('DART Finance API 오류:', response.status);
      return null;
    }
    return await response.json(); // { keyMetrics, raw, bsnsYear }
  } catch (error) {
    console.error("DART Finance 에러:", error);
    return null;
  }
};

const US_TICKER_MAP = {
  '애플': 'AAPL',
  '엔비디아': 'NVDA',
  '테슬라': 'TSLA',
  '마이크로소프트': 'MSFT',
  '구글': 'GOOGL',
  '알파벳': 'GOOGL',
  '아마존': 'AMZN',
  '메타': 'META',
  '페이스북': 'META',
  '넷플릭스': 'NFLX',
  '에이엠디': 'AMD',
  '인텔': 'INTC',
  '퀄컴': 'QCOM',
  '브로드컴': 'AVGO',
  '티에스엠씨': 'TSM',
  '에이에스엠엘': 'ASML',
  '코인베이스': 'COIN',
  '팔란티어': 'PLTR',
  '마이크론': 'MU',
  '슈퍼마이크로컴퓨터': 'SMCI',
  '일라이릴리': 'LLY',
  '노보노디스크': 'NVO',
  '월마트': 'WMT',
  '코스트코': 'COST',
  '제이피모건': 'JPM',
  '뱅크오브아메리카': 'BAC',
  '비자': 'V',
  '마스터카드': 'MA',
  '존슨앤존슨': 'JNJ',
  '유나이티드헬스': 'UNH',
  '쿠팡': 'CPNG',
  '버크셔해서웨이': 'BRK.B',
  '암': 'ARM'
};

export const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, 1500));
    }
  }
};

const detectTickerByAI = async (companyName) => {
  const url = `/api/gemini`;
  const prompt = `
Task: Identify the stock exchange of "${companyName}".
If it is a South Korean company traded on KRX (KOSPI/KOSDAQ, e.g., 삼성전자, 카카오), output EXACTLY the word: KOREAN
If it is a US or global company traded on US exchanges (e.g., Apple, Nvidia, 조비 에비에이션), output EXACTLY its official US ticker symbol (e.g., AAPL, NVDA, JOBY).
DO NOT output any markdown, punctuation, or thinking blocks. Output ONLY the uppercase ticker or the word KOREAN.
`;
  try {
    const result = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 100
        }
      })
    });
    
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (text.toUpperCase().includes('KOREAN')) return 'KOREAN';

    const words = text.match(/\b[A-Z0-9-]{1,8}\b/g);
    if (words && words.length > 0) {
      return words[words.length - 1].toUpperCase();
    }

    return text.trim().toUpperCase();
  } catch (error) {
    console.error("AI Ticker detection failed", error);
  }
  return null;
};

export const resolveTicker = async (companyName) => {
  const trimmedName = companyName.trim();
  const upperName = trimmedName.toUpperCase();
  
  if (US_TICKER_MAP[trimmedName]) return { type: 'US', ticker: US_TICKER_MAP[trimmedName] };
  if (US_TICKER_MAP[upperName]) return { type: 'US', ticker: US_TICKER_MAP[upperName] };

  if (/^[A-Z]{1,6}$/.test(upperName) && !/[가-힣]/.test(trimmedName)) {
    return { type: 'US', ticker: upperName };
  }

  const aiResult = await detectTickerByAI(trimmedName);
  if (aiResult === 'KOREAN') {
    return { type: 'KR', ticker: null };
  } else if (aiResult && /^[A-Z0-9-]{1,8}$/.test(aiResult) && aiResult !== 'UNKNOWN') {
    return { type: 'US', ticker: aiResult };
  }

  if (/[가-힣]/.test(trimmedName)) return { type: 'KR', ticker: null };
  return { type: 'US', ticker: upperName };
};

// FMP 재무제표 수치 가져오기 (미국 주식용)
export const fetchFmpFinance = async (ticker) => {
  try {
    const apiKey = import.meta.env.VITE_FMP_API_KEY;
    if (!apiKey) {
      console.error("FMP API 키가 없습니다.");
      return null;
    }
    
    const incUrl = `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=4&apikey=${apiKey}`;
    const balUrl = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=4&apikey=${apiKey}`;
    
    const [incRes, balRes] = await Promise.all([
      fetch(incUrl),
      fetch(balUrl)
    ]);

    if (!incRes.ok || !balRes.ok) {
      console.error('FMP API 오류:', incRes.status, balRes.status);
      return null;
    }

    const incData = await incRes.json();
    const balData = await balRes.json();

    if (!Array.isArray(incData) || !Array.isArray(balData) || incData.length === 0 || balData.length === 0) {
      return null;
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

    if (yearlyMetrics.length === 0) return null;

    return {
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
    };
  } catch (error) {
    console.error("FMP Finance 에러:", error);
    return null;
  }
};

export const fetchCompanyData = async (companyName, onStatusUpdate) => {
  const orchestrator = new SisyphusOrchestrator(companyName, onStatusUpdate);
  return await orchestrator.run();
};
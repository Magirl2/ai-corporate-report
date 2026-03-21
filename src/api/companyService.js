import { extractJson } from '../utils/formatters';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
const fmpApiKey = import.meta.env.VITE_FMP_API_KEY; 
const dartApiKey = import.meta.env.VITE_DART_API_KEY;

export const fetchWithRetry = async (url, options, retries = 3) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP error! status: ${response.status}`;
        if (response.status === 429 || errMsg.includes('Quota') || errMsg.includes('429')) {
          throw new Error("RATE_LIMIT"); 
        }
        throw new Error(errMsg);
      }
      return await response.json();
    } catch (err) {
      if (err.message === "RATE_LIMIT") throw err; 
      if (i === retries - 1) throw err; 
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 8000);
    }
  }
  throw new Error("요청 처리에 실패했습니다.");
};

const identifyCompany = async (companyName) => {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `사용자가 입력한 검색어 '${companyName}'에 해당하는 기업을 식별하세요. 영문 티커(AAPL 등)나 한글로 된 해외기업은 isKorean: false로 처리하세요. 한국 상장사만 true로 처리하세요.\n반드시 아래 JSON 형식만 반환하세요:\n{"isKorean": boolean, "ticker": "공식티커", "officialName": "공식명칭"}`;

  try {
    const res = await fetchWithRetry(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.0, responseMimeType: "application/json" } }) 
    });
    const jsonStr = extractJson(res.candidates?.[0]?.content?.parts?.[0]?.text);
    return JSON.parse(jsonStr);
  } catch (err) { 
    if (err.message === "RATE_LIMIT") throw err;
    return { isKorean: true, ticker: null, officialName: companyName }; 
  }
};

const fetchFMPFinancials = async (ticker, targetYears) => {
  try {
    const [incomeRes, metricsRes, ratiosRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=10&apikey=${fmpApiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?limit=10&apikey=${fmpApiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?limit=10&apikey=${fmpApiKey}`)
    ]);
    if (incomeRes.status === 429) throw new Error("RATE_LIMIT");

    const rawIncome = await incomeRes.json();
    const rawMetrics = await metricsRes.json();
    const rawRatios = await ratiosRes.json();
    if (!rawIncome?.length) return null;

    return targetYears.map((targetYear) => {
      const inc = rawIncome.find(item => item.calendarYear === targetYear);
      const met = rawMetrics.find(item => item.calendarYear === targetYear);
      const rat = rawRatios.find(item => item.calendarYear === targetYear);
      const prevInc = rawIncome.find(item => item.calendarYear === String(parseInt(targetYear) - 1));
      
      return {
        year: `${targetYear}년`,
        revenueGrowth: inc?.revenue && prevInc?.revenue ? `${(((inc.revenue - prevInc.revenue) / Math.abs(prevInc.revenue)) * 100).toFixed(1)}%` : '정보 없음',
        operatingMargin: inc?.operatingIncomeRatio ? `${(inc.operatingIncomeRatio * 100).toFixed(1)}%` : '정보 없음',
        debtRatio: met?.debtToEquity ? `${(met.debtToEquity * 100).toFixed(1)}%` : '정보 없음',
        roe: rat?.returnOnEquity ? `${(rat.returnOnEquity * 100).toFixed(1)}%` : '정보 없음',
        eps: inc?.eps != null ? `$${inc.eps.toFixed(2)}` : '정보 없음'
      };
    });
  } catch (err) { 
    if (err.message === "RATE_LIMIT") throw err;
    return null; 
  }
};

const getDartCorpCode = async (companyName) => {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const prompt = `한국 기업 '${companyName}'의 DART 고유번호 8자리를 알려주세요. 오직 8자리 숫자만 응답하세요.`;

  try {
    const res = await fetchWithRetry(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.0 } })
    });
    const match = res.candidates?.[0]?.content?.parts?.[0]?.text?.match(/\d{8}/);
    return match ? match[0] : null;
  } catch (err) { 
    if (err.message === "RATE_LIMIT") throw err;
    return null; 
  }
};

const fetchDartMetrics = async (corpCode, targetYears) => {
  const yearsToFetch = [...targetYears, String(parseInt(targetYears[targetYears.length - 1]) - 1)];

  const fetchYear = async (year) => {
    const endpoint = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${dartApiKey}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=11011`;
    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(endpoint)}`);
      if (res.status === 429) throw new Error("RATE_LIMIT");
      const data = await res.json();
      if (data.status !== "000") return { year, data: null };

      const metrics = { revenue: null, opIncome: null, equity: null, liability: null, netIncome: null, eps: null };
      for (const item of data.list) {
        if (item.fs_div !== "CFS") continue; 
        const val = Number(item.thstrm_amount.replace(/,/g, ''));
        if (item.account_nm.includes("매출")) metrics.revenue = val;
        if (item.account_nm.includes("영업이익")) metrics.opIncome = val;
        if (item.account_nm === "자본총계") metrics.equity = val;
        if (item.account_nm === "부채총계") metrics.liability = val;
        if (item.account_nm.includes("당기순이익") || item.account_nm.includes("지배기업 소유주지분")) metrics.netIncome = val;
        if (item.account_nm.includes("주당이익") || item.account_nm.includes("EPS")) metrics.eps = val;
      }
      return { year, data: metrics };
    } catch (err) { 
      if (err.message === "RATE_LIMIT") throw err;
      return { year, data: null }; 
    }
  };

  const results = await Promise.all(yearsToFetch.map(fetchYear));
  const dataMap = results.reduce((acc, curr) => { acc[curr.year] = curr.data; return acc; }, {});

  return targetYears.map(year => {
    const current = dataMap[year];
    const prev = dataMap[String(parseInt(year) - 1)];
    if (!current || current.revenue === null) return null;

    return {
      year: `${year}년`,
      revenueGrowth: (current.revenue && prev?.revenue) ? `${(((current.revenue - prev.revenue) / Math.abs(prev.revenue)) * 100).toFixed(1)}%` : '검색 참조',
      operatingMargin: (current.opIncome != null && current.revenue) ? `${((current.opIncome / current.revenue) * 100).toFixed(1)}%` : '검색 참조',
      debtRatio: (current.liability != null && current.equity) ? `${((current.liability / current.equity) * 100).toFixed(1)}%` : '검색 참조',
      roe: (current.netIncome != null && current.equity) ? `${((current.netIncome / current.equity) * 100).toFixed(1)}%` : '검색 참조',
      eps: current.eps != null ? `₩${current.eps.toLocaleString()}` : '검색 참조'
    };
  });
};

export const fetchCompanyData = async (rawCompanyName, onStatusUpdate) => {
  const model = 'gemini-2.5-flash';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = [(currentYear - 1), (currentYear - 2), (currentYear - 3)].map(String);
  const dateString = `${currentYear}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  if (onStatusUpdate) onStatusUpdate(`[${rawCompanyName}] 기업 국적 및 식별 중...`);
  const identity = await identifyCompany(rawCompanyName);
  const officialName = identity.officialName || rawCompanyName;
  let financialMetrics = null;
  const isDartMode = identity.isKorean; 
  
  if (isDartMode) {
    if (onStatusUpdate) onStatusUpdate(`[${officialName}] 한국 기업 감지됨: DART 원본 추출 중...`);
    const corpCode = await getDartCorpCode(officialName);
    if (corpCode) {
      const dartMetrics = await fetchDartMetrics(corpCode, years);
      if (dartMetrics && dartMetrics.some(m => m !== null)) {
        financialMetrics = years.map(y => {
           const found = dartMetrics.find(m => m?.year === `${y}년`);
           return found || { year: `${y}년`, revenueGrowth: "정보 없음", operatingMargin: "정보 없음", debtRatio: "정보 없음", roe: "정보 없음", eps: "정보 없음" };
        });
      }
    }
  } else {
    if (onStatusUpdate) onStatusUpdate(`[${officialName}] 글로벌 상장사 감지: FMP 데이터 접속 중...`);
    if (identity.ticker) financialMetrics = await fetchFMPFinancials(identity.ticker, years);
  }

  if (onStatusUpdate) onStatusUpdate(`[${officialName}] 실시간 트렌드 및 최신 뉴스 검색 중...`);

  const trustedSites = isDartMode 
    ? "site:yna.co.kr OR site:mk.co.kr OR site:hankyung.com" 
    : "site:reuters.com OR site:bloomberg.com OR site:wsj.com";

  const systemPrompt = "당신은 최고 수준의 기업 분석가입니다. 마크다운을 제외한 순수한 JSON 객체 문자열 형태로만 반환하세요.";
  
  const searchPrompt = `분석 기업: '${officialName}' (${dateString})\n구글 검색으로 다음을 조사하여 JSON으로 반환하세요.\n\n🚨 [필수 지침]\n1. "${trustedSites}" 연산자를 포함하여 신뢰도 높은 언론사 팩트만 수집하세요.\n2. 네이버 블로그, 커뮤니티 글은 무시하세요.\n3. 이동평균선, RSI 등 기술적 차트 분석이나 주관적 점수 산정은 절대 하지 마세요. 오직 팩트 뉴스에 기반한 시장의 분위기만 파악하세요.\n4. marketSentiment의 status는 반드시 "긍정", "중립", "부정" 중 하나만 적으세요.\n5. PER 지표는 절대 포함하지 마세요.\n\nJSON 구조:\n{\n  "companyName": "${officialName}",\n  "macroTrend": { "summary": "거시 트렌드 요약", "detail": "상세" },\n  "report": {\n    "marketSentiment": { "status": "긍정/중립/부정", "analysis": ["판단 근거 1", "판단 근거 2"] },\n    "vision": { "summary": "비전 요약", "detail": "상세" },\n    "businessModel": { "summary": "비즈니스 모델 요약", "detail": "상세" },\n    "industryStatus": { "summary": "산업 현황 요약", "detail": "상세" },\n    "financialAnalysis": {\n      "overview": { "summary": "재무 요약", "detail": "상세" },\n      "keyMetrics": [\n        { "year": "${years[0]}년", "revenueGrowth": "", "operatingMargin": "", "debtRatio": "", "roe": "", "eps": "" },\n        { "year": "${years[1]}년", "revenueGrowth": "", "operatingMargin": "", "debtRatio": "", "roe": "", "eps": "" },\n        { "year": "${years[2]}년", "revenueGrowth": "", "operatingMargin": "", "debtRatio": "", "roe": "", "eps": "" }\n      ]\n    },\n    "recentNews": [\n      { "headline": "뉴스제목1", "summary": "요약1", "detail": "상세1" },\n      { "headline": "뉴스제목2", "summary": "요약2", "detail": "상세2" }\n    ],\n    "marketRiskAndOutlook": { "summary": "리스크 요약", "detail": "상세" }\n  }\n}`;

  try {
    const response = await fetchWithRetry(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: searchPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.0 },
      }),
    });

    const resultText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJson = extractJson(resultText);
    
    if (!cleanJson) throw new Error("분석 데이터가 올바른 JSON 형식이 아닙니다.");
    
    const parsed = JSON.parse(cleanJson);
    if (financialMetrics) parsed.report.financialAnalysis.keyMetrics = financialMetrics;
    return parsed;

  } catch (err) {
    if (err.message === "RATE_LIMIT") throw err; 
    throw new Error(`데이터 해석 실패: ${err.message}`);
  }
};

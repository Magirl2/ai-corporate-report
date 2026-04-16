import { extractJson } from '../utils/formatters';

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

export const fetchWithRetry = async (url, options, retries = 2) => {
  let delay = 800;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
         throw new Error(`Invalid content type: JSON expected, got ${contentType}`);
      }
      
      return await response.json();
    } catch (err) {
      console.warn(`[Frontend Fetch] Retry ${i + 1}/${retries} failed for ${url}:`, err.message);
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay *= 1.5;
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
    const response = await fetch(`/api/fmp-finance?ticker=${ticker}`);
    
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      console.error('FMP Finance API 오류:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("FMP Finance 에러:", error);
    return null;
  }
};

/**
 * 서버 사이드 오케스트레이션을 호출하고 NDJSON 스트림을 처리합니다.
 */
export const fetchCompanyData = async (companyName, onStatusUpdate) => {
  try {
    const response = await fetch('/api/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName })
    });

    if (!response.ok) {
      let errResp = {};
      try {
        errResp = await response.json();
      } catch (_) {}
      
      const errorObj = errResp.error || { message: `서버 오류 (${response.status})` };
      const error = new Error(errorObj.message);
      error.code = errorObj.code || 'HTTP_ERROR';
      error.retryable = typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalReport = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const payload = JSON.parse(line);
          
          if (payload.type === 'status') {
            onStatusUpdate?.(payload.data?.message || '');
          } else if (payload.type === 'success') {
            finalReport = payload.data;
          } else if (payload.type === 'error') {
            const errorObj = payload.error || { message: '알 수 없는 스트림 오류' };
            const error = new Error(errorObj.message);
            error.code = errorObj.code || 'STREAM_ERROR';
            error.retryable = typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false;
            throw error;
          }
        } catch (e) {
          if (e.code) throw e; // 우리가 던진 에러면 통과
          console.warn('NDJSON 파싱 오류:', e, line);
        }
      }
    }

    if (!finalReport) {
      const error = new Error('보고서 생성 결과가 없습니다.');
      error.code = 'NO_REPORT_DATA';
      error.retryable = false;
      throw error;
    }

    return finalReport;
  } catch (error) {
    console.error('Report Generation Error:', error);
    throw error;
  }
};
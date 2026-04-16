
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
      error.category = errorObj.category || 'INTERNAL';
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
            error.category = errorObj.category || 'UPSTREAM';
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

/**
 * 서버 사이드의 /api/report/compare 전용 컴포지션 라우트를 호출하여 NDJSON 스트림을 처리합니다.
 */
export const fetchCompareData = async (companyA, companyB, onStatusUpdate) => {
  try {
    const response = await fetch('/api/report/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyA, companyB })
    });

    if (!response.ok) {
      let errResp = {};
      try {
        errResp = await response.json();
      } catch (_) {}
      
      const errorObj = errResp.error || { message: `서버 오류 (${response.status})` };
      const error = new Error(errorObj.message);
      error.category = errorObj.category || 'INTERNAL';
      error.code = errorObj.code || 'HTTP_ERROR';
      error.retryable = typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalCompareData = null;

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
            finalCompareData = payload.data; // { dataA, dataB }
          } else if (payload.type === 'error') {
            const errorObj = payload.error || { message: '비교 스트림 오류' };
            const error = new Error(errorObj.message);
            error.category = errorObj.category || 'UPSTREAM';
            error.code = errorObj.code || 'STREAM_ERROR';
            error.retryable = typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false;
            throw error;
          }
        } catch (e) {
          if (e.code) throw e; 
          console.warn('NDJSON 파싱 오류:', e, line);
        }
      }
    }

    if (!finalCompareData) {
      const error = new Error('비교 분석 생성 결과가 없습니다.');
      error.code = 'NO_COMPARE_DATA';
      error.retryable = false;
      throw error;
    }

    return finalCompareData;
  } catch (error) {
    console.error('Compare Generation Error:', error);
    throw error;
  }
};
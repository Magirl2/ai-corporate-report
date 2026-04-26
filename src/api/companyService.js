/**
 * NDJSON 스트림 응답을 처리하는 헬퍼 함수
 */
async function consumeNdjsonStream(response, onStatusUpdate) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let finalData = null;
  let stage1Id = null;

  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // 마지막 요소는 불완전할 수 있으므로 버퍼에 남김

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const payload = JSON.parse(line);
        
        if (payload.type === 'status') {
          onStatusUpdate?.(payload.data?.message || '');
        } else if (payload.type === 'success') {
          finalData = payload.data;
        } else if (payload.type === 'stage1') {
          stage1Id = payload.data?.stage1Id;
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

  if (buffer.trim()) {
    try {
      const payload = JSON.parse(buffer);
      if (payload.type === 'success') finalData = payload.data;
    } catch (e) {
      console.warn('NDJSON 잔여 버퍼 파싱 오류:', e, buffer);
    }
  }

  return { finalData, stage1Id };
}

/**
 * 서버 사이드 오케스트레이션을 호출하고 NDJSON 스트림을 처리합니다.
 */
export const fetchCompanyData = async (companyName, onStatusUpdate, options = {}) => {
  try {
    // 1. Stage 1: Search Endpoint 호출
    const searchResponse = await fetch('/api/report/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        companyName, 
        forceRefresh: Boolean(options.forceRefresh),
        qualityMode: options.qualityMode || 'deep'
      })
    });

    if (!searchResponse.ok) {
      let errResp = {};
      try { errResp = await searchResponse.json(); } catch (_) {}
      const errorObj = errResp.error || { message: `서버 오류 (${searchResponse.status})` };
      const error = new Error(errorObj.message);
      error.category = errorObj.category || 'INTERNAL';
      error.code = errorObj.code || 'HTTP_ERROR';
      error.retryable = typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false;
      throw error;
    }

    const searchResult = await consumeNdjsonStream(searchResponse, onStatusUpdate);
    
    // 캐시 히트 등 바로 success가 온 경우
    if (searchResult.finalData) {
      return searchResult.finalData;
    }

    if (!searchResult.stage1Id) {
      const error = new Error('Stage 1 처리 결과가 올바르지 않습니다.');
      error.code = 'NO_STAGE1_ID';
      error.retryable = false;
      throw error;
    }

    // 2. Stage 2: Output Endpoint 호출
    const outputResponse = await fetch('/api/report/output', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage1Id: searchResult.stage1Id })
    });

    if (!outputResponse.ok) {
      let errResp = {};
      try { errResp = await outputResponse.json(); } catch (_) {}
      const errorObj = errResp.error || { message: `서버 오류 (${outputResponse.status})` };
      const error = new Error(errorObj.message);
      error.category = errorObj.category || 'INTERNAL';
      error.code = errorObj.code || 'HTTP_ERROR';
      error.retryable = typeof errorObj.retryable === 'boolean' ? errorObj.retryable : false;
      throw error;
    }

    const outputResult = await consumeNdjsonStream(outputResponse, onStatusUpdate);

    if (!outputResult.finalData) {
      const error = new Error('보고서 생성 결과가 없습니다.');
      error.code = 'NO_REPORT_DATA';
      error.retryable = false;
      throw error;
    }

    return outputResult.finalData;
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

/**
 * 기업의 보고서 캐시를 강제로 삭제합니다.
 */
export const deleteCompanyReportCache = async (companyName) => {
  try {
    const response = await fetch('/api/report/cache', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName })
    });
    
    if (!response.ok) {
      throw new Error(`캐시 삭제 실패 (${response.status})`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Cache Deletion Error:', error);
    throw error;
  }
};
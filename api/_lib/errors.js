/**
 * 공통 서버 에러 응답 객체를 표준화합니다.
 */

// 사전 정의된 에러 카테고리 (Operational / Diagnostic 분류용)
export const ErrorCategory = {
  AUTH: 'AUTH',
  ENTITLEMENT: 'ENTITLEMENT',
  USAGE: 'USAGE',
  VALIDATION: 'VALIDATION',
  UPSTREAM: 'UPSTREAM',
  INTERNAL: 'INTERNAL'
};

/**
 * 일반 HTTP 응답 기반 에러 객체 생성
 */
export function createErrorResponse(category, code, message, reqId = null, retryable = false) {
  return {
    success: false,
    error: {
      category,
      code,
      message,
      reqId,
      retryable
    }
  };
}

/**
 * NDJSON 스트림 기반 에러 이벤트 객체 생성
 */
export function createStreamError(category, code, message, reqId = null, retryable = false) {
  return {
    type: 'error',
    error: {
      category,
      code,
      message,
      reqId,
      retryable
    }
  };
}

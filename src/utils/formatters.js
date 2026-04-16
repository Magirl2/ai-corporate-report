// src/utils/formatters.js

/**
 * JSON 텍스트에서 첫 번째 완전한 JSON 객체/배열을 추출하고 정규화합니다.
 * AI 응답에서 JSON을 안전하게 파싱할 때 사용합니다.
 */
export const extractJson = (text) => {
  try {
    const firstBrace   = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace    = text.lastIndexOf('}');
    const lastBracket  = text.lastIndexOf(']');

    let startIdx = -1;
    let endIdx   = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx   = lastBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx   = lastBracket;
    }

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;

    let clean = text.slice(startIdx, endIdx + 1);
    clean = clean.replace(/,\s*([}\]])/g, '$1');       // 후행 쉼표 제거
    clean = clean.replace(/\t/g, '  ');                  // 탭 → 공백
    clean = clean.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) =>
      match.replace(/\n/g, '\\n').replace(/\r/g, '\\r') // 문자열 내 개행 이스케이프
    );

    return clean;
  } catch {
    return null;
  }
};

/**
 * 숫자 문자열을 파싱합니다. 파싱 실패 시 null 반환.
 */
export const parseNumber = (str) => {
  if (!str) return null;
  const num = parseFloat(String(str).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
};

/**
 * 값을 안전하게 문자열로 변환합니다. (CompareFinancials에서 사용)
 */
export const safeString = (val) => {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return '정보 없음';
  return String(val);
};
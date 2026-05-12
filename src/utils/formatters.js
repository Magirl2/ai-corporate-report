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

/**
 * DART 재무 수치(백만원 단위 문자열)를 사람이 읽기 쉬운 한국어 단위로 변환합니다.
 * 예: "302,231,360" → "302.2조원", "50,000" → "500억원"
 */
export const formatKRW = (rawStr) => {
  if (!rawStr || rawStr === '-') return '-';
  const num = parseInt(String(rawStr).replace(/,/g, ''), 10);
  if (isNaN(num)) return String(rawStr);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}조원`;
  if (abs >= 100) return `${sign}${Math.round(abs / 100).toLocaleString()}억원`;
  return `${sign}${abs.toLocaleString()}백만원`;
};

/**
 * FMP 재무 수치(전체 통화 단위 문자열)를 읽기 쉬운 형태로 변환합니다.
 * 예: "394,328,000,000" → "394.3B", "1,234,567" → "1.2M"
 */
export const formatFMPValue = (rawStr) => {
  if (!rawStr || rawStr === '-') return '-';
  const num = parseInt(String(rawStr).replace(/,/g, ''), 10);
  if (isNaN(num)) return String(rawStr);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toLocaleString()}`;
};

/**
 * 퍼센트 문자열(예: "12.5%", "-3.2%", "+5.1%")을 색상 클래스와 방향 기호로 반환합니다.
 */
export const formatRatioBadge = (ratioStr) => {
  if (!ratioStr || ratioStr === '-') return { label: '-', colorClass: 'text-slate-400' };
  const num = parseFloat(String(ratioStr).replace('%', ''));
  if (isNaN(num)) return { label: ratioStr, colorClass: 'text-slate-600' };
  const arrow = num > 0 ? '▲' : num < 0 ? '▼' : '─';
  const colorClass = num > 0 ? 'text-emerald-600' : num < 0 ? 'text-rose-600' : 'text-slate-500';
  return { label: `${arrow} ${ratioStr}`, colorClass };
};
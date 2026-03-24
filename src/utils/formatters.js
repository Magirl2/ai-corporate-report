// 모든 함수 앞에 'export'가 붙어 있어야 합니다.
export const repairJson = (jsonString) => {
  if (!jsonString) return "";
  let stack = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (char === '"' && !escaped) inString = !inString;
    if (!inString) {
      if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
      else if (char === '}' || char === ']') stack.pop();
    }
    escaped = char === '\\' && !escaped;
  }
  let repaired = jsonString;
  if (inString) repaired += '"';
  while (stack.length > 0) repaired += stack.pop();
  return repaired;
};

export const extractJson = (text) => {
  try {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');

    let startIdx = -1;
    let endIdx = -1;

    // 객체 ({...}) 인지 배열 ([...]) 인지 판단
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = lastBrace;
    } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      startIdx = firstBracket;
      endIdx = lastBracket;
    }

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;

    let cleanJson = text.slice(startIdx, endIdx + 1);
    
    // 💡 방어 로직 1: 불필요한 후행 쉼표 제거
    cleanJson = cleanJson.replace(/,\s*([\}\]])/g, '$1');
    
    // 💡 방어 로직 2: 제어 문자(탭) 무효화
    cleanJson = cleanJson.replace(/\t/g, '  ');

    // 💡 방어 로직 3: 문자열 값 내부의 실제 줄바꿈(Enter) 문자를 안전한 \n 으로 치환
    // 쌍따옴표로 묶인 문자열 내부를 정확히 찾아내서 그 안의 \n, \r 만 이스케이프합니다.
    cleanJson = cleanJson.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    });

    return cleanJson;
  } catch (error) {
    console.error("JSON 추출 실패:", error);
    return null;
  }
};

export const safeField = (obj, keys, fallback) => {
  if (!obj) return fallback;
  if (typeof obj === 'string') return obj;
  for (const key of keys) {
    if (obj[key]) return String(obj[key]);
  }
  return fallback;
};

export const safeString = (val) => {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return '정보 없음';
  return String(val);
};

export const safeSummary = (obj) => safeField(obj, ['summary', 'overview'], '요약 정보가 없습니다.');
export const safeDetail = (obj) => safeField(obj, ['detail', 'description'], '상세 분석 내용이 없습니다.');

export const tabClass = (isActive) =>
  `pb-3 font-semibold text-sm transition-colors border-b-2 ${
    isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
  }`;

export const parseNumber = (str) => {
  if (!str) return null;
  const num = parseFloat(String(str).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
};
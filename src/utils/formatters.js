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
  if (!text) return null;
  
  const objStart = text.indexOf('{');
  const arrStart = text.indexOf('[');
  let start = -1;
  let end = -1;

  if (objStart !== -1 && arrStart !== -1) {
    if (objStart < arrStart) {
      start = objStart;
      end = text.lastIndexOf('}');
    } else {
      start = arrStart;
      end = text.lastIndexOf(']');
    }
  } else if (objStart !== -1) {
    start = objStart;
    end = text.lastIndexOf('}');
  } else if (arrStart !== -1) {
    start = arrStart;
    end = text.lastIndexOf(']');
  }

  if (start === -1 || end === -1 || start >= end) return null;
  
  const jsonPart = text.slice(start, end + 1);
  return repairJson(jsonPart);
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
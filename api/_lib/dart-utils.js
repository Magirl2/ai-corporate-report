/**
 * api/_lib/dart-utils.js
 * DART 기업 매칭 및 정규화 공통 유틸리티
 */
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

// 글로벌 캐시 변수 (Vercel 서버리스 환경에서 인스턴스 생존 시 유지)
global.CORP_CODE_CACHE = global.CORP_CODE_CACHE || null;
global.CORP_CODE_CACHE_TIME = global.CORP_CODE_CACHE_TIME || 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간


// 1. 브랜드명/서비스명 -> 공식 법인명 매핑 (DART 검색 성능 향상용)
export const ALIAS_MAP = {
  '토스': '비바리퍼블리카',
  '배민': '우아한형제들',
  '배달의민족': '우아한형제들',
  '업비트': '두나무',
  '직방': '직방',
  '야놀자': '야놀자',
  '무신사': '무신사',
  '컬리': '컬리',
  '마켓컬리': '컬리',
  '당근': '당근마켓',
  '당근마켓': '당근마켓',
  '쏘카': '쏘카',
  '직방': '직방',
  '오늘의집': '버킷플레이스',
  '뱅크샐러드': '뱅크샐러드',
  '쿠팡': '쿠팡', // 쿠팡은 상장사는 아니나 한국 법인 존재 (리포트는 보통 미국 FMP 우선)
};

// 2. 자주 조회되는 상장사 corp_code 하드코딩 (캐시 역할)
export const COMMON_CORPS = {
  '삼성전자': '00126380', 'SK하이닉스': '00164779',
  '현대자동차': '00164742', '현대차': '00164742', '기아': '00164788', '현대모비스': '00164815',
  'LG에너지솔루션': '01515350', '삼성SDI': '00126371', 'LG화학': '00401706',
  'SK이노베이션': '00126421', 'POSCO홀딩스': '00432584', '포스코홀딩스': '00432584',
  '셀트리온': '00421045', '삼성바이오로직스': '00877059',
  'LG전자': '00401731', 'LG디스플레이': '00201111', 'LG생활건강': '00366474',
  '한국전력': '00104894', 'NAVER': '00266961', '네이버': '00266961',
  '카카오': '00258801', '카카오뱅크': '01316289', '카카오페이': '01185458',
  'KB금융': '00679551', '신한지주': '00382199', '우리금융지주': '01016767', '하나금융지주': '00547223',
  '삼성생명': '00115440', '삼성화재': '00126362', '삼성물산': '00126256',
  'SK텔레콤': '00429904', 'SKT': '00429904', 'SK': '00164842', 'KT': '00781904', 'LG유플러스': '00869061',
  '현대건설': '00164753', '두산에너빌리티': '00264660', '한화솔루션': '00115592', '대한항공': '00114007',
  '삼천당제약': '00121774',
  '비나텍': '00563518', 'VINATech': '00563518', 'VINA Tech': '00563518'
};

/**
 * 3. 기업명 정규화
 * 법인 구분어, 공백 제거 등
 */
export function normalizeCorpName(name, preserveSpace = false) {
  if (!name) return '';
  // 1. 법인 구분어 제거 시 공백으로 대체하여 단어 간 결합 방지
  let cleaned = name.replace(/\s*(주식회사|㈜|\(주\)|그룹|홀딩스|유한회사|사단법인|재단법인|합명회사|합자회사|유한책임회사)\s*/gi, ' ');
  
  if (!preserveSpace) {
    // 공백 모두 제거
    return cleaned.replace(/\s+/g, '').trim();
  } else {
    // 연속된 공백을 하나로 축소하고 트림
    return cleaned.replace(/\s+/g, ' ').trim();
  }
}

/**
 * 4. 핵심 키워드 추출 (업종 접미사 제거)
 */
export const INDUSTRY_SUFFIXES = [
  '제약', '전자', '바이오', '케미칼', '화학', '건설', '증권', '은행',
  '금융', '생명', '화재', '보험', '에너지', '철강', '자동차', '오일',
  '가스', '통신', '엔터', '미디어', '푸드', '푸즈', '식품',
  '물산', '산업', '개발', '기공', '공업', '상사', '로직스', '로지스틱스',
];

export function extractKeyword(name) {
  const normalized = normalizeCorpName(name);
  for (const s of INDUSTRY_SUFFIXES) {
    if (normalized.endsWith(s) && normalized.length > s.length) {
      return normalized.slice(0, -s.length);
    }
  }
  return normalized;
}

/**
 * 5. DART 매칭 점수 계산
 */
export function scoreCorpMatch(item, targetNormalized, targetKeyword) {
  const n = normalizeCorpName(item.corp_name || '');
  if (n === targetNormalized) return 10;
  if (n === targetKeyword) return 8;
  if (n.startsWith(targetNormalized)) return 6;
  if (targetNormalized.startsWith(n) && n.length >= 2) return 5;
  if (n.startsWith(targetKeyword) && targetKeyword.length >= 2) return 4;
  if (n.includes(targetKeyword) && targetKeyword.length >= 2) return 2;
  return 0;
}

/**
 * 6. OpenDART corpCode.xml 다운로드 및 캐싱
 */
export async function loadCorpCodes(apiKey) {
  const now = Date.now();
  if (global.CORP_CODE_CACHE && (now - global.CORP_CODE_CACHE_TIME < CACHE_TTL)) {
    return global.CORP_CODE_CACHE;
  }

  try {
    const response = await fetch(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch corpCode.xml: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const xmlEntry = zipEntries.find(entry => entry.entryName === 'CORPCODE.xml');
    
    if (!xmlEntry) {
      throw new Error('CORPCODE.xml not found in the downloaded zip');
    }
    
    const xmlString = xmlEntry.getData().toString('utf8');
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlString);
    
    const list = jsonObj.result?.list || [];
    
    // list is an array of { corp_code, corp_name, stock_code, modify_date }
    // Some companies don't have stock_code (represented as empty string or spaces in XML)
    global.CORP_CODE_CACHE = list.map(item => ({
      corpCode: item.corp_code ? String(item.corp_code).padStart(8, '0') : null,
      corpName: item.corp_name,
      stockCode: item.stock_code ? String(item.stock_code).trim() : null,
      normalizedName: normalizeCorpName(item.corp_name, false),
      keywordName: extractKeyword(item.corp_name)
    })).filter(i => i.corpCode); // 유효한 corp_code가 있는 항목만
    
    global.CORP_CODE_CACHE_TIME = now;
    console.log(`[dart-utils] Successfully loaded and cached ${global.CORP_CODE_CACHE.length} corp codes.`);
    
    return global.CORP_CODE_CACHE;
  } catch (error) {
    console.error('[dart-utils] Error loading corp codes:', error);
    // 폴백: 이전 캐시가 있으면 그대로 사용
    if (global.CORP_CODE_CACHE) return global.CORP_CODE_CACHE;
    return null;
  }
}

/**
 * 7. 통합 corp_code 검색 로직 (XML 기반)
 */
export async function resolveCorpCode(userInput, apiKey) {
  if (!userInput) return null;

  // STEP 1: Alias 매핑 확인
  const aliasResolved = ALIAS_MAP[userInput] || ALIAS_MAP[normalizeCorpName(userInput)];
  const targetName = aliasResolved || userInput;
  
  const normalized = normalizeCorpName(targetName, false);
  const keyword = extractKeyword(normalized);

  // STEP 2: corpCode.xml 로드 및 캐시 검색
  const corpList = await loadCorpCodes(apiKey);
  
  if (corpList) {
    // 1순위: 정확한 종목명(stock_name) 매칭 또는 정확한 법인명 매칭
    // 비나텍 같은 경우, 입력이 '비나텍'이면 corp_name='비나텍'으로 매칭됨
    let match = corpList.find(c => c.corpName === targetName || c.normalizedName === normalized);
    
    // 2순위: 키워드 기반 포함 매칭 (주식 코드가 있는 상장사 우선)
    if (!match) {
      const candidates = corpList.filter(c => 
        c.normalizedName.includes(normalized) || 
        (keyword.length >= 2 && c.normalizedName.includes(keyword))
      );
      
      // 상장사(stockCode 존재) 우선, 길이가 가장 짧은 것(더 정확한 이름) 우선
      if (candidates.length > 0) {
        match = candidates.sort((a, b) => {
          if (a.stockCode && !b.stockCode) return -1;
          if (!a.stockCode && b.stockCode) return 1;
          return a.corpName.length - b.corpName.length;
        })[0];
      }
    }

    if (match) {
      return { 
        corpCode: match.corpCode, 
        corpName: match.corpName, 
        stockCode: match.stockCode,
        method: 'xml_cache'
      };
    }
  }

  // STEP 3: Fallback - COMMON_CORPS 하드코딩 확인
  let corpCode = 
    COMMON_CORPS[targetName] || 
    COMMON_CORPS[normalized] || 
    COMMON_CORPS[keyword] || 
    null;
    
  if (corpCode) {
    return { corpCode, corpName: targetName, stockCode: null, method: 'hardcoded' };
  }

  return null;
}

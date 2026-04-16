/**
 * api/_lib/dart-utils.js
 * DART 기업 매칭 및 정규화 공통 유틸리티
 */

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
};

/**
 * 3. 기업명 정규화
 * 법인 구분어, 공백 제거 등
 */
export function normalizeCorpName(name) {
  if (!name) return '';
  return name
    .replace(/\s*(주식회사|㈜|\(주\)|그룹|홀딩스|유한회사|사단법인|재단법인)\s*/gi, '')
    .replace(/\s+/g, '')
    .trim();
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
 * 6. 통합 corp_code 검색 로직
 */
export async function resolveCorpCode(userInput, apiKey) {
  if (!userInput) return null;

  // STEP 1: Alias / Common 매핑 우선 확인
  const aliasResolved = ALIAS_MAP[userInput] || ALIAS_MAP[normalizeCorpName(userInput)];
  const targetName = aliasResolved || userInput;
  
  const normalized = normalizeCorpName(targetName);
  const keyword = extractKeyword(normalized);
  const firstToken = targetName.trim().split(/\s+/)[0];

  let corpCode = 
    COMMON_CORPS[targetName] || 
    COMMON_CORPS[normalized] || 
    COMMON_CORPS[keyword] || 
    null;
    
  if (corpCode) return { corpCode, corpName: targetName, method: 'hardcoded' };

  // STEP 2: DART API를 통한 후보군 검색
  try {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0].replace(/-/g, '');
    
    // 후보군 생성
    const candidates = [...new Set([normalized, keyword, firstToken])].filter(s => s && s.length >= 2);
    
    // 최근 6개월을 2개 윈도우로 나누어 조회 (DART 3개월 제한 대응)
    const windows = [0, 1].map(i => {
      const end = new Date(today);
      end.setMonth(today.getMonth() - i * 3);
      const start = new Date(end);
      start.setMonth(end.getMonth() - 3);
      return { bgn: formatDate(start), end: formatDate(end) };
    });

    const allSearches = candidates.flatMap(c => windows.map(w => ({ c, w })));
    const allResults = await Promise.all(
      allSearches.map(({ c, w }) =>
        fetch(
          `https://opendart.fss.or.kr/api/list.json?crtfc_key=${apiKey}` +
          `&corp_name=${encodeURIComponent(c)}&bgn_de=${w.bgn}&end_de=${w.end}&page_count=100`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } }
        ).then(r => r.json()).catch(() => ({ status: 'error' }))
      )
    );

    let bestScore = 0;
    let bestCorp = null;

    for (const result of allResults) {
      if (result.status !== '000' || !result.list?.length) continue;
      for (const item of result.list) {
        const s = scoreCorpMatch(item, normalized, keyword);
        if (s > bestScore) {
          bestScore = s;
          bestCorp = item;
        }
      }
    }

    if (bestCorp && bestScore >= 2) {
      return { 
        corpCode: bestCorp.corp_code, 
        corpName: bestCorp.corp_name, 
        method: 'api_search',
        score: bestScore
      };
    }
  } catch (err) {
    console.error('[resolveCorpCode] Search failed:', err);
  }

  return null;
}

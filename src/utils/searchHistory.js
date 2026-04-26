/**
 * 사용자별 최근 검색 기록을 관리하는 유틸리티
 */

const MAX_HISTORY = 5;
const LEGACY_KEY = 'ei_recent_searches';

export function getSearchHistoryKey(user) {
  return `ei_recent_searches:${user?.email || 'guest'}`;
}

export function getRecentSearches(user) {
  const key = getSearchHistoryKey(user);
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to parse search history:', err);
    return [];
  }
}

export function addRecentSearch(user, companyName) {
  const key = getSearchHistoryKey(user);
  try {
    const history = getRecentSearches(user);
    const newEntry = { name: companyName, date: new Date().toISOString() };
    
    // 중복 제거 후 맨 앞에 추가, 최대 5개 제한
    const updated = [newEntry, ...history.filter(item => item.name !== companyName)].slice(0, MAX_HISTORY);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to add search history:', err);
    return [];
  }
}

export function removeRecentSearch(user, companyName) {
  const key = getSearchHistoryKey(user);
  try {
    const history = getRecentSearches(user);
    const updated = history.filter(item => item.name !== companyName);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to remove search history:', err);
    return [];
  }
}

export function clearRecentSearches(user) {
  const key = getSearchHistoryKey(user);
  try {
    localStorage.removeItem(key);
    return [];
  } catch (err) {
    console.error('Failed to clear search history:', err);
    return [];
  }
}

export function migrateLegacySearchHistory(user) {
  try {
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (!legacyData) return;

    let legacyHistory = [];
    try {
      legacyHistory = JSON.parse(legacyData);
    } catch {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }

    if (Array.isArray(legacyHistory) && legacyHistory.length > 0) {
      const userKey = getSearchHistoryKey(user);
      const currentUserHistory = getRecentSearches(user);
      
      // Merge: legacy 항목들을 뒤에 붙이고 중복 제거 후 잘라냄
      const mergedMap = new Map();
      currentUserHistory.forEach(item => mergedMap.set(item.name, item));
      legacyHistory.forEach(item => {
        if (!mergedMap.has(item.name)) mergedMap.set(item.name, item);
      });
      
      const updated = Array.from(mergedMap.values())
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // 최신순
        .slice(0, MAX_HISTORY);

      localStorage.setItem(userKey, JSON.stringify(updated));
    }
    
    // 마이그레이션 완료 후 레거시 키 삭제
    localStorage.removeItem(LEGACY_KEY);
  } catch (err) {
    console.error('Failed to migrate legacy search history:', err);
  }
}

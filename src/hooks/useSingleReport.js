import { useState, useEffect } from 'react';
import { fetchCompanyData, deleteCompanyReportCache } from '../api/companyService';
import {
  migrateLegacySearchHistory,
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches
} from '../utils/searchHistory';

export function useSingleReport({ auth, showToast, setTab }) {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [singleData, setSingleData] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    if (auth.currentUser) {
      migrateLegacySearchHistory(auth.currentUser);
      setRecentSearches(getRecentSearches(auth.currentUser));
    } else {
      setRecentSearches(getRecentSearches(null));
    }
  }, [auth.currentUser]);

  const resetSearch = () => {
    setSingleData(null);
    setSearchInput('');
    setError(null);
  };

  const handleSearch = async (e, keyword, options = {}) => {
    if (e) e.preventDefault();

    // 로딩 중 중복 검색 방지 (레이스 컨디션 차단)
    if (loading) return;

    const query = keyword || searchInput;
    if (!query.trim()) {
      showToast('기업명을 입력해주세요.', 'warning');
      return;
    }

    if (!auth.currentUser) {
      showToast('로그인 후 분석 기능을 이용하실 수 있습니다.', 'info');
      setTab('login');
      return;
    }

    try {
      await auth.trackUsage('search');
    } catch (err) {
      showToast(err.message, 'warning');
      setTab('pricing');
      return;
    }

    if (keyword) setSearchInput(keyword);

    setTab('single');
    setLoading(true);
    setError(null);
    setSingleData(null);
    setStatusMessage('');

    try {
      const searchOptions = { qualityMode: 'deep', ...options };
      const data = await fetchCompanyData(query, setStatusMessage, searchOptions);
      setSingleData(data);

      if (data?.metadata?.composeFailed) {
        showToast('종합 보고서 생성에 실패했습니다. 상세 분석 탭에서 개별 섹션을 확인할 수 있습니다.', 'warning');
      }

      const updatedHistory = addRecentSearch(auth.currentUser, query);
      setRecentSearches(updatedHistory);
    } catch (err) {
      if (err.category === 'AUTH') {
        showToast('로그인이 필요합니다.', 'info');
        setTab('login');
      } else if (err.category === 'USAGE') {
        showToast('일일 사용량을 모두 소진했습니다.', 'warning');
        setTab('pricing');
      } else if (err.category === 'ENTITLEMENT') {
        showToast('프리미엄 요금제에서 제공되는 기능입니다.', 'info');
        setTab('pricing');
      } else {
        setError(`분석 중 오류 발생: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const removeRecentSearchItem = (companyName) => {
    const updated = removeRecentSearch(auth.currentUser, companyName);
    setRecentSearches(updated);
    // 검색 기록 삭제 시 서버 캐시도 함께 삭제 (다음 검색 시 새 분석 보장)
    deleteCompanyReportCache(companyName).catch(() => {});
  };

  const clearRecentSearchHistory = () => {
    const updated = clearRecentSearches(auth.currentUser);
    setRecentSearches(updated);
  };

  const refreshSearch = (companyName) => {
    if (loading) return; // 이미 로딩 중이면 무시
    setSearchInput(companyName);
    handleSearch(null, companyName, { forceRefresh: true, qualityMode: 'deep' });
    showToast(`'${companyName}' 캐시를 초기화하고 새 분석을 시작합니다.`, 'info');
  };

  return {
    searchInput,
    setSearchInput,
    loading,
    error,
    statusMessage,
    singleData,
    recentSearches,
    handleSearch,
    resetSearch,
    removeRecentSearchItem,
    clearRecentSearchHistory,
    refreshSearch
  };
}

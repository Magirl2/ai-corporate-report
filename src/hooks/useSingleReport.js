import { useState } from 'react';
import { fetchCompanyData } from '../api/companyService';

export function useSingleReport({ auth, showToast, setTab }) {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [singleData, setSingleData] = useState(null);

  const resetSearch = () => {
    setSingleData(null);
    setSearchInput('');
    setError(null);
  };

  const handleSearch = async (e, keyword) => {
    if (e) e.preventDefault();
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
      const data = await fetchCompanyData(query, setStatusMessage);
      setSingleData(data);

      try {
        const prev = JSON.parse(localStorage.getItem('ei_recent_searches') || '[]');
        const updated = [
          { name: query, date: new Date().toISOString() },
          ...prev.filter(r => r.name !== query)
        ].slice(0, 5);
        localStorage.setItem('ei_recent_searches', JSON.stringify(updated));
      } catch (_) {}
    } catch (err) {
      setError(`분석 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    searchInput,
    setSearchInput,
    loading,
    error,
    statusMessage,
    singleData,
    handleSearch,
    resetSearch
  };
}

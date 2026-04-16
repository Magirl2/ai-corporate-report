import { useState } from 'react';
import { fetchCompareData } from '../api/companyService';

export function useCompareReport({ auth, showToast, setTab }) {
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [compareDataA, setCompareDataA] = useState(null);
  const [compareDataB, setCompareDataB] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [compareStatus, setCompareStatus] = useState('');

  const handleCompareSearch = async (e) => {
    if (e) e.preventDefault();
    if (!inputA.trim() || !inputB.trim()) {
      showToast('두 기업명을 모두 입력해주세요.', 'warning');
      return;
    }

    if (!auth.currentUser) {
      showToast('로그인 후 비교 분석 기능을 이용하실 수 있습니다.', 'info');
      setTab('login');
      return;
    }

    try {
      await auth.trackUsage('compare');
    } catch (err) {
      showToast(err.message, 'warning');
      setTab('pricing');
      return;
    }

    setCompareLoading(true);
    setCompareError(null);
    setCompareDataA(null);
    setCompareDataB(null);
    setCompareStatus('');

    try {
      const { dataA, dataB } = await fetchCompareData(inputA, inputB, setCompareStatus);
      setCompareDataA(dataA);
      setCompareDataB(dataB);
    } catch (err) {
      setCompareError(`비교 분석 중 오류 발생: ${err.message}`);
    } finally {
      setCompareLoading(false);
    }
  };

  return {
    inputA,
    setInputA,
    inputB,
    setInputB,
    compareDataA,
    compareDataB,
    compareLoading,
    compareError,
    compareStatus,
    handleCompareSearch
  };
}

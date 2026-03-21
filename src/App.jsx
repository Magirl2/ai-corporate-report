import React, { useState, useMemo, useCallback } from 'react';
import { Search, Target, Briefcase, TrendingUp, BarChart2, Newspaper, AlertTriangle, Loader2, Building, Activity, ArrowRightLeft, Timer } from 'lucide-react';

// 우리가 만든 서비스와 컴포넌트들을 불러옵니다.
import { fetchCompanyData } from './api/companyService';
import { safeString, safeSummary, safeDetail, tabClass } from './utils/formatters';
import MarketSentimentBanner from './components/MarketSentimentBanner';
import CompareFinancials from './components/CompareFinancials';
import ExpandableSection from './components/ExpandableSection';
import ExpandableText from './components/ExpandableText';
import SwotMatrix from './components/SwotMatrix'; // 💡 새로 만든 SWOT 표 추가!

export default function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [searchInput, setSearchInput] = useState('');
  const [compareInputA, setCompareInputA] = useState('');
  const [compareInputB, setCompareInputB] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [compareProgress, setCompareProgress] = useState(''); 

  const [singleData, setSingleData] = useState(null);
  const [compareDataA, setCompareDataA] = useState(null);
  const [compareDataB, setCompareDataB] = useState(null);

  const [cooldown, setCooldown] = useState(0);

  // API 과부하 방지 타이머
  const startCooldown = useCallback((seconds) => {
    setCooldown(seconds);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 단일 기업 검색 핸들러
  const handleSingleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim() || cooldown > 0) return;
    setLoading(true); setError(null); setSingleData(null); setStatusMessage('');
    try {
      const data = await fetchCompanyData(searchInput, setStatusMessage);
      setSingleData(data);
    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        startCooldown(60);
        setError("🚨 API 서버 트래픽이 초과되었습니다. 1분 후 다시 시도해 주세요.");
      } else {
        setError(`분석 중 오류 발생: ${err.message}`);
      }
    } finally {
      setLoading(false); setStatusMessage('');
    }
  };

  // 기업 비교 검색 핸들러
  const handleCompareSearch = async (e) => {
    if (e) e.preventDefault();
    if (!compareInputA.trim() || !compareInputB.trim() || cooldown > 0) return;
    setLoading(true); setError(null); setCompareDataA(null); setCompareDataB(null); setStatusMessage('');
    try {
      setCompareProgress(`[1/2] ${compareInputA} 분석 중...`);
      const dataA = await fetchCompanyData(compareInputA, setStatusMessage);
      setCompareDataA(dataA);
      setCompareProgress(`잠시 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      setCompareProgress(`[2/2] ${compareInputB} 분석 중...`);
      const dataB = await fetchCompanyData(compareInputB, setStatusMessage);
      setCompareDataB(dataB);
    } catch (err) {
      setError(`비교 분석 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false); setCompareProgress(''); setStatusMessage('');
    }
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setError(null); };
  const financialMetrics = useMemo(() => Array.isArray(singleData?.report?.financialAnalysis?.keyMetrics) ? singleData.report.financialAnalysis.keyMetrics : [], [singleData]);
  const recentNewsList = useMemo(() => Array.isArray(singleData?.report?.recentNews) ? singleData.report.recentNews : [], [singleData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* 상단 헤더 및 검색창 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md"><BarChart2 size={24} /></div>
            <h1 className="text-xl font-bold text-slate-900">AI 스마트 기업 리포트</h1>
          </div>
          <form onSubmit={activeTab === 'single' ? handleSingleSearch : handleCompareSearch} className="w-full sm:max-w-md relative">
            <input 
              type="text" 
              placeholder="기업명을 입력하세요" 
              className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none"
              value={activeTab === 'single' ? searchInput : `${compareInputA} vs ${compareInputB}`}
              onChange={(e) => activeTab === 'single' ? setSearchInput(e.target.value) : null}
              disabled={loading}
            />
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
          </form>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex space-x-8 mt-2">
          <button onClick={() => handleTabChange('single')} className={tabClass(activeTab === 'single')}>단일 리포트</button>
          <button onClick={() => handleTabChange('compare')} className={tabClass(activeTab === 'compare')}>1:1 비교</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 💡 1. 질문하신 로딩 화면 부분이 여기에 들어갑니다! */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in">
            <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">실시간 데이터 심층 분석 중...</h3>
            <p className="text-slate-500 mb-4 text-sm font-medium">
              유료 AI 모델을 통한 상세 분석으로 <span className="text-blue-600">약 15~30초</span> 정도 소요될 수 있습니다.
            </p>
            {compareProgress && <p className="text-blue-600 font-semibold text-sm mb-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm animate-in fade-in">🔄 {compareProgress}</p>}
            {statusMessage && <p className="text-emerald-600 font-semibold text-sm mb-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm animate-in fade-in">✨ {statusMessage}</p>}
          </div>
        )}

        {/* 에러 메시지 */}
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6">{error}</div>}

        {/* 💡 2. 결과 화면 (여기에 SWOT 표가 들어갑니다!) */}
        {activeTab === 'single' && !loading && singleData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{singleData.companyName}</h2>
            <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <ExpandableSection title="거시적 트렌드" icon={<TrendingUp className="text-blue-500" />} summary={safeSummary(singleData?.macroTrend)} detail={safeDetail(singleData?.macroTrend)} />
                <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-amber-500" />} summary={safeSummary(singleData?.report?.businessModel)} detail={safeDetail(singleData?.report?.businessModel)} />
                
                {/* 💡 새로 추가된 전략적 SWOT 분석 표! */}
                {singleData?.report?.swotAnalysis && (
                  <SwotMatrix swot={singleData.report.swotAnalysis} />
                )}
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-blue-500" /> 재무 지표</h3>
                  <CompareFinancials dataA={singleData} />
                </div>
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Newspaper className="text-indigo-500" /> 최근 뉴스</h3>
                  {recentNewsList.map((news, i) => (
                    <div key={i} className="mb-4 border-b pb-4 last:border-0">
                      <h4 className="font-bold mb-1">{news.headline}</h4>
                      <ExpandableText summary={news.summary} detail={news.detail} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 비교 탭 및 기타 화면은 생략 (기존 구조 유지) */}
      </main>
    </div>
  );
}
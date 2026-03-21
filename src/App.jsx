// src/App.jsx 전체 복사
import React, { useState, useMemo, useCallback } from 'react';
import { Search, Target, Briefcase, TrendingUp, BarChart2, Newspaper, AlertTriangle, Loader2, Building, Activity, ArrowRightLeft, Timer } from 'lucide-react';

// 외부 서비스 및 컴포넌트 호출
import { fetchCompanyData } from './api/companyService';
import { safeString, safeSummary, safeDetail, tabClass } from './utils/formatters';
import MarketSentimentBanner from './components/MarketSentimentBanner';
import CompareFinancials from './components/CompareFinancials';
import ExpandableSection from './components/ExpandableSection';
import ExpandableText from './components/ExpandableText';
import SwotMatrix from './components/SwotMatrix'; 

export default function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [singleData, setSingleData] = useState(null);

  const handleSingleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setLoading(true); setError(null); setSingleData(null); setStatusMessage('');
    try {
      const data = await fetchCompanyData(searchInput, setStatusMessage);
      setSingleData(data);
    } catch (err) {
      setError(`분석 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false); setStatusMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md"><BarChart2 size={24} /></div>
            <h1 className="text-xl font-bold text-slate-900">AI 스마트 기업 리포트</h1>
          </div>
          <form onSubmit={handleSingleSearch} className="w-full sm:max-w-md relative">
            <input 
              type="text" 
              placeholder="기업명을 입력하세요" 
              className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading}
            />
            <Search className="absolute left-4 top-3 text-slate-400" size={18} />
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 로딩 화면 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in">
            <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">실시간 데이터 심층 분석 중...</h3>
            <p className="text-slate-500 mb-4 text-sm font-medium">
              유료 AI 모델을 통한 상세 분석으로 <span className="text-blue-600">약 15~30초</span> 정도 소요될 수 있습니다.
            </p>
            {statusMessage && <p className="text-emerald-600 font-semibold text-sm mb-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 shadow-sm animate-in fade-in">✨ {statusMessage}</p>}
          </div>
        )}

        {/* 에러 화면 */}
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6">{error}</div>}

        {/* 결과 화면 */}
        {!loading && singleData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{singleData.companyName}</h2>
            <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <ExpandableSection title="거시적 트렌드" icon={<TrendingUp className="text-blue-500" />} summary={safeSummary(singleData?.macroTrend)} detail={safeDetail(singleData?.macroTrend)} />
                <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-amber-500" />} summary={safeSummary(singleData?.report?.businessModel)} detail={safeDetail(singleData?.report?.businessModel)} />
                
                {/* SWOT 분석 표 */}
                {singleData?.report?.swotAnalysis && <SwotMatrix swot={singleData.report.swotAnalysis} />}
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border shadow-sm">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-blue-500" /> 핵심 지표 분석</h3>
                  <ExpandableText summary={safeSummary(singleData?.report?.financialAnalysis?.overview)} detail={safeDetail(singleData?.report?.financialAnalysis?.overview)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
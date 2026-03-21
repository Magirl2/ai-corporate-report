import React, { useState } from 'react';
import { Search, Loader2, TrendingUp, Briefcase, Activity, Newspaper, Target, Building2, AlertTriangle } from 'lucide-react';
import { fetchCompanyData } from './api/companyService';
import { safeSummary, safeDetail, tabClass } from './utils/formatters';
import MarketSentimentBanner from './components/MarketSentimentBanner';
import ExpandableSection from './components/ExpandableSection';
import ExpandableText from './components/ExpandableText';
import SwotMatrix from './components/SwotMatrix';
import CompareFinancials from './components/CompareFinancials';

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [singleData, setSingleData] = useState(null);
  const [tab, setTab] = useState('single');
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [compareDataA, setCompareDataA] = useState(null);
  const [compareDataB, setCompareDataB] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [compareStatus, setCompareStatus] = useState('');

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setLoading(true); setError(null); setSingleData(null); setStatusMessage('');
    try {
      const data = await fetchCompanyData(searchInput, setStatusMessage);
      setSingleData(data);
    } catch (err) {
      setError(`분석 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareSearch = async (e) => {
    if (e) e.preventDefault();
    if (!inputA.trim() || !inputB.trim()) return;
    setCompareLoading(true); setCompareError(null); setCompareDataA(null); setCompareDataB(null); setCompareStatus('');
    try {
      const [dataA, dataB] = await Promise.all([
        fetchCompanyData(inputA, (msg) => setCompareStatus(msg)),
        fetchCompanyData(inputB, (msg) => setCompareStatus(msg)),
      ]);
      setCompareDataA(dataA);
      setCompareDataB(dataB);
    } catch (err) {
      setCompareError(`비교 분석 중 오류 발생: ${err.message}`);
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 relative">
      <header className="bg-white sticky top-0 z-20 py-5 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-center relative">
          {tab === 'single' && (
            <form onSubmit={handleSearch} className="w-full max-w-4xl relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="AI 스마트 기업 리포트 | 기업명을 입력하세요 (예: 삼성전자, SK하이닉스)"
                className="w-full pl-14 pr-16 py-5 text-lg border border-slate-200 rounded-full outline-none focus:ring-2 focus:ring-blue-300 shadow-md bg-white transition-all duration-300 placeholder:text-slate-400"
              />
              <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Building2 className="text-blue-600" size={32} strokeWidth={2.5}/>
              </div>
              <button type="submit" className="absolute right-3 top-3 bottom-3 p-3 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition">
                <Search size={24} />
              </button>
            </form>
          )}
          {tab === 'compare' && (
            <div className="w-full max-w-4xl relative flex items-center justify-center gap-2 border border-slate-200 rounded-full p-4 shadow-md bg-white">
               <Building2 className="text-blue-600" size={32} strokeWidth={2.5}/>
               <h1 className="text-2xl font-black text-slate-900 mx-2">기업 비교 (VS)</h1>
            </div>
          )}
        </div>
      </header>

      <nav className="bg-white border-b px-4 z-10 sticky top-[96px]">
        <div className="max-w-7xl mx-auto flex gap-10 justify-center">
          <button onClick={() => setTab('single')} className={tabClass(tab === 'single')}>단일 기업 보고서</button>
          <button onClick={() => setTab('compare')} className={tabClass(tab === 'compare')}>기업 비교</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'single' && (
          <>
            {loading && (
              <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="text-lg font-bold">{statusMessage || '분석 중...'}</p>
              </div>
            )}
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-6">{error}</div>}
            {!loading && !singleData && !error && (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                <div className="w-20 h-20 mb-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                  <Building2 size={40} className="text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-600 mb-2">글로벌 기업 인사이트 분석</h2>
                <p className="text-sm max-w-xs leading-relaxed">미국 기업은 FMP, 한국 기업은 DART 전자공시 기반으로 최신 동향을 빠르게 수집합니다.</p>
              </div>
            )}
            {!loading && singleData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-4xl font-black text-slate-900">{singleData.companyName}</h2>
                <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ExpandableSection title="거시적 트렌드" icon={<TrendingUp className="text-blue-500" />} summary={safeSummary(singleData?.macroTrend)} detail={safeDetail(singleData?.macroTrend)} />
                    <ExpandableSection title="비전 및 핵심 가치" icon={<Target className="text-purple-500" />} summary={safeSummary(singleData?.report?.vision)} detail={safeDetail(singleData?.report?.vision)} />
                    <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-amber-500" />} summary={safeSummary(singleData?.report?.businessModel)} detail={safeDetail(singleData?.report?.businessModel)} />
                    <ExpandableSection title="해당 산업 현황" icon={<Building2 className="text-cyan-500" />} summary={safeSummary(singleData?.report?.industryStatus)} detail={safeDetail(singleData?.report?.industryStatus)} />
                    {singleData.report?.swotAnalysis && <SwotMatrix swot={singleData.report.swotAnalysis} />}
                  </div>
                  <div className="space-y-6">
                    <ExpandableSection title="시장 리스크 & 전망" icon={<AlertTriangle className="text-rose-500" />} summary={safeSummary(singleData?.report?.riskOutlook)} detail={safeDetail(singleData?.report?.riskOutlook)} />
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-emerald-500" /> 재무 분석</h3>
                      <ExpandableText summary={safeSummary(singleData.report?.financialAnalysis?.overview)} detail={safeDetail(singleData.report?.financialAnalysis?.overview)} />
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Newspaper className="text-indigo-500" /> 주요 뉴스</h3>
                      {(singleData.report?.recentNews || []).map((news, i) => (
                        <div key={i} className="mb-4 border-b pb-4 last:border-0">
                          <h4 className="font-bold">{news.headline}</h4>
                          <ExpandableText summary={news.summary} detail={news.detail} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'compare' && (
          <>
            <form onSubmit={handleCompareSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="relative flex-1">
                <input type="text" value={inputA} onChange={(e) => setInputA(e.target.value)}
                  placeholder="기업 A" className="w-full pl-10 pr-4 py-2 border rounded-full outline-none focus:ring-2 focus:ring-blue-500" />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
              </div>
              <div className="relative flex-1">
                <input type="text" value={inputB} onChange={(e) => setInputB(e.target.value)}
                  placeholder="기업 B" className="w-full pl-10 pr-4 py-2 border rounded-full outline-none focus:ring-2 focus:ring-rose-400" />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
              </div>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors">비교 분석</button>
            </form>
            {!compareLoading && !compareDataA && !compareDataB && !compareError && (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                <div className="w-20 h-20 mb-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                  <Building2 size={40} className="text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-600 mb-2">기업 1:1 비교 분석</h2>
                <p className="text-sm max-w-xs leading-relaxed">두 기업명을 입력하면 재무 지표를 나란히 비교해 드립니다.</p>
              </div>
            )}
            {compareLoading && (
              <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="text-lg font-bold">{compareStatus || '분석 중...'}</p>
              </div>
            )}
            {compareError && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-6">{compareError}</div>}
            {!compareLoading && compareDataA && compareDataB && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-center gap-6 text-2xl font-black">
                  <span className="text-blue-700">{compareDataA.companyName}</span>
                  <span className="text-slate-400">VS</span>
                  <span className="text-rose-700">{compareDataB.companyName}</span>
                </div>
                <CompareFinancials dataA={compareDataA} dataB={compareDataB} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
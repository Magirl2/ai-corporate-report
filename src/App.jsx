// src/App.jsx
import React, { useState } from 'react';
import { Search, BarChart2, Loader2, TrendingUp, Briefcase, Activity, Newspaper, Target, Building2, AlertTriangle } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* 상단 레이아웃 통합 헤더 */}
      <header className="bg-white border-b sticky top-0 z-20 pt-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* 1층: 로고(왼쪽)와 검색창(오른쪽) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <BarChart2 size={20} />
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">AI 스마트 기업 리포트</h1>
            </div>
            
            <form onSubmit={handleSearch} className="relative w-full max-w-[280px]">
              <input 
                type="text" 
                value={searchInput} 
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="기업명을 입력하세요" 
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-full outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
              <Search className="absolute left-3 top-2 text-slate-400" size={16} />
            </form>
          </div>

          {/* 2층: 탭 메뉴 (왼쪽 정렬) */}
          <nav className="flex gap-6">
            <button 
              onClick={() => setTab('single')} 
              className={tabClass(tab === 'single')}
            >
              단일 기업 보고서
            </button>
            <button 
              onClick={() => setTab('compare')} 
              className={tabClass(tab === 'compare')}
            >
              기업 1:1 비교 (VS)
            </button>
          </nav>
        </div>
      </header>

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
            
            {/* 개선된 레이아웃: 논리적 배치 & 뉴스 카드 그리드 적용 */}
            {!loading && singleData && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                
                {/* 헤더 영역 */}
                <div className="border-b pb-6">
                  <h2 className="text-4xl font-black text-slate-900 mb-4">{singleData.companyName}</h2>
                  <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />
                </div>

                {/* 1층: 기업 개요 (기본 아이덴티티) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ExpandableSection title="비전 및 핵심 가치" icon={<Target className="text-purple-500" />} summary={safeSummary(singleData?.report?.vision)} detail={safeDetail(singleData?.report?.vision)} />
                  <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-amber-500" />} summary={safeSummary(singleData?.report?.businessModel)} detail={safeDetail(singleData?.report?.businessModel)} />
                </div>

                {/* 2층: 심층 분석 (좌: 외부 환경 / 우: 내부 역량) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* 좌측: 시장 및 산업 환경 (External) */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-700 border-l-4 border-blue-500 pl-3">시장 및 산업 환경</h3>
                    <ExpandableSection title="거시적 트렌드" icon={<TrendingUp className="text-blue-500" />} summary={safeSummary(singleData?.macroTrend)} detail={safeDetail(singleData?.macroTrend)} />
                    <ExpandableSection title="해당 산업 현황" icon={<Building2 className="text-cyan-500" />} summary={safeSummary(singleData?.report?.industryStatus)} detail={safeDetail(singleData?.report?.industryStatus)} />
                    <ExpandableSection title="시장 리스크 & 전망" icon={<AlertTriangle className="text-rose-500" />} summary={safeSummary(singleData?.report?.riskOutlook)} detail={safeDetail(singleData?.report?.riskOutlook)} />
                  </div>

                  {/* 우측: 기업 내부 및 재무 분석 (Internal) */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-700 border-l-4 border-emerald-500 pl-3">내부 역량 및 재무</h3>
                    {singleData.report?.swotAnalysis && <SwotMatrix swot={singleData.report.swotAnalysis} />}
                    <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Activity className="text-emerald-500" /> 재무 분석 요약</h3>
                      <div className="text-slate-600 leading-relaxed">
                        <ExpandableText summary={safeSummary(singleData.report?.financialAnalysis?.overview)} detail={safeDetail(singleData.report?.financialAnalysis?.overview)} />
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3층: 최신 뉴스 (카드 그리드 형태) */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm mt-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Newspaper className="text-indigo-500" /> 최근 주요 뉴스</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(singleData.report?.recentNews || []).map((news, i) => (
                      <div key={i} className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col h-full hover:bg-slate-100 transition-colors">
                        <h4 className="font-bold text-slate-800 mb-3 line-clamp-2">{news.headline}</h4>
                        <div className="text-sm text-slate-600 leading-relaxed flex-grow">
                          <ExpandableText summary={news.summary} detail={news.detail} />
                        </div>
                      </div>
                    ))}
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
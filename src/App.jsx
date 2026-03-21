import React, { useState } from 'react';
import { Search, BarChart2, Loader2, TrendingUp, Briefcase, Activity, Newspaper, Target, Building2, AlertTriangle } from 'lucide-react';
import { fetchCompanyData } from './api/companyService';
import { safeSummary, safeDetail, tabClass } from './utils/formatters';
import MarketSentimentBanner from './components/MarketSentimentBanner';
// 💡 더 이상 사용하지 않는 ExpandableSection import 제거
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
      <header className="bg-white border-b sticky top-0 z-20 pt-4 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                <BarChart2 size={20} />
              </div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">AI 스마트 기업 리포트</h1>
            </div>
            
            <form onSubmit={handleSearch} className="relative w-full max-w-[320px]">
              <input 
                type="text" 
                value={searchInput} 
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="정확한 종목명을 입력하세요 (예: 삼성전자)" 
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-full outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
              />
              <Search className="absolute left-3 top-2 text-slate-400" size={16} />
            </form>
          </div>

          <nav className="flex gap-6">
            <button onClick={() => setTab('single')} className={tabClass(tab === 'single')}>단일 기업 보고서</button>
            <button onClick={() => setTab('compare')} className={tabClass(tab === 'compare')}>기업 1:1 비교 (VS)</button>
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

            {!loading && singleData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-4xl font-black text-slate-900">{singleData.companyName}</h2>
                <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 왼쪽 컬럼: 모든 섹션을 동일한 ExpandableText 구조로 통일 */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-500" /> 거시적 트렌드
                      </h3>
                      <ExpandableText summary={safeSummary(singleData?.macroTrend)} detail={safeDetail(singleData?.macroTrend)} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Target className="text-purple-500" /> 비전 및 핵심 가치
                      </h3>
                      <ExpandableText summary={safeSummary(singleData?.report?.vision)} detail={safeDetail(singleData?.report?.vision)} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Briefcase className="text-amber-500" /> 비즈니스 모델
                      </h3>
                      <ExpandableText summary={safeSummary(singleData?.report?.businessModel)} detail={safeDetail(singleData?.report?.businessModel)} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Building2 className="text-cyan-500" /> 해당 산업 현황
                      </h3>
                      <ExpandableText summary={safeSummary(singleData?.report?.industryStatus)} detail={safeDetail(singleData?.report?.industryStatus)} />
                    </div>

                    {singleData.report?.swotAnalysis && <SwotMatrix swot={singleData.report.swotAnalysis} />}
                  </div>

                  {/* 오른쪽 컬럼 */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" /> 시장 리스크 & 전망
                      </h3>
                      <ExpandableText summary={safeSummary(singleData?.report?.riskOutlook)} detail={safeDetail(singleData?.report?.riskOutlook)} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity className="text-emerald-500" /> 재무 분석
                      </h3>
                      <ExpandableText summary={safeSummary(singleData.report?.financialAnalysis?.overview)} detail={safeDetail(singleData.report?.financialAnalysis?.overview)} />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Newspaper className="text-indigo-500" /> 주요 뉴스
                      </h3>
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
            {compareLoading && (
              <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="text-lg font-bold">{compareStatus || '분석 중...'}</p>
              </div>
            )}
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
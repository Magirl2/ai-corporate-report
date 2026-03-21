import React, { useState, useMemo, useCallback } from 'react';
import { Search, Target, Briefcase, TrendingUp, BarChart2, Newspaper, AlertTriangle, Loader2, Building, Activity, ArrowRightLeft, Timer } from 'lucide-react';

// 외부 분리 파일 Import
import { fetchCompanyData } from './api/companyService';
import { safeString, safeSummary, safeDetail, tabClass } from './utils/formatters';
import MarketSentimentBanner from './components/MarketSentimentBanner';
import CompareFinancials from './components/CompareFinancials';
import ExpandableSection from './components/ExpandableSection';
import ExpandableText from './components/ExpandableText';

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
        setError("🚨 API 서버 트래픽이 초과되었습니다. 시스템 보호를 위해 1분간 검색이 차단됩니다.");
      } else {
        setError(`분석 중 오류 발생: ${err.message}`);
      }
    } finally {
      setLoading(false); setStatusMessage('');
    }
  };

  const handleCompareSearch = async (e) => {
    if (e) e.preventDefault();
    if (!compareInputA.trim() || !compareInputB.trim() || cooldown > 0) return;

    setLoading(true); setError(null); setCompareDataA(null); setCompareDataB(null); setStatusMessage('');
    
    try {
      setCompareProgress(`[1/2] ${compareInputA} 분석 중...`);
      const dataA = await fetchCompanyData(compareInputA, setStatusMessage);
      setCompareDataA(dataA);

      setCompareProgress(`과부하 방지를 위해 잠시 대기 중...`);
      await new Promise(resolve => setTimeout(resolve, 5000));

      setCompareProgress(`[2/2] ${compareInputB} 분석 중...`);
      const dataB = await fetchCompanyData(compareInputB, setStatusMessage);
      setCompareDataB(dataB);
      
    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        startCooldown(60);
        setError("🚨 API 서버 트래픽이 초과되었습니다. 시스템 보호를 위해 1분간 검색이 차단됩니다.");
      } else {
        setError(`분석 중 오류 발생: ${err.message}`);
      }
    } finally {
      setLoading(false); setCompareProgress(''); setStatusMessage('');
    }
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setError(null); };

  const financialMetrics = useMemo(() => Array.isArray(singleData?.report?.financialAnalysis?.keyMetrics) ? singleData.report.financialAnalysis.keyMetrics : [], [singleData]);
  const recentNewsList = useMemo(() => Array.isArray(singleData?.report?.recentNews) ? singleData.report.recentNews : [], [singleData]);

  const searchDisabled = loading || cooldown > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
              <BarChart2 size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">AI 스마트 기업 리포트</h1>
          </div>

          {activeTab === 'single' ? (
            <form onSubmit={handleSingleSearch} className="w-full sm:max-w-md relative">
              <input 
                type="text" 
                placeholder={cooldown > 0 ? `트래픽 제한: ${cooldown}초 후 검색 가능` : "기업명 입력 (예: 엔비디아, 삼성전자)"} 
                className={`w-full pl-11 pr-4 py-2.5 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm transition-colors ${cooldown > 0 ? 'bg-rose-50 border-rose-200 text-rose-700 placeholder:text-rose-400 font-bold cursor-not-allowed' : 'border-slate-300'}`} 
                value={searchInput} 
                onChange={(e) => setSearchInput(e.target.value)} 
                disabled={searchDisabled} 
              />
              {cooldown > 0 ? <Timer className="absolute left-4 top-3 text-rose-500" size={18} /> : <Search className="absolute left-4 top-3 text-slate-400" size={18} />}
            </form>
          ) : (
            <form onSubmit={handleCompareSearch} className="w-full sm:max-w-xl flex items-center gap-2">
              <input type="text" placeholder={cooldown > 0 ? "대기 중..." : "A 기업"} className={`w-full px-4 py-2 border rounded-l-full focus:outline-none focus:ring-2 shadow-sm text-sm ${cooldown > 0 ? 'bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed' : 'border-blue-200 focus:ring-blue-500'}`} value={compareInputA} onChange={(e) => setCompareInputA(e.target.value)} disabled={searchDisabled} />
              <div className="bg-slate-100 text-slate-500 font-black px-3 py-2 rounded-md text-xs border border-slate-200 shadow-inner flex items-center gap-1">VS</div>
              <input type="text" placeholder={cooldown > 0 ? `${cooldown}초 남음` : "B 기업"} className={`w-full px-4 py-2 border rounded-r-full focus:outline-none focus:ring-2 shadow-sm text-sm ${cooldown > 0 ? 'bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed' : 'border-rose-200 focus:ring-rose-500'}`} value={compareInputB} onChange={(e) => setCompareInputB(e.target.value)} disabled={searchDisabled} />
              <button type="submit" disabled={searchDisabled} className="ml-2 bg-slate-900 text-white p-2.5 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:bg-slate-400">
                {cooldown > 0 ? <Timer size={18} /> : <Search size={18} />}
              </button>
            </form>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 mt-2">
          <button onClick={() => handleTabChange('single')} className={tabClass(activeTab === 'single')}>단일 기업 보고서</button>
          <button onClick={() => handleTabChange('compare')} className={tabClass(activeTab === 'compare')}>기업 1:1 비교 (VS)</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {cooldown > 0 && !loading && (
          <div className="bg-rose-50 text-rose-700 p-5 rounded-2xl border border-rose-200 flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 shadow-sm animate-in fade-in slide-in-from-top-4">
            <Timer className="animate-pulse text-rose-500 shrink-0" size={28} />
            <div className="text-center sm:text-left">
              <p className="font-extrabold text-lg">서버 과부하 보호 시스템 가동 중</p>
              <p className="text-sm font-medium mt-1 opacity-80">안정적인 데이터 수집을 위해 <strong className="text-rose-600 text-lg mx-1">{cooldown}</strong>초 후 검색이 다시 활성화됩니다.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-blue-600 mb-6" size={56} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">실시간 데이터 분석 중...</h3>
            {compareProgress && <p className="text-blue-600 font-semibold text-sm mb-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 animate-in fade-in">🔄 {compareProgress}</p>}
            {statusMessage && <p className="text-emerald-600 font-semibold text-sm mb-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 animate-in fade-in">✨ {statusMessage}</p>}
          </div>
        )}

        {error && !cooldown && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3 mb-6">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1"><p className="font-medium text-sm leading-relaxed">{error}</p></div>
          </div>
        )}

        {activeTab === 'single' && !loading && !error && !singleData && cooldown === 0 && (
          <div className="text-center py-32 animate-in fade-in">
            <Building className="mx-auto text-slate-300 mb-6" size={80} />
            <h2 className="text-3xl font-bold text-slate-700 mb-3">글로벌 기업 인사이트 분석</h2>
            <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">미국 기업은 FMP, 한국 기업은 DART 전자공시 기반으로 최신 동향을 완벽하게 수집합니다.</p>
          </div>
        )}

        {activeTab === 'single' && !loading && singleData && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-4">
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">{singleData.companyName}</h2>
              <span className="text-sm text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 font-semibold flex items-center w-fit gap-2"><Target size={14} /> FMP & DART 통합 분석 완료</span>
            </div>

            <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <ExpandableSection title="거시적 트렌드" icon={<TrendingUp className="text-blue-500" />} summary={safeSummary(singleData?.macroTrend)} detail={safeDetail(singleData?.macroTrend)} />
                <ExpandableSection title="비전 및 핵심 가치" icon={<Target className="text-purple-500" />} summary={safeSummary(singleData?.report?.vision)} detail={safeDetail(singleData?.report?.vision)} />
                <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-amber-500" />} summary={safeSummary(singleData?.report?.businessModel)} detail={safeDetail(singleData?.report?.businessModel)} />
                <ExpandableSection title="해당 산업 현황" icon={<BarChart2 className="text-emerald-500" />} summary={safeSummary(singleData?.report?.industryStatus)} detail={safeDetail(singleData?.report?.industryStatus)} />
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50"><Activity className="text-blue-500" size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-800">최근 재무 지표</h3>
                  </div>
                  {financialMetrics.length > 0 && (
                    <div className="overflow-x-auto mb-6 bg-slate-50 rounded-xl p-1 border border-slate-100">
                      <table className="w-full text-sm text-center">
                        <thead className="text-xs text-slate-500 uppercase border-b bg-slate-100/50">
                          <tr><th className="px-2 py-3">연도</th><th className="px-2 py-3">매출성장</th><th className="px-2 py-3">이익률</th><th className="px-2 py-3">부채율</th><th className="px-2 py-3 text-purple-700">ROE</th><th className="px-2 py-3 text-emerald-700">EPS</th></tr>
                        </thead>
                        <tbody>
                          {financialMetrics.map((metric, idx) => (
                            <tr key={idx} className="border-b last:border-0 bg-white">
                              <td className="px-2 py-3 font-bold">{safeString(metric?.year)}</td>
                              <td className="px-2 py-3 text-emerald-600">{safeString(metric?.revenueGrowth)}</td>
                              <td className="px-2 py-3">{safeString(metric?.operatingMargin)}</td>
                              <td className="px-2 py-3">{safeString(metric?.debtRatio)}</td>
                              <td className="px-2 py-3 font-bold text-purple-600 bg-purple-50/30">{safeString(metric?.roe)}</td>
                              <td className="px-2 py-3 font-bold text-emerald-600 bg-emerald-50/30">{safeString(metric?.eps)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <ExpandableText summary={safeSummary(singleData?.report?.financialAnalysis?.overview)} detail={safeDetail(singleData?.report?.financialAnalysis?.overview)} />
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-50"><Newspaper className="text-indigo-500" size={24} /></div>
                    <h3 className="text-xl font-bold text-slate-800">최근 주요 뉴스</h3>
                  </div>
                  <div className="space-y-4">
                    {recentNewsList.map((news, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <h4 className="font-bold text-slate-900 mb-2">{news?.headline}</h4>
                        <ExpandableText summary={safeSummary(news)} detail={safeDetail(news)} />
                      </div>
                    ))}
                  </div>
                </div>

                <ExpandableSection title="시장 리스크 & 전망" icon={<AlertTriangle className="text-rose-500" />} summary={safeSummary(singleData?.report?.marketRiskAndOutlook)} detail={safeDetail(singleData?.report?.marketRiskAndOutlook)} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && !loading && !error && !compareDataA && !compareDataB && cooldown === 0 && (
          <div className="text-center py-32 animate-in fade-in">
            <ArrowRightLeft className="mx-auto text-slate-300 mb-6" size={80} />
            <h2 className="text-3xl font-bold text-slate-700 mb-3">기업 1:1 진검승부</h2>
            <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">상단 검색창에 라이벌 기업 두 곳을 입력하여 핵심 지표와 분석을 나란히 비교해 보세요.</p>
          </div>
        )}

        {activeTab === 'compare' && !loading && (compareDataA || compareDataB) && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-6 border-b border-slate-200">
              <h2 className="text-3xl md:text-5xl font-extrabold text-blue-700 tracking-tight text-center md:text-right flex-1">
                {compareDataA?.companyName ?? compareInputA}
                {!compareDataA && <span className="text-base text-red-400 ml-2">(수집 실패)</span>}
              </h2>
              <div className="bg-slate-900 text-white font-black text-xl px-4 py-2 rounded-xl shadow-lg skew-x-[-10deg]">VS</div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-rose-700 tracking-tight text-center md:text-left flex-1">
                {compareDataB?.companyName ?? compareInputB}
                {!compareDataB && <span className="text-base text-red-400 ml-2">(수집 실패)</span>}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <MarketSentimentBanner sentiment={compareDataA?.report?.marketSentiment} />
              <MarketSentimentBanner sentiment={compareDataB?.report?.marketSentiment} />
            </div>

            {compareDataA && compareDataB && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 justify-center"><Activity className="text-emerald-500" /> 최근 핵심 재무 지표</h3>
                <CompareFinancials dataA={compareDataA} dataB={compareDataB} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {compareDataA && (
                  <>
                    <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-blue-500" />} summary={safeSummary(compareDataA.report?.businessModel)} detail={safeDetail(compareDataA.report?.businessModel)} />
                    <ExpandableSection title="산업 현황" icon={<Target className="text-blue-500" />} summary={safeSummary(compareDataA.report?.industryStatus)} detail={safeDetail(compareDataA.report?.industryStatus)} />
                    <ExpandableSection title="리스크 & 전망" icon={<AlertTriangle className="text-blue-500" />} summary={safeSummary(compareDataA.report?.marketRiskAndOutlook)} detail={safeDetail(compareDataA.report?.marketRiskAndOutlook)} />
                  </>
                )}
              </div>
              <div className="space-y-6">
                {compareDataB && (
                  <>
                    <ExpandableSection title="비즈니스 모델" icon={<Briefcase className="text-rose-500" />} summary={safeSummary(compareDataB.report?.businessModel)} detail={safeDetail(compareDataB.report?.businessModel)} />
                    <ExpandableSection title="산업 현황" icon={<Target className="text-rose-500" />} summary={safeSummary(compareDataB.report?.industryStatus)} detail={safeDetail(compareDataB.report?.industryStatus)} />
                    <ExpandableSection title="리스크 & 전망" icon={<AlertTriangle className="text-rose-500" />} summary={safeSummary(compareDataB.report?.marketRiskAndOutlook)} detail={safeDetail(compareDataB.report?.marketRiskAndOutlook)} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

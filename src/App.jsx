import React, { useState } from 'react';
import { Search, BarChart2, Loader2, TrendingUp, Briefcase, Activity, Newspaper, Target, Building2, AlertTriangle } from 'lucide-react';
import { fetchCompanyData } from './api/companyService';
import { safeSummary, safeDetail, tabClass } from './utils/formatters';
import MarketSentimentBanner from './components/MarketSentimentBanner';
import ExpandableSection from './components/ExpandableSection';
import ExpandableText from './components/ExpandableText';
import SwotMatrix from './components/SwotMatrix';

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [singleData, setSingleData] = useState(null);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <header className="bg-white border-b sticky top-0 z-10 p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="text-blue-600" size={32} />
            <h1 className="text-xl font-bold">AI 스마트 기업 리포트</h1>
          </div>
          <form onSubmit={handleSearch} className="w-full sm:max-w-md relative">
            <input 
              type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="기업명을 입력하세요" className="w-full pl-10 pr-4 py-2 border rounded-full outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
            <p className="text-lg font-bold">{statusMessage || '분석 중...'}</p>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-6">{error}</div>}

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
                <ExpandableSection title="시장 리스크 &amp; 전망" icon={<AlertTriangle className="text-rose-500" />} summary={safeSummary(singleData?.report?.riskOutlook)} detail={safeDetail(singleData?.report?.riskOutlook)} />
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
      </main>
    </div>
  );
}
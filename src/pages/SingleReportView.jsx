import React, { useState } from 'react';
import MarketSentimentBanner from '../components/MarketSentimentBanner';

const COLOR_MAP = {
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', fill: 'bg-cyan-50' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', fill: 'bg-purple-50' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', fill: 'bg-blue-50' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', fill: 'bg-amber-50' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', fill: 'bg-rose-50' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', fill: 'bg-emerald-50' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', fill: 'bg-slate-100' }
};

const BentoCard = ({ icon, title, color, children, className = '' }) => {
  const theme = COLOR_MAP[color] || COLOR_MAP.slate;
  
  return (
    <section className={`bg-surface-container-lowest p-8 rounded-lg shadow-[0px_24px_48px_-12px_rgba(11,28,48,0.04)] relative overflow-hidden group ${className}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500 ${theme.fill}`}></div>
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined p-2 rounded-lg ${theme.bg} ${theme.text}`}>{icon}</span>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <span className="material-symbols-outlined text-slate-300">expand_more</span>
        </div>
        <div className="flex-1 space-y-4 text-on-surface-variant leading-relaxed">
          {children}
        </div>
      </div>
    </section>
  );
};

export default function SingleReportView({ singleData }) {
  const [reportSubTab, setReportSubTab] = useState('analysis');
  if (!singleData) return null;

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '년', 1).replace(/\./g, '월', 1).replace(/\./g, '일').replace(/\s/g, ' ');
  const yearly = singleData.financeData?.yearlyMetrics || singleData.dartFinance?.yearlyMetrics;

  return (
    <div className="mt-8 mx-auto w-full flex-1 animate-in fade-in slide-in-from-bottom-8">
      {/* Report Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-primary-container/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
              {singleData.ticker ? singleData.ticker : 'REPORT'}
            </span>
            <span className="text-on-surface-variant font-medium">{today}</span>
          </div>
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline">{singleData.companyName} 분석 보고서</h2>
        </div>
        {/* Market Sentiment Banner */}
        <MarketSentimentBanner sentiment={singleData.report?.marketSentiment} />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-8 mb-8 border-b border-slate-200">
        <button 
          onClick={() => setReportSubTab('analysis')}
          className={`pb-4 border-b-4 font-bold text-lg transition-all ${reportSubTab === 'analysis' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          상세 분석
        </button>
        <button 
          onClick={() => setReportSubTab('sources')}
          className={`pb-4 border-b-4 font-bold text-lg transition-all ${reportSubTab === 'sources' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          사용 정보 (출처)
        </button>
      </div>

      {/* Details/Analysis Tab */}
      {reportSubTab === 'analysis' ? (
        <div className="bento-grid">
          <BentoCard icon="public" title="거시적 트렌드 (PESTLE 기반)" color="cyan">
            {singleData.macroTrend?.detail ? (
              <div className="space-y-2">
                <p className="font-bold text-primary">{singleData.macroTrend.summary}</p>
                <p className="whitespace-pre-wrap text-sm">{singleData.macroTrend.detail}</p>
              </div>
            ) : <p className="text-slate-400 text-sm">데이터 없음</p>}
          </BentoCard>

          <BentoCard icon="visibility" title="제품 비전 및 로드맵" color="purple">
            {singleData.report?.vision?.detail ? (
              <div className="space-y-2">
                <p className="font-bold text-primary">{singleData.report.vision.summary}</p>
                <p className="whitespace-pre-wrap text-sm">{singleData.report.vision.detail}</p>
              </div>
            ) : <p className="text-slate-400 text-sm">데이터 없음</p>}
          </BentoCard>

          <BentoCard icon="account_tree" title="비즈니스 모델 (캔버스 기반)" color="blue">
            {singleData.report?.businessModel?.detail ? (
              <div className="space-y-2">
                <p className="font-bold text-primary">{singleData.report.businessModel.summary}</p>
                <p className="whitespace-pre-wrap text-sm">{singleData.report.businessModel.detail}</p>
              </div>
            ) : <p className="text-slate-400 text-sm">데이터 없음</p>}
          </BentoCard>

          <BentoCard icon="factory" title="해당 산업 현황 (5 Forces 기반)" color="amber">
            {singleData.report?.industryStatus?.detail ? (
              <div className="space-y-2">
                <p className="font-bold text-primary">{singleData.report.industryStatus.summary}</p>
                <p className="whitespace-pre-wrap text-sm">{singleData.report.industryStatus.detail}</p>
              </div>
            ) : <p className="text-slate-400 text-sm">데이터 없음</p>}
          </BentoCard>

          {/* Financial Analysis */}
          <BentoCard icon="finance" title="재무 분석 (Financial Analysis)" color="emerald" className="col-span-1 lg:col-span-2">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                {singleData.report?.financialAnalysis?.overview ? (
                  <div className="p-4 bg-primary-container/5 rounded-xl border-l-4 border-primary mb-6">
                    <p className="text-sm leading-relaxed text-on-surface">
                      <span className="font-bold text-primary mr-2">AI Insight:</span>
                      {singleData.report.financialAnalysis.overview}
                    </p>
                  </div>
                ) : null}

                {yearly?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-low">
                          <th className="p-4 font-bold text-on-surface border-b border-slate-100 rounded-tl-xl text-sm">구분</th>
                          {yearly.map((y, i) => (
                            <th key={y.year} className={`p-4 font-bold border-b border-slate-100 text-sm ${i === yearly.length - 1 ? 'text-primary rounded-tr-xl' : 'text-on-surface'}`}>{y.year}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b border-slate-50 font-medium text-slate-500 text-sm">매출 성장률</td>
                          {yearly.map(y => <td key={y.year} className="p-4 border-b border-slate-50 text-sm">{y.revenueGrowth ?? '-'}</td>)}
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b border-slate-50 font-medium text-slate-500 text-sm">영업이익률</td>
                          {yearly.map(y => <td key={y.year} className="p-4 border-b border-slate-50 text-sm">{y.operatingMargin ?? '-'}</td>)}
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b border-slate-50 font-medium text-slate-500 text-sm">부채비율</td>
                          {yearly.map(y => <td key={y.year} className="p-4 border-b border-slate-50 text-sm">{y.debtRatio ?? '-'}</td>)}
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-b border-slate-50 font-medium text-slate-500 text-sm">ROE</td>
                          {yearly.map(y => <td key={y.year} className="p-4 border-b border-slate-50 text-sm">{y.roe ?? '-'}</td>)}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-slate-400 text-sm p-4">재무 지표가 제공되지 않았습니다.</p>}
              </div>
            </div>
          </BentoCard>

          {/* SWOT Matrix */}
          <BentoCard icon="grid_view" title="SWOT Matrix" color="slate">
            <div className="grid grid-cols-2 gap-2 flex-1">
              <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 flex flex-col justify-center gap-1 group/swot">
                <p className="text-[10px] font-black text-emerald-700 mb-1">STRENGTHS (강점)</p>
                <p className="text-xs font-bold text-emerald-900">{singleData.report?.swotAnalysis?.strength?.summary || '내용 없음'}</p>
                <p className="text-[11px] font-medium text-emerald-800 opacity-80 group-hover/swot:line-clamp-none line-clamp-3 leading-snug">{singleData.report?.swotAnalysis?.strength?.detail}</p>
              </div>
              <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100 flex flex-col justify-center gap-1 group/swot">
                <p className="text-[10px] font-black text-amber-700 mb-1">WEAKNESSES (약점 및 리스크)</p>
                <p className="text-xs font-bold text-amber-900">{singleData.report?.swotAnalysis?.weakness?.summary || '내용 없음'}</p>
                <p className="text-[11px] font-medium text-amber-800 opacity-80 group-hover/swot:line-clamp-none line-clamp-3 leading-snug">{singleData.report?.swotAnalysis?.weakness?.detail}</p>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex flex-col justify-center gap-1 group/swot">
                <p className="text-[10px] font-black text-blue-700 mb-1">OPPORTUNITIES (기회)</p>
                <p className="text-xs font-bold text-blue-900">{singleData.report?.swotAnalysis?.opportunity?.summary || '내용 없음'}</p>
                <p className="text-[11px] font-medium text-blue-800 opacity-80 group-hover/swot:line-clamp-none line-clamp-3 leading-snug">{singleData.report?.swotAnalysis?.opportunity?.detail}</p>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-100 flex flex-col justify-center gap-1 group/swot">
                <p className="text-[10px] font-black text-rose-700 mb-1">THREATS (위협 및 파생 위기)</p>
                <p className="text-xs font-bold text-rose-900">{singleData.report?.swotAnalysis?.threat?.summary || '내용 없음'}</p>
                <p className="text-[11px] font-medium text-rose-800 opacity-80 group-hover/swot:line-clamp-none line-clamp-3 leading-snug">{singleData.report?.swotAnalysis?.threat?.detail}</p>
              </div>
            </div>
          </BentoCard>

          {/* Top News */}
          <BentoCard icon="newspaper" title="주요 뉴스" color="slate">
            <div className="space-y-4">
              {singleData.report?.recentNews && singleData.report.recentNews.length > 0 ? (
                singleData.report.recentNews.slice(0, 3).map((news, idx) => (
                  <div key={idx} className="group/news cursor-pointer border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                    <p className="text-[10px] text-slate-400 mb-1">최근 뉴스</p>
                    <p className="text-sm font-bold group-hover/news:text-blue-600 transition-colors line-clamp-2">{news.headline || news.title}</p>
                  </div>
                ))
              ) : <p className="text-slate-400 text-sm">뉴스 정보가 없습니다.</p>}
            </div>
          </BentoCard>
        </div>
      ) : (
        /* Sources Tab */
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500">newspaper</span> 리포트 생성에 사용된 정보 출처
          </h3>
          <div className="space-y-4">
            {singleData.sources && singleData.sources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {singleData.sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all block"
                  >
                    <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest group-hover:text-primary/70 transition-colors">
                      {source.uri.includes('dart') ? '공시 정보' : '웹 검색 뉴스'}
                    </div>
                    <div className="font-semibold text-slate-700 text-sm group-hover:text-primary transition-colors line-clamp-2">
                      {source.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-3 truncate group-hover:text-primary/60 transition-colors">
                      {source.uri}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">사용된 출처 정보를 불러올 수 없습니다.</p>
            )}
            
            <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-xs text-primary leading-relaxed">
                * 본 리포트는 AI가 실시간 웹 검색 결과와 재무 데이터를 종합하여 작성되었습니다. 
                각 출처의 내용이 AI에 의해 요약 및 분석되었으므로, 투자 판단 시 반드시 원문을 직접 확인하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

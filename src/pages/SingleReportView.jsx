import React, { useState } from 'react';
import MarketSentimentBanner from '../components/MarketSentimentBanner';

const COLOR_MAP = {
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',    fill: 'bg-cyan-50',    detail: 'text-cyan-900/80',    border: 'border-cyan-100',    badge: 'bg-cyan-100 text-cyan-700' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  fill: 'bg-purple-50',  detail: 'text-purple-900/80',  border: 'border-purple-100',  badge: 'bg-purple-100 text-purple-700' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    fill: 'bg-blue-50',    detail: 'text-blue-900/80',    border: 'border-blue-100',    badge: 'bg-blue-100 text-blue-700' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   fill: 'bg-amber-50',   detail: 'text-amber-900/80',   border: 'border-amber-100',   badge: 'bg-amber-100 text-amber-700' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600',    fill: 'bg-rose-50',    detail: 'text-rose-900/80',    border: 'border-rose-100',    badge: 'bg-rose-100 text-rose-700' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', fill: 'bg-emerald-50', detail: 'text-emerald-900/80', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-600',   fill: 'bg-slate-100',  detail: 'text-slate-700',      border: 'border-slate-100',   badge: 'bg-slate-100 text-slate-600' },
};

/**
 * BentoCard — 카드별 개별 상세보기 토글 내장
 * summary: 항상 노출되는 핵심 한 줄 요약
 * detail:  토글 클릭 시 펼쳐지는 상세 분석
 */
const BentoCard = ({ icon, title, color, summary, detail, className = '', children }) => {
  const theme = COLOR_MAP[color] || COLOR_MAP.slate;
  const [open, setOpen] = useState(false);
  const hasDetail = !!detail;

  return (
    <section className={`bg-surface-container-lowest rounded-2xl shadow-sm border border-slate-100/80 relative overflow-hidden group transition-shadow hover:shadow-md ${className}`}>
      {/* 우상단 컬러 액센트 */}
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500 opacity-40 ${theme.fill}`} />

      <div className="relative z-10 flex flex-col">
        {/* 카드 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined p-2 rounded-xl text-lg ${theme.bg} ${theme.text}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <h3 className="text-base font-bold text-on-surface">{title}</h3>
          </div>
          {hasDetail && (
            <button
              onClick={() => setOpen(v => !v)}
              aria-label={open ? '접기' : '상세보기'}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${open ? `${theme.badge} border-transparent` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {open ? 'unfold_less' : 'unfold_more'}
              </span>
              {open ? '접기' : '상세보기'}
            </button>
          )}
        </div>

        {/* 카드 본문 */}
        <div className="px-6 pb-6 space-y-0">
          {/* children이 있으면 우선 렌더링 (SWOT, 재무 테이블 등) */}
          {children ? (
            children
          ) : (
            <>
              {/* 요약 영역 */}
              {summary ? (
                <p className="text-sm font-semibold text-on-surface leading-relaxed">{summary}</p>
              ) : (
                <p className="text-slate-400 text-sm">데이터 없음</p>
              )}

              {/* 상세 영역 — 토글 시 페이드인 */}
              {open && detail && (
                <div className={`mt-4 pt-4 border-t ${theme.border} animate-in fade-in slide-in-from-top-2 duration-300`}>
                  <p className={`text-sm leading-7 whitespace-pre-wrap ${theme.detail}`}>{detail}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

/* ─── SWOT 카드 내부의 각 사분면 ─── */
const SwotQuadrant = ({ label, bgColor, borderColor, textColor, detailColor, summary, detail }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`p-4 ${bgColor} rounded-xl border ${borderColor} flex flex-col gap-2 transition-all`}>
      <p className={`text-[10px] font-black ${textColor} tracking-wider uppercase`}>{label}</p>
      <p className="text-sm font-semibold text-on-surface leading-snug">{summary || '내용 없음'}</p>
      {detail && (
        <>
          <button
            onClick={() => setOpen(v => !v)}
            className={`self-start flex items-center gap-1 text-[11px] font-bold ${textColor} opacity-70 hover:opacity-100 transition-opacity`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{open ? 'expand_less' : 'expand_more'}</span>
            {open ? '접기' : '상세보기'}
          </button>
          {open && (
            <p className={`text-xs leading-relaxed ${detailColor} border-t ${borderColor} pt-2 animate-in fade-in duration-200`}>{detail}</p>
          )}
        </>
      )}
    </div>
  );
};

/* ─── 재무 인사이트 내부 개별 토글 ─── */
const FinancialInsight = ({ summary, detail }) => {
  const [open, setOpen] = useState(false);
  if (!summary) return null;
  return (
    <div className="p-4 bg-primary/5 rounded-xl border-l-4 border-primary mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <span className="text-xs font-black text-primary uppercase tracking-wider block mb-1">AI Insight</span>
          <p className="text-sm font-semibold text-on-surface leading-relaxed">{summary}</p>
        </div>
        {detail && (
          <button
            onClick={() => setOpen(v => !v)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{open ? 'unfold_less' : 'unfold_more'}</span>
            {open ? '접기' : '상세'}
          </button>
        )}
      </div>
      {open && detail && (
        <p className="text-sm text-slate-600 leading-7 mt-3 pt-3 border-t border-primary/10 whitespace-pre-wrap animate-in fade-in duration-200">{detail}</p>
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   메인 컴포넌트
════════════════════════════════════════ */
export default function SingleReportView({ singleData }) {
  const [reportSubTab, setReportSubTab] = useState('analysis');
  if (!singleData) return null;

  const d = new Date();
  const today = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
  const yearly = singleData.financeData?.yearlyMetrics || singleData.dartFinance?.yearlyMetrics;

  const r = singleData.report;

  return (
    <div className="mt-8 mx-auto w-full flex-1 animate-in fade-in slide-in-from-bottom-8">

      {/* 리포트 헤더 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
              {singleData.ticker || 'REPORT'}
            </span>
            <span className="text-on-surface-variant text-sm font-medium">{today}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">
            {singleData.companyName} 분석 보고서
          </h2>
        </div>
        <MarketSentimentBanner sentiment={r?.marketSentiment} />
      </div>

      {/* 서브탭 */}
      <div className="flex gap-8 mb-8 border-b border-slate-200">
        {['analysis', 'sources'].map(tab => (
          <button
            key={tab}
            onClick={() => setReportSubTab(tab)}
            className={`pb-3 font-bold text-base transition-all ${reportSubTab === tab ? 'border-b-[3px] border-primary text-primary -mb-px' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab === 'analysis' ? '상세 분석' : '사용 정보 (출처)'}
          </button>
        ))}
      </div>

      {/* ── 분석 탭 ── */}
      {reportSubTab === 'analysis' && (
        <div className="bento-grid">

          {/* PESTLE */}
          <BentoCard
            icon="public"
            title="거시적 트렌드 (PESTLE 기반)"
            color="cyan"
            summary={singleData.macroTrend?.summary}
            detail={singleData.macroTrend?.detail}
          />

          {/* 제품 비전 */}
          <BentoCard
            icon="visibility"
            title="제품 비전 및 로드맵"
            color="purple"
            summary={r?.vision?.summary}
            detail={r?.vision?.detail}
          />

          {/* 비즈니스 모델 */}
          <BentoCard
            icon="account_tree"
            title="비즈니스 모델 (캔버스 기반)"
            color="blue"
            summary={r?.businessModel?.summary}
            detail={r?.businessModel?.detail}
          />

          {/* 5 Forces */}
          <BentoCard
            icon="factory"
            title="해당 산업 현황 (5 Forces 기반)"
            color="amber"
            summary={r?.industryStatus?.summary}
            detail={r?.industryStatus?.detail}
          />

          {/* 재무 분석 */}
          <BentoCard icon="finance" title="재무 분석" color="emerald" className="col-span-1 lg:col-span-2">
            <FinancialInsight
              summary={r?.financialAnalysis?.overview?.summary}
              detail={r?.financialAnalysis?.overview?.detail}
            />
            {yearly?.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="p-3 font-bold text-slate-500 text-xs uppercase tracking-wide w-32">구분</th>
                      {yearly.map((y, i) => (
                        <th key={y.year} className={`p-3 font-bold text-xs ${i === yearly.length - 1 ? 'text-primary' : 'text-slate-500'}`}>{y.year}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { label: '매출 성장률', key: 'revenueGrowth' },
                      { label: '영업이익률',  key: 'operatingMargin' },
                      { label: '부채비율',     key: 'debtRatio' },
                      { label: 'ROE',          key: 'roe' },
                    ].map(({ label, key }) => (
                      <tr key={key} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-500 text-xs">{label}</td>
                        {yearly.map(y => <td key={y.year} className="p-3 text-sm text-on-surface">{y[key] ?? '-'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">재무 지표 데이터 없음</p>
            )}
          </BentoCard>

          {/* SWOT */}
          <BentoCard icon="grid_view" title="SWOT Matrix" color="slate">
            <div className="grid grid-cols-2 gap-3">
              <SwotQuadrant
                label="STRENGTHS (강점)"
                bgColor="bg-emerald-50/60" borderColor="border-emerald-100" textColor="text-emerald-700" detailColor="text-emerald-800"
                summary={r?.swotAnalysis?.strength?.summary}
                detail={r?.swotAnalysis?.strength?.detail}
              />
              <SwotQuadrant
                label="WEAKNESSES (약점)"
                bgColor="bg-amber-50/60" borderColor="border-amber-100" textColor="text-amber-700" detailColor="text-amber-800"
                summary={r?.swotAnalysis?.weakness?.summary}
                detail={r?.swotAnalysis?.weakness?.detail}
              />
              <SwotQuadrant
                label="OPPORTUNITIES (기회)"
                bgColor="bg-blue-50/60" borderColor="border-blue-100" textColor="text-blue-700" detailColor="text-blue-800"
                summary={r?.swotAnalysis?.opportunity?.summary}
                detail={r?.swotAnalysis?.opportunity?.detail}
              />
              <SwotQuadrant
                label="THREATS (위협)"
                bgColor="bg-rose-50/60" borderColor="border-rose-100" textColor="text-rose-700" detailColor="text-rose-800"
                summary={r?.swotAnalysis?.threat?.summary}
                detail={r?.swotAnalysis?.threat?.detail}
              />
            </div>
          </BentoCard>

          {/* 주요 뉴스 */}
          <BentoCard icon="newspaper" title="주요 뉴스" color="slate">
            <div className="space-y-3">
              {r?.recentNews?.length > 0 ? (
                r.recentNews.slice(0, 4).map((news, idx) => (
                  <div key={idx} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0 group/news cursor-pointer">
                    <p className="text-xs text-slate-400 mb-1">최근 뉴스</p>
                    <p className="text-sm font-semibold text-on-surface group-hover/news:text-primary transition-colors line-clamp-2">{news.headline || news.title}</p>
                  </div>
                ))
              ) : <p className="text-slate-400 text-sm">뉴스 정보가 없습니다.</p>}
            </div>
          </BentoCard>

        </div>
      )}

      {/* ── 출처 탭 ── */}
      {reportSubTab === 'sources' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">newspaper</span>
            리포트 생성에 사용된 정보 출처
          </h3>
          <div className="space-y-4">
            {singleData.sources?.length > 0 ? (
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
                      {source.uri?.includes('dart') ? '공시 정보' : '웹 검색 뉴스'}
                    </div>
                    <div className="font-semibold text-slate-700 text-sm group-hover:text-primary transition-colors line-clamp-2">{source.title}</div>
                    <div className="text-xs text-slate-400 mt-3 truncate group-hover:text-primary/60 transition-colors">{source.uri}</div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">출처 정보를 불러올 수 없습니다.</p>
            )}
            <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-xs text-primary/80 leading-relaxed">
                * 본 리포트는 AI가 실시간 웹 검색 결과와 재무 데이터를 종합하여 작성되었습니다.
                투자 판단 시 반드시 원문을 직접 확인하시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

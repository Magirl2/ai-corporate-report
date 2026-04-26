import React, { useState } from 'react';
import MarketSentimentBanner from '../components/MarketSentimentBanner';
import { renderMarkdown } from '../utils/displayHelpers';
import { getYearlyMetrics, getSourceBadge, getSafeItems } from '../utils/reportSelectors';

/**
 * NewsItem 컴포넌트 — 개별 뉴스 토글 및 심층 분석 지원
 */
const NewsItem = ({ news }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(news.summary || news.detail || news.impactAnalysis);

  return (
    <div className={`p-4 rounded-xl border border-slate-100 transition-all ${open ? 'bg-slate-50/80 shadow-sm border-primary/20' : 'bg-white hover:bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => hasDetail && setOpen(!open)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1.5 py-0.5 bg-slate-100 rounded">RECENT NEWS</span>
            {news.sourceDate && <span className="text-[10px] text-slate-400">{news.sourceDate}</span>}
          </div>
          <h4 className={`text-sm font-bold leading-snug transition-colors ${open ? 'text-primary' : 'text-slate-800'}`}>
            {news.headline || news.title}
          </h4>
        </div>
        {hasDetail && (
          <span className={`material-symbols-outlined text-slate-300 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : ''}`}>
            expand_more
          </span>
        )}
      </div>

      {open && hasDetail && (
        <div className="mt-4 pt-4 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="space-y-4">
            {news.summary && (
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter mb-1">핵심 요약</p>
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">{news.summary}</p>
              </div>
            )}
            {(news.detail || news.impactAnalysis) && (
              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-primary/70 uppercase tracking-tighter mb-1.5">심층 분석 및 기업 영향</p>
                <div className="text-[13px] text-slate-700 leading-relaxed">
                  {renderMarkdown(news.detail || news.impactAnalysis)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


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
const BentoCard = ({ icon, title, color, summary, detail, className = '', children, emptyMessage }) => {
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
                <div className="flex items-center gap-2 py-2">
                  <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '18px' }}>info</span>
                  <p className="text-slate-400 text-sm">{emptyMessage || 'AI 분석 데이터를 가져오지 못했습니다.'}</p>
                </div>
              )}

              {/* 상세 영역 — 토글 시 페이드인 + 마크다운 렌더링 */}
              {open && detail && (
                <div className={`mt-4 pt-4 border-t ${theme.border} animate-in fade-in slide-in-from-top-2 duration-300`}>
                  <div className="text-[0.8125rem] leading-7 text-slate-700">
                    {renderMarkdown(detail)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

/* ─── SWOT 사분면 — 배열 데이터 기반 렌더링 ─── */
const SwotQuadrant = ({ label, bgColor, borderColor, textColor, items }) => {
  const safeItems = getSafeItems(items);
  return (
    <div className={`p-6 rounded-2xl border flex flex-col gap-3 ${bgColor} ${borderColor}`}>
      <p className={`text-[10px] font-black tracking-widest uppercase ${textColor} opacity-80`}>{label}</p>
      {safeItems.length > 0 ? (
        <ul className="space-y-2">
          {safeItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-800 leading-snug">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${textColor.replace('text-', 'bg-')}`} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '16px' }}>info</span>
          <p className="text-slate-400 text-sm">데이터 분석 중입니다.</p>
        </div>
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
        <div className="text-[0.8125rem] text-slate-600 leading-7 mt-3 pt-3 border-t border-primary/10 animate-in fade-in duration-200">
          {renderMarkdown(detail)}
        </div>
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
  const yearly = getYearlyMetrics(singleData);

  const r = singleData.report;

  // 데이터 소스 뱃지 동적 결정
  const sourceBadge = getSourceBadge(singleData);

    // AI 품질 점수
    const aiScore = singleData.score;
    const aiIteration = singleData.iteration;
  
    // 캐시 상태 및 품질 경고
    const cacheHit = singleData.metadata?.cacheHit;
    const cacheAgeMs = singleData.metadata?.cacheAgeMs;
    const isPartial = singleData.debug?.isPartialResult || singleData.metadata?.qualityWarning;
    const hasSentiment = !!(r?.marketSentiment?.status);
  
    const getCacheAgeText = (ms) => {
      if (!ms) return '';
      const mins = Math.floor(ms / 60000);
      if (mins < 1) return '방금 전';
      if (mins < 60) return `${mins}분 전`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}시간 전`;
      return `${Math.floor(hours / 24)}일 전`;
    };

    return (
      <div className="mt-8 mx-auto w-full flex-1 animate-in fade-in slide-in-from-bottom-8">
  
        {/* 리포트 헤더 */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1 md:px-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] md:text-xs font-bold rounded-full uppercase tracking-wider">
                {sourceBadge}
              </span>
              
              {/* 캐시 상태 배지 */}
              <span className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-full border ${cacheHit ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                {cacheHit ? `캐시된 보고서 (${getCacheAgeText(cacheAgeMs)})` : '새로 분석됨'}
              </span>

              {/* 품질 경고 배지 */}
              {isPartial && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined !text-[14px]">warning</span>
                  일부 데이터 부족
                </span>
              )}

              <span className="text-on-surface-variant text-[11px] md:text-sm font-medium ml-1">{today}</span>
              {aiScore != null && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] md:text-[11px] font-bold"
                  title={`Sisyphus Loop ${aiIteration}회 반복 후 확정`}
                  style={{
                    background: aiScore >= 85 ? '#f0fdf4' : aiScore >= 70 ? '#fffbeb' : '#fff1f2',
                    borderColor: aiScore >= 85 ? '#86efac' : aiScore >= 70 ? '#fcd34d' : '#fca5a5',
                    color: aiScore >= 85 ? '#166534' : aiScore >= 70 ? '#92400e' : '#be123c',
                  }}
                >
                  <span className="material-symbols-outlined !text-[12px] md:!text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  AI {aiScore}
                </span>
              )}
            </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight font-headline break-keep">
            {singleData.companyName} 분석 보고서
          </h2>
        </div>
        {hasSentiment && (
          <div className="w-full lg:w-auto">
            <MarketSentimentBanner sentiment={r?.marketSentiment} />
          </div>
        )}
      </div>

      {/* 서브탭 */}
      <div className="flex gap-8 mb-8 border-b border-slate-200">
        {[
          { key: 'analysis', label: '상세 분석' },
          { key: 'report',   label: 'AI 종합 보고서' },
          { key: 'sources',  label: '사용 정보 (출처)' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setReportSubTab(key)}
            className={`pb-3 font-bold text-base transition-all ${reportSubTab === key ? 'border-b-[3px] border-primary text-primary -mb-px' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {label}
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
            summary={r?.macroTrend?.summary}
            detail={r?.macroTrend?.detail}
            emptyMessage="최근 공식 데이터를 찾지 못했습니다. 관련 시장 뉴스를 분석 중입니다."
          />

          {/* 제품 비전 */}
          <BentoCard
            icon="visibility"
            title="제품 비전 및 로드맵"
            color="purple"
            summary={r?.vision?.summary}
            detail={r?.vision?.detail}
            emptyMessage="기업의 제품 비전 및 중장기 로드맵 정보를 분석 중입니다."
          />

          {/* 비즈니스 모델 */}
          <BentoCard
            icon="account_tree"
            title="비즈니스 모델 (캔버스 기반)"
            color="blue"
            summary={r?.businessModel?.summary}
            detail={r?.businessModel?.detail}
            emptyMessage="공식 사업 보고서 미확인으로 인해 시장 추정치를 기반으로 분석 중입니다."
          />

          {/* 5 Forces */}
          <BentoCard
            icon="factory"
            title="해당 산업 현황 (5 Forces 기반)"
            color="amber"
            summary={r?.industryStatus?.summary}
            detail={r?.industryStatus?.detail}
            emptyMessage="산업 내 경쟁 구도 및 시장 동향 정보를 분석 중입니다."
          />

          {/* 재무 분석 */}
          <BentoCard icon="finance" title="재무 분석" color="emerald" className="col-span-1 lg:col-span-2">
            <FinancialInsight
              summary={r?.financialAnalysis?.overview?.summary}
              detail={r?.financialAnalysis?.overview?.detail}
            />
            {(() => {
              const rows = (yearly?.length > 0)
                ? yearly
                : (r?.financialAnalysis?.keyMetrics?.length > 0 ? r.financialAnalysis.keyMetrics : null);
              if (!rows) return (
                <div className="flex items-center gap-2 py-4">
                  <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '20px' }}>info</span>
                  <p className="text-slate-400 text-sm italic">정형화된 재무 제표 데이터가 확인되지 않아 정성적 분석만 제공됩니다.</p>
                </div>
              );
              return (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-surface-container-low">
                        <th className="p-3 font-bold text-slate-500 text-xs uppercase tracking-wide w-32">구분</th>
                        {rows.map((y, i) => (
                          <th key={y.year ?? i} className={`p-3 font-bold text-xs ${i === rows.length - 1 ? 'text-primary' : 'text-slate-500'}`}>{y.year ?? '-'}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { label: '매출 성장률', key: 'revenueGrowth' },
                        { label: '영업이익률',  key: 'operatingMargin' },
                        { label: '부채비율',    key: 'debtRatio' },
                        { label: 'ROE',         key: 'roe' },
                      ].map(({ label, key }) => (
                        <tr key={key} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-500 text-xs">{label}</td>
                          {rows.map((y, i) => <td key={i} className="p-3 text-sm text-on-surface">{y[key] ?? '-'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </BentoCard>

          {/* SWOT Matrix */}
          <BentoCard icon="grid_view" title="SWOT Matrix" color="slate" className="col-span-full w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              <SwotQuadrant
                label="STRENGTHS (강점)"
                bgColor="bg-emerald-50/60" borderColor="border-emerald-100" textColor="text-emerald-700"
                items={r?.swotAnalysis?.strengths}
              />
              <SwotQuadrant
                label="WEAKNESSES (약점)"
                bgColor="bg-amber-50/60" borderColor="border-amber-100" textColor="text-amber-700"
                items={r?.swotAnalysis?.weaknesses}
              />
              <SwotQuadrant
                label="OPPORTUNITIES (기회)"
                bgColor="bg-blue-50/60" borderColor="border-blue-100" textColor="text-blue-700"
                items={r?.swotAnalysis?.opportunities}
              />
              <SwotQuadrant
                label="THREATS (위협)"
                bgColor="bg-rose-50/60" borderColor="border-rose-100" textColor="text-rose-700"
                items={r?.swotAnalysis?.threats}
              />
            </div>
          </BentoCard>

          {/* 주요 뉴스 — 레이아웃 강제 확장 */}
          <BentoCard icon="newspaper" title="주요 뉴스" color="slate" className="col-span-full w-full">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {r?.recentNews?.length > 0 ? (
                r.recentNews.slice(0, 5).map((news, idx) => (
                  <NewsItem key={idx} news={news} idx={idx} />
                ))
              ) : <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>뉴스 정보가 없습니다.</p>}
            </div>
          </BentoCard>

        </div>
      )}

      {/* ── AI 종합 보고서 탭 (composer markdown) ── */}
      {reportSubTab === 'report' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
          {r?.markdown ? (
            <>
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <h3 className="text-lg font-bold">AI 종합 분석 보고서</h3>
                <span className="ml-auto text-xs text-slate-400">Composed by Gemini 2.5 Pro</span>
              </div>
              <div>{renderMarkdown(r.markdown)}</div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '48px' }}>auto_awesome</span>
              <p className="text-slate-400 text-sm">종합 보고서를 생성하지 못했습니다. 상세 분석 탭에서 개별 섹션을 확인하세요.</p>
            </div>
          )}
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

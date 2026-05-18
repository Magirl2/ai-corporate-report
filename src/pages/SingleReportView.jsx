import React, { useState, useRef } from 'react';
import MarketSentimentBanner from '../components/MarketSentimentBanner';
import { renderMarkdown } from '../utils/displayHelpers';
import { getYearlyMetrics, getSourceBadge, getSafeItems } from '../utils/reportSelectors';
import { downloadFinancialCsv } from '../utils/csvExport';
import { formatKRW, formatFMPValue, formatRatioBadge } from '../utils/formatters';

// ─── Composer model name formatter ───
const _MODEL_NAMES = {
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
};
function formatComposerModel(model) {
  return model ? (_MODEL_NAMES[model] || model) : 'AI 분석 모델';
}

// ─── Source classification domain tiers (mirrors api/_lib/sourceQuality.js DOMAIN_TIERS) ───
const _DOMAIN_TIERS = {
  official:      ['opendart.fss.or.kr','dart.fss.or.kr','kind.krx.co.kr','krx.co.kr','sec.gov','investor.gov'],
  global_finance:['reuters.com','bloomberg.com','wsj.com','ft.com','cnbc.com','marketwatch.com','barrons.com','apnews.com','businesswire.com','prnewswire.com'],
  kr_finance:    ['yna.co.kr','hankyung.com','mk.co.kr','sedaily.com','edaily.co.kr','fnnews.com','biz.chosun.com','thebell.co.kr','infostockdaily.co.kr','news.einfomax.co.kr'],
  finance_data:  ['financialmodelingprep.com','finance.yahoo.com','companiesmarketcap.com','macrotrends.net','nasdaq.com','nyse.com'],
  blocked:       ['tistory.com','blog.naver.com','cafe.naver.com','brunch.co.kr','medium.com','reddit.com','quora.com','namu.wiki','wikipedia.org','youtube.com','facebook.com','instagram.com','threads.net','x.com','twitter.com'],
};

function _srcHostname(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function _matchesDomain(hostname, list) {
  return list.some(d => hostname === d || hostname.endsWith('.' + d));
}

function _classifyType(url) {
  const h = _srcHostname(url);
  if (!h) return 'unknown';
  for (const [tier, domains] of Object.entries(_DOMAIN_TIERS)) {
    if (_matchesDomain(h, domains)) return tier;
  }
  if (url.includes('/investor') || url.includes('/ir') || url.includes('/earnings') || url.includes('/financial-results')) return 'official_ir';
  return 'general';
}

const _SCORE_MAP = { official: 98, official_ir: 90, global_finance: 85, finance_data: 85, kr_finance: 80, general: 65, blocked: 20 };

function normalizeSource(source, index) {
  const url = source.url || source.uri || '';
  const hostname = _srcHostname(url);
  const type = source.type || _classifyType(url);
  const qualityScore = source.qualityScore ?? (_SCORE_MAP[type] ?? 40);
  const qualityTier = source.qualityTier ?? (qualityScore >= 80 ? 'high' : qualityScore >= 60 ? 'medium' : qualityScore >= 40 ? 'low' : 'blocked');
  return {
    id: source.id || source.sourceId || `src-${index}`,
    title: source.title || source.headline || url || `출처 ${index + 1}`,
    url,
    type,
    reliability: source.reliability || (qualityTier === 'blocked' ? 'unverified' : 'verified'),
    qualityTier,
    qualityScore,
    publisher: source.publisher || hostname || '',
    usedIn: Array.isArray(source.usedIn) ? source.usedIn : [],
    note: source.note ?? (type === 'global_finance' ? '원문 접근 제한 가능' : null),
  };
}

function dedupeAndGroupSources(rawSources) {
  const seen = new Set();
  const deduped = rawSources
    .map((s, i) => normalizeSource(s, i))
    .filter(s => {
      const key = s.url || s.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return {
    official:      deduped.filter(s => s.type === 'official' || s.type === 'official_ir'),
    financial:     deduped.filter(s => s.type === 'global_finance' || s.type === 'kr_finance' || s.type === 'finance_data'),
    aiSearch:      deduped.filter(s => s.type === 'general' || s.type === 'unknown'),
    lowReliability: deduped.filter(s => s.type === 'blocked' || s.qualityTier === 'blocked'),
    total: deduped.length,
  };
}

const _TIER_STYLE = {
  high:    'bg-emerald-50 border-emerald-100 text-emerald-700',
  medium:  'bg-blue-50 border-blue-100 text-blue-700',
  low:     'bg-amber-50 border-amber-100 text-amber-700',
  blocked: 'bg-red-50 border-red-100 text-red-600',
};
const _TIER_LABEL  = { high: '높음', medium: '중간', low: '낮음', blocked: '차단됨' };
const _TYPE_LABEL  = { official: '공식 공시', official_ir: '공식 IR', global_finance: '글로벌 금융', kr_finance: '국내 금융', finance_data: '금융 데이터', general: 'AI 검색', blocked: '낮은 신뢰도', unknown: '미분류' };

const SourceCard = ({ source }) => {
  const tier = source.qualityTier || 'low';
  const isBlocked = tier === 'blocked';
  return (
    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col gap-2 ${isBlocked ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-100 hover:border-primary/20'}`}>
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 flex-1">{source.title}</h4>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${_TIER_STYLE[tier] || _TIER_STYLE.low}`}>
          신뢰 {_TIER_LABEL[tier] || tier}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {source.type && (
          <span className="font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{_TYPE_LABEL[source.type] || source.type}</span>
        )}
        {source.publisher && (
          <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{source.publisher}</span>
        )}
        {source.qualityScore != null && (
          <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded">점수 {source.qualityScore}</span>
        )}
        {source.reliability && (
          <span className={`font-semibold px-2 py-0.5 rounded ${source.reliability === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {source.reliability === 'verified' ? '검증됨' : '미검증'}
          </span>
        )}
      </div>
      {source.usedIn?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {source.usedIn.map((u, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary/70 rounded-full border border-primary/10">{u}</span>
          ))}
        </div>
      )}
      {source.note && (
        <p className="text-[11px] text-slate-400 italic">{source.note}</p>
      )}
      {source.url && (
        <div className="pt-1 border-t border-slate-50 mt-auto">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline max-w-full"
          >
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: '13px' }}>open_in_new</span>
            <span className="truncate max-w-[calc(100%-1.5rem)]">{source.url}</span>
          </a>
        </div>
      )}
    </div>
  );
};

const SourceQualitySummaryCard = ({ summary }) => {
  if (!summary) return null;
  const { totalSources = 0, highQualitySources = 0, mediumQualitySources = 0, lowQualitySources = 0, blockedSources = 0, preferredSourceRatio = 0, warning } = summary;
  const preferredPct = Math.round(parseFloat(preferredSourceRatio) * 100);
  return (
    <div className="mb-6 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>analytics</span>
        출처 품질 요약
      </h3>
      {warning && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs font-semibold text-amber-700 flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
          {warning}
        </div>
      )}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: '전체 출처', value: totalSources, cls: 'bg-slate-50 text-slate-800' },
          { label: '고품질 (High)', value: highQualitySources, cls: 'bg-emerald-50 text-emerald-700' },
          { label: '중품질 (Medium)', value: mediumQualitySources, cls: 'bg-blue-50 text-blue-700' },
          { label: '저품질 (Low)', value: lowQualitySources, cls: 'bg-amber-50 text-amber-700' },
          { label: '차단됨', value: blockedSources, cls: 'bg-red-50 text-red-600' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`text-center p-3 rounded-lg ${cls}`}>
            <span className="text-xl font-extrabold block">{value}</span>
            <p className="text-[10px] mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500 font-medium">신뢰 출처 비율 (high+medium)</span>
          <span className="font-bold text-slate-700">{preferredPct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${preferredPct}%`,
              background: preferredPct >= 80 ? '#10b981' : preferredPct >= 50 ? '#3b82f6' : '#f59e0b',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const SourceGroup = ({ label, icon, sources, isWarning = false }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div className={`mb-7 ${isWarning ? 'p-4 bg-red-50 rounded-xl border border-red-100' : ''}`}>
      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isWarning ? 'text-red-700' : 'text-slate-700'}`}>
        <span className={`material-symbols-outlined ${isWarning ? 'text-red-400' : 'text-slate-400'}`} style={{ fontSize: '16px' }}>{icon}</span>
        {label}
        <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${isWarning ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}>{sources.length}건</span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((s, i) => <SourceCard key={s.id || i} source={s} />)}
      </div>
    </div>
  );
};

/**
 * NewsItem 컴포넌트 — 개별 뉴스 토글 및 심층 분석 지원
 */
const NewsItem = ({ news, idx }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(news.summary || news.detail || news.impactAnalysis);
  const url = news.url || news.sourceUrl;

  return (
    <div className={`p-4 rounded-xl border border-slate-100 transition-all ${open ? 'bg-slate-50/80 shadow-sm border-primary/20' : 'bg-white hover:bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 cursor-pointer" onClick={() => hasDetail && setOpen(!open)}>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {news.sentiment && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${news.sentiment.toLowerCase().includes('pos') ? 'bg-emerald-100 text-emerald-700' : news.sentiment.toLowerCase().includes('neg') ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                {news.sentiment}
              </span>
            )}
            {(news.publisher || news.source) && (
              <span className="text-[10px] font-bold text-slate-500">{news.publisher || news.source}</span>
            )}
            {(news.publishedAt || news.sourceDate) && (
              <span className="text-[10px] text-slate-400">{news.publishedAt || news.sourceDate}</span>
            )}
            {news.sourceQuality === 'unverified' && (
              <span className="text-[10px] text-amber-500 font-medium">미확인</span>
            )}
          </div>
          <h4 className={`text-sm font-bold leading-snug transition-colors ${open ? 'text-primary' : 'text-slate-800'}`}>
            {news.headline || news.title}
          </h4>
        </div>
        {hasDetail && (
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={`news-detail-${idx}`}
            className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 border ${open ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            {open ? '접기' : '상세보기'}
            <span className={`material-symbols-outlined transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
              expand_more
            </span>
          </button>
        )}
      </div>

      {open && hasDetail && (
        <div id={`news-detail-${idx}`} className="mt-4 pt-4 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="space-y-4">
            {news.summary && (
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-tighter mb-1">핵심 요약</p>
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">{news.summary}</p>
              </div>
            )}
            {news.detail && (
              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-primary/70 uppercase tracking-tighter mb-1.5">상세 분석</p>
                <div className="text-[13px] text-slate-700 leading-relaxed">
                  {renderMarkdown(news.detail)}
                </div>
              </div>
            )}
            {news.impactAnalysis && (
              <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                <p className="text-xs font-black text-primary/70 uppercase tracking-tighter mb-1.5">기업 영향</p>
                <div className="text-[13px] text-slate-700 leading-relaxed">
                  {renderMarkdown(news.impactAnalysis)}
                </div>
              </div>
            )}
            {url && (
              <div className="pt-2">
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                  원문 보기
                </a>
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



const _HEALTH_TAGS = {
  '성장형':  { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: 'trending_up' },
  '수익형':  { cls: 'bg-blue-100 text-blue-700 border-blue-200',          icon: 'monetization_on' },
  '안정형':  { cls: 'bg-slate-100 text-slate-600 border-slate-200',       icon: 'shield' },
  '회복중':  { cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: 'autorenew' },
  '위기':    { cls: 'bg-rose-100 text-rose-700 border-rose-200',          icon: 'warning' },
};

/* ─── 재무 인사이트 내부 개별 토글 ─── */
const FinancialInsight = ({ summary, detail }) => {
  const [open, setOpen] = useState(false);
  if (!summary) return null;

  // summary에서 재무 건전성 태그 추출 (예: "성장형 — 매출 증가세...")
  const healthTag = Object.keys(_HEALTH_TAGS).find(tag => summary.includes(tag));
  const tagStyle = healthTag ? _HEALTH_TAGS[healthTag] : null;

  return (
    <div className="p-4 bg-primary/5 rounded-xl border-l-4 border-primary mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-black text-primary uppercase tracking-wider">AI Insight</span>
            {tagStyle && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagStyle.cls}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>{tagStyle.icon}</span>
                {healthTag}
              </span>
            )}
          </div>
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
  const [pdfLoading, setPdfLoading] = useState(null); // null | 'analysis' | 'report'
  const analysisRef = useRef(null);
  const reportRef = useRef(null);

  if (!singleData) return null;

  const handleExportPDF = async (type) => {
    setPdfLoading(type);
    const ref = type === 'analysis' ? analysisRef : reportRef;

    // PDF 캡처 전 닫혀있는 상세보기 버튼 모두 펼치기
    const container = ref.current;
    const closedBtns = container
      ? Array.from(container.querySelectorAll('button[aria-label="상세보기"]'))
      : [];
    closedBtns.forEach(btn => btn.click());
    if (closedBtns.length > 0) await new Promise(r => setTimeout(r, 350));

    try {
      const { exportElementAsPDF } = await import('../utils/pdfExport');
      const label = type === 'analysis' ? '상세분석' : 'AI종합보고서';
      const date = new Date().toISOString().slice(0, 10);
      const name = singleData.companyName || '보고서';
      await exportElementAsPDF(ref, `${name}_${label}_${date}.pdf`);
    } catch (err) {
      console.error('PDF 내보내기 실패:', err);
      alert(`PDF 생성 중 오류가 발생했습니다.\n${err?.message || '알 수 없는 오류'}`);
    } finally {
      // 펼쳤던 버튼만 다시 닫기
      closedBtns.forEach(btn => btn.click());
      setPdfLoading(null);
    }
  };

  const yearly = getYearlyMetrics(singleData);
  const reportDate = (() => {
    const raw = singleData.metadata?.generatedAt || singleData.createdAt;
    if (!raw) {
      const d = new Date();
      return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
    }
    return new Date(raw).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
  })();

  const r = singleData.report;

  // 데이터 소스 뱃지 동적 결정
  const sourceBadge = getSourceBadge(singleData);

    // AI 품질 점수
    const aiScore = singleData.score;
    const aiIteration = singleData.iteration;
  
    // 캐시 상태 및 품질 플래그
    const cacheHit = singleData.metadata?.cacheHit;
    const cacheAgeMs = singleData.metadata?.cacheAgeMs;
    const qualityWarning = singleData.metadata?.qualityWarning === true;
    const isPartialResult = singleData.debug?.isPartialResult === true;
    const composeFailed = singleData.metadata?.composeFailed === true;
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
        <div className="mb-4 px-1 md:px-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] md:text-xs font-bold rounded-full uppercase tracking-wider">
              {sourceBadge}
            </span>

            {/* 배지 1: 캐시 vs 새 분석 */}
            <span className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-full border ${cacheHit ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
              {cacheHit ? `캐시된 보고서 (${getCacheAgeText(cacheAgeMs)})` : '새 분석'}
            </span>

            {/* 배지 2: 품질 경고 */}
            {qualityWarning && (
              <span className="px-2.5 py-1 bg-orange-50 text-orange-600 border border-orange-100 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>shield_question</span>
                품질 경고
              </span>
            )}

            {/* 배지 3: 일부 데이터 부족 */}
            {isPartialResult && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] md:text-xs font-bold rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                일부 데이터 부족
              </span>
            )}


            <span className="text-on-surface-variant text-[11px] md:text-sm font-medium ml-1">{reportDate}</span>
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
                <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                AI {aiScore}
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight font-headline break-keep">
            {singleData.companyName} 분석 보고서
          </h2>
        </div>

        {/* 투자 심리 배너 — 헤더 아래 전체 너비 */}
        {hasSentiment && (
          <div className="mb-8 px-1 md:px-0">
            <MarketSentimentBanner sentiment={r?.marketSentiment} />
          </div>
        )}

      {/* 서브탭 */}
      <div className="mb-8 border-b border-slate-200 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 min-w-max">
          {[
            { key: 'analysis',    label: '상세 분석' },
            { key: 'report',      label: 'AI 종합 보고서' },
            { key: 'sources',     label: '사용 정보 및 출처' },
            { key: 'data-notice', label: '데이터 고지사항' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReportSubTab(key)}
              className={`pb-3 px-4 font-bold text-sm md:text-base whitespace-nowrap transition-all ${reportSubTab === key ? 'border-b-[3px] border-primary text-primary -mb-px' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 분석 탭 ── */}
      {reportSubTab === 'analysis' && (
        <>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              onClick={() => handleExportPDF('analysis')}
              disabled={pdfLoading === 'analysis'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px', ...(pdfLoading === 'analysis' ? { animation: 'spin 1s linear infinite' } : {}) }}>
                {pdfLoading === 'analysis' ? 'sync' : 'picture_as_pdf'}
              </span>
              {pdfLoading === 'analysis' ? 'PDF 생성 중...' : 'PDF 내보내기'}
            </button>
          </div>
          <div ref={analysisRef} className="bento-grid">
          {(qualityWarning || isPartialResult) && (
            <div className="col-span-full mb-2 p-4 bg-orange-50 text-orange-800 border border-orange-200 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-orange-500">warning</span>
              <p className="text-sm font-medium">일부 섹션 분석 결과가 부족합니다. 종합보고서는 사용 가능한 원천 데이터를 기반으로 생성되었습니다.</p>
            </div>
          )}

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

          {/* 주요 경쟁사 현황 */}
          {r?.competitors?.length > 0 && (
            <BentoCard icon="groups" title="주요 경쟁사 현황" color="rose" className="col-span-1 lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {r.competitors.map((comp, idx) => {
                  const relColor = comp.relationship === '직접경쟁' ? 'bg-rose-50 text-rose-700 border-rose-100'
                    : comp.relationship === '간접경쟁' ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : 'bg-slate-50 text-slate-600 border-slate-100';
                  return (
                    <div key={idx} className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-slate-800 truncate">{comp.name}</h4>
                        {comp.relationship && (
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${relColor}`}>{comp.relationship}</span>
                        )}
                      </div>
                      {comp.marketPosition && (
                        <p className="text-[11px] text-primary font-semibold">{comp.marketPosition}</p>
                      )}
                      {comp.strength && (
                        <div className="flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-emerald-500 shrink-0" style={{ fontSize: '13px', marginTop: '2px', fontVariationSettings: "'FILL' 1" }}>thumb_up</span>
                          <p className="text-[12px] text-slate-600 leading-relaxed">{comp.strength}</p>
                        </div>
                      )}
                      {comp.weakness && (
                        <div className="flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-rose-400 shrink-0" style={{ fontSize: '13px', marginTop: '2px', fontVariationSettings: "'FILL' 1" }}>thumb_down</span>
                          <p className="text-[12px] text-slate-500 leading-relaxed">{comp.weakness}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </BentoCard>
          )}

          {/* 재무 분석 */}
          <BentoCard icon="finance" title="재무 분석" color="emerald" className="col-span-1 lg:col-span-2">
            <FinancialInsight
              summary={r?.financialAnalysis?.overview?.summary}
              detail={r?.financialAnalysis?.overview?.detail}
            />
            {(() => {
              const hasYearly = yearly?.length > 0;
              const hasKeyMetrics = r?.financialAnalysis?.keyMetrics?.length > 0;
              const finCurrency = singleData.financeData?.raw?.currency;
              const isKrw = !finCurrency || finCurrency === 'KRW';
              const unitLabel = isKrw ? '단위: 원' : `단위: ${finCurrency}`;
              const dataSource = isKrw ? 'DART 공시 기준' : 'FMP 기준';

              return (
                <div className="space-y-6">
                  {/* 정형 데이터 테이블 */}
                  {hasYearly ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-slate-400 font-medium">{dataSource} · {isKrw ? '금액 단위: 백만원→조/억원 변환' : `금액 단위: ${finCurrency} (B/M/K 변환)`}</span>
                        <button
                          type="button"
                          onClick={() => downloadFinancialCsv(singleData.companyName || '기업', yearly, finCurrency)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                          CSV 다운로드
                        </button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="p-3 font-bold text-slate-500 text-xs uppercase tracking-wide w-32">구분</th>
                              {yearly.map((y, i) => {
                                const isLatest = i === 0;
                                return (
                                  <th key={y.year ?? i} className={`p-3 font-bold text-xs ${isLatest ? 'text-primary bg-primary/5' : 'text-slate-500'}`}>
                                    {y.year ?? '-'}
                                    {isLatest && <span className="ml-1 text-[9px] bg-primary/10 text-primary rounded px-1 py-0.5 align-middle">최신</span>}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {[
                              { label: isKrw ? '매출액' : `매출액 (${finCurrency})`, rawKey: 'revenue', section: 'raw' },
                              { label: isKrw ? '영업이익' : `영업이익 (${finCurrency})`, rawKey: 'opIncome', section: 'raw' },
                              { label: isKrw ? '순이익' : `순이익 (${finCurrency})`, rawKey: 'netIncome', section: 'raw' },
                              { label: '매출 성장률', key: 'revenueGrowth', section: 'ratio', lowerIsBetter: false },
                              { label: '영업이익률', key: 'operatingMargin', section: 'ratio', lowerIsBetter: false },
                              { label: '부채비율', key: 'debtRatio', section: 'ratio', lowerIsBetter: true },
                              { label: 'ROE', key: 'roe', section: 'ratio', lowerIsBetter: false },
                            ].map(({ label, key, rawKey, section, lowerIsBetter = false }) => (
                              <tr key={label} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3 font-semibold text-slate-600 text-xs">{label}</td>
                                {yearly.map((y, i) => {
                                  const isLatest = i === 0;
                                  if (section === 'raw') {
                                    const raw = y.raw?.[rawKey] ?? '-';
                                    const display = isKrw ? formatKRW(raw) : formatFMPValue(raw);
                                    return (
                                      <td key={i} className={`p-3 text-sm tabular-nums font-medium ${isLatest ? 'text-slate-900 bg-primary/5' : 'text-slate-600'}`}>
                                        {display}
                                      </td>
                                    );
                                  } else {
                                    const val = y[key] ?? null;
                                    const { label: rLabel, colorClass } = formatRatioBadge(val, lowerIsBetter);
                                    return (
                                      <td key={i} className={`p-3 text-sm tabular-nums font-medium ${isLatest ? 'bg-primary/5' : ''} ${colorClass}`}>
                                        {rLabel}
                                      </td>
                                    );
                                  }
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-4">
                      <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '20px' }}>info</span>
                      <p className="text-slate-400 text-sm italic">정형 재무제표 데이터를 가져오지 못해 AI 정성 분석만 제공합니다.</p>
                    </div>
                  )}

                  {/* 정성 분석 데이터 (keyMetrics 등) */}
                  {hasKeyMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {r.financialAnalysis.keyMetrics.map((metric, idx) => {
                        const trendMap = {
                          up:   { label: '▲ 상승', cls: 'text-emerald-600' },
                          down: { label: '▼ 하락', cls: 'text-rose-600' },
                          flat: { label: '─ 유지', cls: 'text-slate-500' },
                        };
                        const trendInfo = trendMap[metric.trend?.toLowerCase()] || null;
                        return (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary/20 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="text-sm font-bold text-slate-700 leading-snug flex-1 mr-2">{metric.name || '주요 지표'}</h4>
                              <span className="text-primary font-bold text-sm shrink-0">{metric.value}</span>
                            </div>
                            {trendInfo && (
                              <p className={`text-xs font-semibold mb-2 ${trendInfo.cls}`}>{trendInfo.label}</p>
                            )}
                            {metric.description && <p className="text-xs text-slate-600 leading-relaxed">{metric.description}</p>}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
          <BentoCard icon="newspaper" title={r?.recentNews?.length > 0 ? `주요 뉴스 ${Math.min(r.recentNews.length, 8)}건` : "주요 뉴스"} color="slate" className="col-span-full w-full">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {r?.recentNews?.length > 0 ? (
                r.recentNews.slice(0, 8).map((news, idx) => (
                  <NewsItem key={idx} news={news} idx={idx} />
                ))
              ) : <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>뉴스 정보가 없습니다.</p>}
            </div>
          </BentoCard>

          {/* AI 종합 보고서 탭 안내 */}
          <div className="col-span-full w-full">
            <button
              onClick={() => setReportSubTab('report')}
              className="w-full flex items-center justify-between gap-3 p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="text-sm font-bold text-primary">AI 종합 분석 보고서 보기</span>
              </div>
              <span className="material-symbols-outlined text-primary/60 group-hover:translate-x-1 transition-transform" style={{ fontSize: '18px' }}>arrow_forward</span>
            </button>
          </div>

        </div>
        </>
      )}

      {/* ── AI 종합 보고서 탭 (composer markdown) ── */}
      {reportSubTab === 'report' && (
        <div ref={reportRef} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
          {r?.markdown && r.markdown.trim() !== '' ? (
            <>
              {/* 보고서 헤더 */}
              <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <h3 className="text-lg font-extrabold text-slate-900">AI 종합 분석 보고서</h3>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-slate-400 font-medium">
                      {formatComposerModel(singleData.metadata?.composerModel)}
                      {singleData.metadata?.composerFallbackUsed && <span className="ml-1 text-amber-500" title="보조 모델로 생성됨">↓</span>}
                    </span>
                    {(singleData.metadata?.generatedAt || singleData.createdAt) && (
                      <span className="text-xs text-slate-400">
                        · {new Date(singleData.metadata?.generatedAt || singleData.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      · 약 {Math.ceil(r.markdown.replace(/[#*`>\-]/g, '').split(/\s+/).filter(Boolean).length / 300)}분 읽기
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Markdown 파일로 다운로드"
                  onClick={() => {
                    const blob = new Blob([r.markdown], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    const dateStr = new Date().toISOString().slice(0, 10);
                    a.href = url;
                    a.download = `${singleData.companyName || '보고서'}_분석_${dateStr}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>download</span>
                  MD 다운로드
                </button>
                <button
                  type="button"
                  title="PDF 파일로 다운로드"
                  onClick={() => handleExportPDF('report')}
                  disabled={pdfLoading === 'report'}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '15px', ...(pdfLoading === 'report' ? { animation: 'spin 1s linear infinite' } : {}) }}
                  >
                    {pdfLoading === 'report' ? 'sync' : 'picture_as_pdf'}
                  </span>
                  {pdfLoading === 'report' ? '생성 중...' : 'PDF 다운로드'}
                </button>
              </div>
              {/* 섹션 목차 */}
              {(() => {
                const sections = r.markdown.match(/^## .+/gm)?.map(h => h.replace(/^## /, '')) || [];
                if (sections.length < 3) return null;
                return (
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">목차</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sections.map((sec, i) => (
                        <span key={i} className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-2.5 py-0.5">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              <div>{renderMarkdown(r.markdown)}</div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <span className="material-symbols-outlined text-amber-300" style={{ fontSize: '56px' }}>
                {composeFailed ? 'report_off' : 'auto_awesome'}
              </span>
              <div>
                <p className="text-slate-700 font-bold text-base mb-2">종합 보고서를 생성하지 못했습니다.</p>
                <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                  AI 작성 모델이 응답하지 않아 종합 보고서를 완성하지 못했습니다.<br />
                  <strong>상세 분석 탭</strong>에서 재무·전략·뉴스 섹션 결과를 바로 확인하실 수 있습니다.
                </p>
              </div>
              <button
                onClick={() => setReportSubTab('analysis')}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow hover:shadow-md hover:bg-primary/90 transition-all active:scale-95"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>analytics</span>
                상세 분석 보기
              </button>
              {composeFailed && (
                <p className="text-xs text-slate-300 mt-2">
                  오류 원인: {singleData.metadata?.composeFail || '알 수 없음'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 사용 정보 및 출처 탭 ── */}
      {reportSubTab === 'sources' && (() => {
        const rawSources = singleData.sources || [];
        const { official, financial, aiSearch, lowReliability, total } = dedupeAndGroupSources(rawSources);
        const qualitySummary = singleData.metadata?.sourceQualitySummary;
        const dartStatus = singleData.metadata?.dartStatus;
        const hasAnySources = total > 0;
        const fmpUsed = rawSources.some(s =>
          (s.url || '').includes('financialmodelingprep.com') || s.type === 'finance_data'
        );

        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
            {/* 출처 품질 요약 카드 */}
            <SourceQualitySummaryCard summary={qualitySummary} />

            {/* DART 데이터 수집 현황 카드 */}
            {dartStatus && (
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>database</span>
                  DART / FMP 데이터 수집 현황
                  {dartStatus.corpCodeResolved ? (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">DART 연결됨</span>
                  ) : dartStatus.attempted ? (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600">DART 매칭 실패</span>
                  ) : (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">DART 미시도</span>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {[
                    {
                      label: 'DART API 키',
                      value: dartStatus.apiKeyPresent ? '설정됨' : '미설정',
                      color: dartStatus.apiKeyPresent ? 'text-emerald-600' : 'text-red-400',
                    },
                    { label: '매칭 기업명', value: dartStatus.resolvedCorpName },
                    { label: 'DART corp_code', value: dartStatus.resolvedCorpCode },
                    { label: '종목코드', value: dartStatus.stockCode },
                    { label: '매칭 방식', value: dartStatus.resolutionMethod },
                    {
                      label: 'DART 공시 데이터',
                      value: dartStatus.disclosuresCount > 0 ? `사용됨 (${dartStatus.disclosuresCount}건)` : '미사용',
                      color: dartStatus.disclosuresCount > 0 ? 'text-emerald-600' : 'text-slate-400',
                    },
                    {
                      label: 'DART 재무 데이터',
                      value: dartStatus.financeAvailable ? `사용됨 (${dartStatus.financeYears}개 연도)` : '미사용',
                      color: dartStatus.financeAvailable ? 'text-emerald-600' : 'text-slate-400',
                    },
                    {
                      label: 'FMP 글로벌 재무',
                      value: fmpUsed ? 'FMP 데이터 포함됨' : dartStatus.corpCodeResolved ? '미사용 (DART 우선)' : '미사용',
                      color: fmpUsed ? 'text-blue-600' : 'text-slate-400',
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <span className="text-slate-400 text-[11px] block mb-0.5">{label}</span>
                      <span className={`font-semibold text-sm ${color || 'text-slate-700'}`}>{value || '-'}</span>
                    </div>
                  ))}
                </div>
                {dartStatus.warnings?.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <span className="text-xs font-bold text-amber-800 block mb-1">경고/미사용 사유</span>
                    <ul className="list-disc pl-4 text-xs text-amber-700 space-y-1">
                      {dartStatus.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 출처 그룹 */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">link</span>
                리포트 생성에 사용된 정보 출처
                {hasAnySources && (
                  <span className="ml-auto text-xs font-medium text-slate-400">{total}건 (중복 제거)</span>
                )}
              </h3>

              {hasAnySources ? (
                <>
                  <SourceGroup label="공식/1차 출처" icon="verified" sources={official} />
                  <SourceGroup label="전문 경제/뉴스 출처" icon="article" sources={financial} />
                  <SourceGroup label="AI 검색 근거" icon="search" sources={aiSearch} />
                  <SourceGroup label="낮은 신뢰도/확인 필요" icon="warning" sources={lowReliability} isWarning />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <span className="material-symbols-outlined text-slate-200" style={{ fontSize: '48px' }}>link_off</span>
                  <div>
                    <p className="text-slate-600 font-bold text-sm mb-1">출처 정보를 불러올 수 없습니다.</p>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                      이 보고서에는 출처 메타데이터가 포함되어 있지 않습니다.<br />
                      재분석을 실행하면 출처 정보가 포함될 수 있습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 하단 고지사항 이동 버튼 */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setReportSubTab('data-notice')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-primary/5 hover:border-primary/30 text-slate-600 hover:text-primary font-semibold text-sm transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>info</span>
                  데이터 출처 및 고지사항 보기
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 데이터 고지사항 탭 ── */}
      {reportSubTab === 'data-notice' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            데이터 출처 및 고지사항
          </h3>
          <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <p className="font-semibold text-primary/90 mb-2">AI 생성 보고서 안내</p>
              <p>본 리포트는 AI가 실시간 웹 검색 결과, DART 공시 데이터, 재무 데이터를 종합하여 자동으로 작성되었습니다. 투자 판단 시 반드시 원문을 직접 확인하시기 바랍니다.</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="font-semibold text-amber-800 mb-2">투자 주의 사항</p>
              <ul className="list-disc pl-5 space-y-1 text-amber-700">
                <li>본 보고서는 투자 권유가 아니며 참고 자료로만 활용하십시오.</li>
                <li>AI 분석 결과는 실제 상황과 다를 수 있으며 오류가 포함될 수 있습니다.</li>
                <li>과거 데이터 및 공시 자료를 기반으로 하며 미래 성과를 보장하지 않습니다.</li>
                <li>중요한 투자 결정 전에는 반드시 전문가의 조언을 구하십시오.</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-semibold text-slate-700 mb-2">데이터 출처 범위</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-500">
                <li>DART(금융감독원 전자공시시스템) — 국내 기업 공시 및 재무제표</li>
                <li>KRX(한국거래소) — 상장 기업 주가 및 시장 정보</li>
                <li>국내외 경제 뉴스 매체 (한국경제, 매일경제, Reuters, Bloomberg 등)</li>
                <li>AI 웹 검색(Gemini 기반 실시간 검색) — 최신 이슈 및 공시 정보</li>
                <li>Financial Modeling Prep — 글로벌 기업 재무 데이터</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex justify-start">
            <button
              onClick={() => setReportSubTab('sources')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-primary/5 hover:border-primary/30 text-slate-600 hover:text-primary font-semibold text-sm transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
              출처 목록으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

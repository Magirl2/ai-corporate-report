import React, { useState } from 'react';

export default function MarketSentimentBanner({ sentiment }) {
  const [open, setOpen] = useState(false);
  if (!sentiment) return null;
  const status = sentiment.status || '중립';

  let theme = {
    bg: 'bg-slate-50',
    border: 'border-slate-500',
    borderSoft: 'border-slate-500/30',
    text: 'text-slate-600',
    header: 'text-slate-700',
    iconBg: 'bg-slate-500',
    icon: 'horizontal_rule',
  };

  const statusLower = status.toLowerCase();
  const isPositive = statusLower.includes('긍정') || statusLower.includes('positive');
  const isNegative = statusLower.includes('부정') || statusLower.includes('negative') || statusLower.includes('리스크');

  if (isPositive) {
    theme = {
      bg: 'bg-emerald-50',
      border: 'border-emerald-500',
      borderSoft: 'border-emerald-500/30',
      text: 'text-emerald-600',
      header: 'text-emerald-700',
      iconBg: 'bg-emerald-500',
      icon: 'trending_up',
    };
  } else if (isNegative) {
    theme = {
      bg: 'bg-rose-50',
      border: 'border-rose-500',
      borderSoft: 'border-rose-500/30',
      text: 'text-rose-600',
      header: 'text-rose-700',
      iconBg: 'bg-rose-500',
      icon: 'trending_down',
    };
  }

  const hasDetailOrBasis = sentiment.detail || (sentiment.basis && sentiment.basis.length > 0) || sentiment.limitations;

  return (
    <div className={`flex flex-col gap-3 w-full md:min-w-[300px]`}>
      <div className={`${theme.bg} border-l-4 ${theme.border} px-6 py-4 rounded-r-xl flex items-center justify-between gap-4 shadow-sm h-full`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full ${theme.iconBg} flex items-center justify-center text-white shrink-0`}>
            <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>
          </div>
          <div>
            <p className={`text-xs ${theme.header} font-bold uppercase tracking-tighter`}>Market Sentiment</p>
            <p className="text-lg font-bold text-on-surface">뉴스 기반 투자 심리: <span className={`${theme.text}`}>{status}</span></p>
            {sentiment.confidence && <p className={`text-xs font-medium ${theme.text} mt-0.5`}>신뢰도: {sentiment.confidence}</p>}
          </div>
        </div>
        {hasDetailOrBasis && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${open ? `bg-white border-transparent shadow-sm text-slate-700` : `bg-transparent ${theme.borderSoft} ${theme.text} hover:bg-white/50`}`}
          >
            {open ? '접기' : '상세보기'}
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{open ? 'unfold_less' : 'unfold_more'}</span>
          </button>
        )}
      </div>

      {open && hasDetailOrBasis && (
        <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-slate-100 text-sm animate-in fade-in slide-in-from-top-1">
          {sentiment.detail && (
            <div className="mb-4">
              <p className="text-xs font-black text-slate-500 uppercase tracking-tighter mb-1.5">종합 판단 근거</p>
              <p className="text-[13px] text-slate-700 leading-relaxed">{sentiment.detail}</p>
            </div>
          )}
          
          {sentiment.basis && sentiment.basis.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-black text-slate-500 uppercase tracking-tighter mb-2">세부 뉴스 연결 근거</p>
              <ul className="space-y-3">
                {sentiment.basis.map((b, i) => (
                  <li key={i} className="p-3 bg-slate-50 rounded-md border border-slate-100">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-slate-800 text-[13px] leading-snug">{b.headline}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${b.impact?.toLowerCase().includes('pos') ? 'bg-emerald-100 text-emerald-700' : b.impact?.toLowerCase().includes('neg') ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>{b.impact || 'Neutral'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-[10px] text-slate-400">
                      {b.source && <span>{b.source}</span>}
                      {b.date && <span>{b.date}</span>}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{b.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sentiment.limitations && (
            <div className="mt-2 p-3 bg-orange-50/50 rounded-md border border-orange-100/50">
              <p className="text-xs font-black text-orange-800/60 uppercase tracking-tighter mb-1">분석의 한계점</p>
              <p className="text-xs text-orange-900/70 leading-relaxed">{sentiment.limitations}</p>
            </div>
          )}
        </div>
      )}
      
      {sentiment.analysis && sentiment.analysis.length > 0 && (
        <div className="bg-surface-container-lowest p-4 rounded-lg shadow-sm border border-slate-100 text-sm">
          <ul className="space-y-2">
            {sentiment.analysis.map((item, i) => (
              <li key={i} className="flex gap-2 text-on-surface-variant">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-slate-300" />
                <span className="leading-snug">{typeof item === 'string' ? item : item.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
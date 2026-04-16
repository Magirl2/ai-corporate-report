import React from 'react';

export default function MarketSentimentBanner({ sentiment }) {
  if (!sentiment) return null;
  const status = sentiment.status || '중립';

  let theme = { 
    bg: 'bg-slate-50', 
    border: 'border-slate-500', 
    text: 'text-slate-600', 
    header: 'text-slate-700',
    iconBg: 'bg-slate-500',
    icon: 'horizontal_rule' 
  };

  const statusLower = status.toLowerCase();
  const isPositive = statusLower.includes('긍정') || statusLower.includes('매수') || statusLower.includes('positive');
  const isNegative = statusLower.includes('부정') || statusLower.includes('매도') || statusLower.includes('리스크') || statusLower.includes('negative');

  if (isPositive) {
    theme = { 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-500', 
      text: 'text-emerald-600', 
      header: 'text-emerald-700',
      iconBg: 'bg-emerald-500',
      icon: 'trending_up' 
    };
  } else if (isNegative) {
    theme = { 
      bg: 'bg-rose-50', 
      border: 'border-rose-500', 
      text: 'text-rose-600', 
      header: 'text-rose-700',
      iconBg: 'bg-rose-500',
      icon: 'trending_down' 
    };
  }

  return (
    <div className={`flex flex-col gap-3 w-full md:min-w-[300px]`}>
      <div className={`${theme.bg} border-l-4 ${theme.border} px-6 py-4 rounded-r-xl flex items-center gap-4 shadow-sm h-full`}>
        <div className={`w-10 h-10 rounded-full ${theme.iconBg} flex items-center justify-center text-white shrink-0`}>
          <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{theme.icon}</span>
        </div>
        <div>
          <p className={`text-xs ${theme.header} font-bold uppercase tracking-tighter`}>Market Sentiment</p>
          <p className="text-lg font-bold text-on-surface">투자 심리: <span className={`${theme.text}`}>{status}</span></p>
        </div>
      </div>
      
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
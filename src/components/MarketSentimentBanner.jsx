import React from 'react';
import { Minus, TrendingUp, TrendingDown } from 'lucide-react';

export default function MarketSentimentBanner({ sentiment }) {
  if (!sentiment) return null;
  const status = sentiment.status || "중립";
  
  let theme = { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-700", iconText: "text-slate-500", Icon: Minus, label: "중립 / 관망" };

  if (status.includes("긍정") || status.includes("매수")) {
    theme = { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", iconText: "text-rose-600", Icon: TrendingUp, label: "긍정적 모멘텀" };
  } else if (status.includes("부정") || status.includes("매도") || status.includes("리스크")) {
    theme = { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", iconText: "text-blue-600", Icon: TrendingDown, label: "부정적 / 주의 요망" };
  }

  const { Icon } = theme;

  return (
    <div className={`p-6 rounded-[2rem] border ${theme.border} ${theme.bg} shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 transition-all`}>
      <div className="flex flex-col items-center justify-center shrink-0">
        <div className={`p-4 bg-white rounded-full shadow-sm mb-3 ${theme.iconText}`}>
          <Icon size={40} strokeWidth={2.5} />
        </div>
        <span className={`text-sm font-extrabold tracking-wide uppercase ${theme.text}`}>{theme.label}</span>
      </div>
      <div className="flex-1 w-full space-y-3">
        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200/50 pb-2">AI 시장 심리 판단 근거</h4>
        <ul className="space-y-2">
          {(sentiment.analysis || []).map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-sm font-medium text-slate-700 leading-relaxed">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${theme.bg.replace('50', '400')}`}></span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

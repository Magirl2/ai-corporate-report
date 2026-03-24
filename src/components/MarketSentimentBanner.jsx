import React from 'react';
import MarkdownViewer from './MarkdownViewer';

export default function MarketSentimentBanner({ sentiment }) {
  if (!sentiment) return null;
  const status = sentiment.status || "중립";
  
  // 💡 긍정/부정/중립 상태에 따라 박스 배경색이 변하는 기능은 예쁘게 유지했습니다.
  let theme = { bg: "bg-slate-100", border: "border-slate-200" };

  if (status.includes("긍정") || status.includes("매수")) {
    theme = { bg: "bg-rose-50", border: "border-rose-200" };
  } else if (status.includes("부정") || status.includes("매도") || status.includes("리스크")) {
    theme = { bg: "bg-blue-50", border: "border-blue-200" };
  }

  return (
    <div className={`p-6 rounded-[2rem] border ${theme.border} ${theme.bg} shadow-sm transition-all`}>
      <div className="w-full space-y-3">
        {/* 💡 제목을 요청하신 '핵심 뉴스 요약'으로 변경했습니다. */}
        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200/50 pb-2">
          핵심 뉴스 요약
        </h4>
        <ul className="space-y-4 mt-3">
          {(sentiment.analysis || []).map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${theme.bg.replace('50', '400')}`}></span>
              <div className="text-sm font-medium text-slate-700 w-full">
                <MarkdownViewer text={text} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
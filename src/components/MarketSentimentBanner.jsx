import React, { useState } from 'react';
import MarkdownViewer from './MarkdownViewer';
import { ChevronDown } from 'lucide-react';

function AnalysisItem({ item, theme }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 하위 호환: item이 문자열인 경우도 처리
  const summary = typeof item === 'string' ? item : item.summary;
  const detail = typeof item === 'string' ? null : item.detail;

  return (
    <li className="border-b border-slate-200/50 last:border-0 pb-3 last:pb-0">
      <button
        onClick={() => detail && setIsExpanded((prev) => !prev)}
        className={`flex items-start gap-3 w-full text-left ${detail ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
        <span className="text-sm font-semibold text-slate-800 flex-1">{summary}</span>
        {detail && (
          <ChevronDown
            size={15}
            className={`shrink-0 mt-0.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {isExpanded && detail && (
        <div className="ml-4 mt-2 pl-3 border-l-2 border-slate-200 text-sm text-slate-600">
          <MarkdownViewer text={detail} />
        </div>
      )}
    </li>
  );
}

export default function MarketSentimentBanner({ sentiment }) {
  if (!sentiment) return null;
  const status = sentiment.status || '중립';

  let theme = { bg: 'bg-slate-100', border: 'border-slate-200', dot: 'bg-slate-400' };

  if (status.includes('긍정') || status.includes('매수') || status.toLowerCase().includes('positive')) {
    theme = { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-400' };
  } else if (status.includes('부정') || status.includes('매도') || status.includes('리스크') || status.toLowerCase().includes('negative')) {
    theme = { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' };
  }

  return (
    <div className={`p-6 rounded-[2rem] border ${theme.border} ${theme.bg} shadow-sm transition-all`}>
      <div className="w-full space-y-3">
        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200/50 pb-2">
          핵심 뉴스 요약
        </h4>
        <ul className="space-y-3 mt-3">
          {(sentiment.analysis || []).map((item, i) => (
            <AnalysisItem key={i} item={item} theme={theme} />
          ))}
        </ul>
      </div>
    </div>
  );
}
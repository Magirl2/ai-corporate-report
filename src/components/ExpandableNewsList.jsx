import React, { useState } from 'react';
import MarkdownViewer from './MarkdownViewer';

export default function ExpandableNewsList({ newsList }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!newsList || newsList.length === 0) {
    return <div className="text-sm text-slate-500">관련 뉴스가 없습니다.</div>;
  }

  return (
    <div className="group">
      <div className="space-y-4">
        {newsList.map((news, i) => (
          <div key={i} className="border-b pb-4 last:border-0 last:pb-0">
            <h4 className="font-bold text-slate-800 mb-1">{news.headline}</h4>
            <div className="text-sm font-medium">
              <MarkdownViewer text={news.summary} />
            </div>
            {isExpanded && news.detail && (
              <div className="mt-3 p-4 bg-slate-50 border rounded-xl text-sm">
                <MarkdownViewer text={news.detail} />
              </div>
            )}
          </div>
        ))}
      </div>
      <button 
        onClick={() => setIsExpanded((prev) => !prev)} 
        className="text-blue-600 font-semibold text-xs mt-4 hover:underline"
      >
        {isExpanded ? '전체 뉴스 상세 닫기' : '전체 뉴스 상세 보기'}
      </button>
    </div>
  );
}

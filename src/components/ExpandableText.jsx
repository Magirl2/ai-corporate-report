import React, { useState } from 'react';
import MarkdownViewer from './MarkdownViewer';

export default function ExpandableText({ summary, detail }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="group">
      <div className="text-sm font-medium">
        <MarkdownViewer text={summary} />
      </div>
      {isExpanded && (
        <div className="mt-3 p-4 bg-slate-50 border rounded-xl text-sm text-slate-600">
          <MarkdownViewer text={detail} />
        </div>
      )}
      <button onClick={() => setIsExpanded((prev) => !prev)} className="text-blue-600 font-semibold text-xs mt-2 hover:underline">
        {isExpanded ? '상세 분석 닫기' : '상세 분석 보기'}
      </button>
    </div>
  );
}

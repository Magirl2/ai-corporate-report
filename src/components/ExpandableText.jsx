import React, { useState } from 'react';

export default function ExpandableText({ summary, detail }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="group">
      <div className="text-sm leading-relaxed text-slate-700 font-medium">{summary}</div>
      {isExpanded && <div className="mt-3 p-4 bg-slate-50 border rounded-xl text-sm leading-relaxed text-slate-600">{detail}</div>}
      <button onClick={() => setIsExpanded((prev) => !prev)} className="text-blue-600 font-semibold text-xs mt-2 hover:underline">
        {isExpanded ? '상세 분석 닫기' : '상세 분석 보기'}
      </button>
    </div>
  );
}

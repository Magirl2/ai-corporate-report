import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
// 💡 1. 방금 만든 줄바꿈 마법 컴포넌트를 불러옵니다!
import FormattedText from './FormattedText'; 

export default function ExpandableSection({ icon, title, summary, detail, theme = 'light' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const baseClasses = theme === 'dark' ? "bg-slate-900 text-white shadow-lg" : "bg-white border text-slate-800 shadow-sm";
  
  return (
    <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${baseClasses}`}>
      <div className="p-6">
        <div className="flex items-center justify-between cursor-pointer mb-4" onClick={() => setIsExpanded((prev) => !prev)}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-50'}`}>{icon}</div>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        <div className="space-y-4">
          <div className={`text-base font-medium opacity-90 p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'}`}>{summary}</div>
          {isExpanded && (
            <div className="text-base leading-relaxed opacity-80 mt-2">
              {/* 💡 2. 뭉쳐있던 텍스트 대신 FormattedText를 사용해 문단을 예쁘게 쪼개줍니다! */}
              {typeof detail === 'string' ? <FormattedText text={detail} /> : detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
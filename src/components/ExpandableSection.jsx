import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
            <div className="text-base leading-relaxed opacity-80">
              {typeof detail === 'string' ? <div className="whitespace-pre-wrap">{detail}</div> : detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

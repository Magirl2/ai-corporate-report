// src/components/SwotMatrix.jsx
import React from 'react';
import { Target } from 'lucide-react';
import ExpandableText from './ExpandableText';

export default function SwotMatrix({ swot }) {
  if (!swot) return null;

  const renderItem = (item) => {
    if (typeof item === 'string') return <ExpandableText summary={item} detail={item} />;
    return <ExpandableText summary={item?.summary || ''} detail={item?.detail || ''} />;
  };

  const boxes = [
    { title: "S (강점: Strengths)", data: swot.strength, color: "bg-blue-50/50 border-blue-200 text-blue-800" },
    { title: "W (약점: Weaknesses)", data: swot.weakness, color: "bg-rose-50/50 border-rose-200 text-rose-800" },
    { title: "O (기회: Opportunities)", data: swot.opportunity, color: "bg-emerald-50/50 border-emerald-200 text-emerald-800" },
    { title: "T (위협: Threats)", data: swot.threat, color: "bg-amber-50/50 border-amber-200 text-amber-800" }
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Target className="text-indigo-500" /> 전략적 SWOT 분석
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boxes.map((box, idx) => (
          <div key={idx} className={`p-5 rounded-xl border ${box.color}`}>
            <h4 className="font-black text-sm mb-3 border-b border-current/20 pb-2">{box.title}</h4>
            {renderItem(box.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
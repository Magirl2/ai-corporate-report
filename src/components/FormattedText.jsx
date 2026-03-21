// src/components/FormattedText.jsx
import React from 'react';

export default function FormattedText({ text }) {
  if (!text) return <p className="text-slate-400 italic">내용이 없습니다.</p>;
  
  return (
    <div className="space-y-3">
      {text.split('\n').map((paragraph, index) => {
        if (!paragraph.trim()) return null; 
        
        // '-' 나 '*' 로 시작하면 글머리 기호 디자인 적용
        const isBullet = paragraph.trim().startsWith('-') || paragraph.trim().startsWith('*');
        
        return (
          <p key={index} className={`text-sm text-slate-700 leading-relaxed ${
            isBullet ? 'pl-4 relative before:content-["•"] before:absolute before:left-0 before:text-blue-500' : ''
          }`}>
            {paragraph.replace(/^[-*]\s*/, '')}
          </p>
        );
      })}
    </div>
  );
}
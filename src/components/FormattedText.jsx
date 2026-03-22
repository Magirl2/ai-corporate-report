// src/components/FormattedText.jsx
import React from 'react';

export default function FormattedText({ text }) {
  if (!text) return <p className="text-slate-400 italic">내용이 없습니다.</p>;
  
  // 1. 여기서 [숫자, 숫자] 형태의 출처 표기를 모두 지웁니다.
  const cleanText = text.replace(/\[\d+(?:,\s*\d+)*\]/g, '');
  
  return (
    <div className="space-y-3">
      {/* 2. 원본 text 대신 정제된 cleanText를 사용합니다. */}
      {cleanText.split('\n').map((paragraph, index) => {
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
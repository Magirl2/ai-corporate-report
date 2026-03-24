// src/components/FormattedText.jsx
import React from 'react';
import MarkdownViewer from './MarkdownViewer';

export default function FormattedText({ text }) {
  if (!text) return <p className="text-slate-400 italic">내용이 없습니다.</p>;
  
  return (
    <div className="text-sm text-slate-700">
      <MarkdownViewer text={text} />
    </div>
  );
}
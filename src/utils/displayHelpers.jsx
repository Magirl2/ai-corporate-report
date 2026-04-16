import React from 'react';

/**
 * 마크다운 텍스트를 전문적인 리포트 스타일로 렌더링
 */
export const renderMarkdown = (text) => {
  if (!text) return null;
  const str = String(text);

  // 불릿 포인트와 줄바꿈을 포함한 복합적인 렌더링
  const lines = str.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc ml-5 my-2 space-y-1 text-slate-700">
          {listItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('###')) {
      flushList(idx);
      elements.push(<h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2">{trimmed.replace(/^###\s+/, '')}</h4>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      listItems.push(trimmed.replace(/^[-•]\s+/, ''));
    } else if (trimmed === '') {
      flushList(idx);
    } else {
      flushList(idx);
      // **강조** 처리
      const parts = trimmed.split(/(\*\*.+?\*\*)/g);
      const content = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      elements.push(<p key={idx} className="mb-2 leading-relaxed">{content}</p>);
    }
  });
  flushList('final');

  return <div className="markdown-body text-[13.5px] text-slate-600">{elements}</div>;
};

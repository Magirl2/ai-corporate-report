import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownViewer({ text }) {
  if (!text) return null;
  return (
    <div className="whitespace-pre-wrap">
      <ReactMarkdown
        components={{
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2 text-slate-900" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-4 mb-2 text-slate-800" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-bold mt-3 mb-1 text-slate-800" {...props} />,
          p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-700" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

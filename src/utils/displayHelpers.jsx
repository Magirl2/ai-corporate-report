import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SOURCE_ID_RE = /(\[(?:DART|NEWS|AI|SRC|FMP|KRX|WEB)-\d+\])/g;

function processChildren(children) {
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child;
    const parts = child.split(SOURCE_ID_RE);
    if (parts.length === 1) return child;
    return parts.map((part, i) =>
      SOURCE_ID_RE.test(part)
        ? <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary/80 border border-primary/20 mx-0.5 font-mono">{part}</span>
        : part
    );
  });
}

const MD_COMPONENTS = {
  h1: ({ children }) => <h2 className="text-xl font-extrabold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-100">{children}</h2>,
  h2: ({ children }) => <h3 className="text-base font-bold text-slate-800 mt-5 mb-2">{children}</h3>,
  h3: ({ children }) => <h4 className="text-sm font-bold text-slate-800 mt-4 mb-1">{children}</h4>,
  p:  ({ children }) => <p className="mb-3 text-[13.5px] text-slate-600 leading-7">{processChildren(children)}</p>,
  strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-500">{children}</em>,
  ul: ({ children }) => <ul className="list-disc ml-5 my-2 space-y-1 text-[13.5px]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-5 my-2 space-y-1 text-[13.5px]">{children}</ol>,
  li: ({ children }) => <li className="text-slate-700 leading-relaxed">{processChildren(children)}</li>,
  a:  ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium break-all">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 pl-4 my-3 text-slate-500 italic text-[13px]">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-slate-50 rounded-lg p-4 my-3 overflow-x-auto border border-slate-100">{children}</pre>
  ),
  code: ({ className, children }) =>
    className
      ? <code className="text-[12px] font-mono text-slate-700 whitespace-pre">{children}</code>
      : <code className="px-1.5 py-0.5 rounded bg-slate-100 text-[12px] font-mono text-slate-700">{children}</code>,
  hr: () => <hr className="my-4 border-slate-100" />,
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-xl border border-slate-100 my-4">
      <table className="w-full text-left text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-slate-50">{children}</tbody>,
  th: ({ children }) => <th className="p-3 font-bold text-xs text-slate-500 uppercase tracking-wide">{children}</th>,
  td: ({ children }) => <td className="p-3 text-[13px] text-slate-700">{processChildren(children)}</td>,
};

export const renderMarkdown = (text) => {
  if (!text) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {String(text)}
    </ReactMarkdown>
  );
};

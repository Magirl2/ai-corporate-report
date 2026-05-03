import React from 'react';

export default function Footer({ className = '', onNavigate }) {
  const isFixed = className.includes('fixed');
  // Combine base classes with any passed className overrides (like absolute/fixed positioning or border styles)
  return (
    <footer className={`bg-white px-8 py-6 w-full ${!isFixed && 'mt-auto border-t border-slate-100'} ${className}`}>
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-body text-xs text-slate-400">© {new Date().getFullYear()} Editorial Intelligence. All rights reserved.</p>
        <div className="flex gap-6">
          <button type="button" onClick={() => onNavigate?.('data-notice')} className="font-body text-xs text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer">데이터 출처 및 고지사항</button>
          <button type="button" onClick={() => onNavigate?.('privacy-policy')} className="font-body text-xs text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer">개인정보처리방침</button>
          <button type="button" onClick={() => onNavigate?.('terms')} className="font-body text-xs text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer">이용약관</button>
        </div>
      </div>
    </footer>
  );
}

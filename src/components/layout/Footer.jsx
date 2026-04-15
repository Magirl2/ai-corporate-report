import React from 'react';

export default function Footer({ className = '' }) {
  const isFixed = className.includes('fixed');
  // Combine base classes with any passed className overrides (like absolute/fixed positioning or border styles)
  return (
    <footer className={`bg-white px-8 py-6 w-full ${!isFixed && 'mt-auto border-t border-slate-100'} ${className}`}>
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="font-body text-xs text-slate-400">© {new Date().getFullYear()} Editorial Intelligence. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="font-body text-xs text-slate-400 hover:text-slate-600 transition-colors">데이터 출처 및 고지사항</a>
          <a href="#" className="font-body text-xs text-slate-400 hover:text-slate-600 transition-colors">개인정보처리방침</a>
          <a href="#" className="font-body text-xs text-slate-400 hover:text-slate-600 transition-colors">이용약관</a>
        </div>
      </div>
    </footer>
  );
}

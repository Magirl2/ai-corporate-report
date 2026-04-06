import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SideNavBar() {
  const { currentUser, logout } = useAuth();
  
  return (
    <aside className="fixed left-0 h-full w-64 bg-slate-50 flex flex-col p-6 gap-2 z-40 hidden md:flex border-r border-slate-100">
      <div className="mb-10">
        <h1 className="text-lg font-black text-primary uppercase tracking-widest font-headline">Editorial Intelligence</h1>
        <p className="text-xs text-slate-500 font-headline font-semibold mt-1 tracking-wider">AI Financial Curator</p>
      </div>
      
      <nav className="flex-1 space-y-1 font-body">
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all rounded-lg group">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600">dashboard</span>
          <span className="font-medium text-sm">대시보드</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary-container/10 text-primary font-semibold rounded-lg">
          <span className="material-symbols-outlined text-primary">analytics</span>
          <span className="font-medium text-sm">시장 분석</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all rounded-lg group">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600">psychology</span>
          <span className="font-medium text-sm">인공지능 리포트</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-200 transition-all rounded-lg group">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600">account_balance_wallet</span>
          <span className="font-medium text-sm">포트폴리오</span>
        </a>
      </nav>
      
      <div className="mt-auto space-y-1 pt-6 border-t border-slate-200">
        <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white rounded-full py-3 px-4 font-semibold text-sm mb-4 shadow hover:shadow-lg transition-all active:scale-95">
          신규 분석 생성
        </button>
        <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg text-sm group">
          <span className="material-symbols-outlined text-sm group-hover:text-slate-800">help</span>
          <span>고객지원</span>
        </a>
        {currentUser && (
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg text-sm group">
            <span className="material-symbols-outlined text-sm group-hover:text-slate-800">logout</span>
            <span>로그아웃</span>
          </button>
        )}
      </div>
    </aside>
  );
}

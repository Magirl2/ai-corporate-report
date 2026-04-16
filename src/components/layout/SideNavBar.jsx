import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SideNavBar({ tab, setTab, navigateToSearch }) {
  const { currentUser, logout } = useAuth();

  const navItems = [
    { key: 'search',  icon: 'dashboard',             label: '홈 / 대시보드' },
    { key: 'single',  icon: 'analytics',              label: '기업 분석' },
    { key: 'compare', icon: 'psychology',             label: '1:1 비교 분석' },
    { key: 'pricing', icon: 'account_balance_wallet', label: '요금제' },
  ];

  const handleNav = (key) => {
    if (key === 'search') {
      navigateToSearch?.();
    } else {
      setTab?.(key);
    }
  };

  // 사이드바 활성 탭 판단
  const activeKey = tab === 'search' || !tab ? 'search' : tab;

  return (
    <aside className="fixed left-0 h-full w-64 bg-slate-50 flex flex-col p-6 gap-2 z-40 hidden md:flex border-r border-slate-100">
      <div className="mb-10">
        <h1 className="text-lg font-black text-primary uppercase tracking-widest font-headline">Editorial Intelligence</h1>
        {currentUser?.role === 'admin' ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-[10px] text-rose-600 font-bold rounded-md border border-rose-100 mt-1 uppercase tracking-tighter">
            <span className="material-symbols-outlined text-[12px] font-bold">verified_user</span>
            Admin Mode
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-headline font-semibold mt-1 tracking-wider">AI Financial Curator</p>
        )}
      </div>

      <nav className="flex-1 space-y-1 font-body">
        {navItems.map(({ key, icon, label }) => {
          const isActive = activeKey === key;
          return (
            <button
              key={key}
              onClick={() => handleNav(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left group
                ${isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-600 hover:bg-slate-200'
                }`}
            >
              <span
                className={`material-symbols-outlined transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              <span className="font-medium text-sm">{label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 pt-6 border-t border-slate-200">
        <button
          onClick={() => navigateToSearch?.()}
          className="w-full bg-gradient-to-r from-primary to-primary-container text-white rounded-full py-3 px-4 font-semibold text-sm mb-4 shadow hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>add_circle</span>
          신규 분석 생성
        </button>
        <button
          onClick={() => alert('고객지원: support@editorial-intelligence.ai')}
          className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-slate-900 transition-colors rounded-lg text-sm group"
        >
          <span className="material-symbols-outlined text-sm group-hover:text-slate-800">help</span>
          <span>고객지원</span>
        </button>
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

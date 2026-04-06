import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function TopNavBar({ tab, setTab, searchInput, setSearchInput, onSearch, showSearch }) {
  const { currentUser } = useAuth();
  
  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between px-8 py-4 max-w-[1920px] mx-auto">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-headline hidden lg:block uppercase tracking-widest text-primary">Editorial Intelligence</span>
          <nav className="flex items-center gap-6 font-headline font-medium">
            <button 
              onClick={() => setTab('single')}
              className={`pb-2 transition-colors duration-300 border-b-4 ${tab === 'single' ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary active:opacity-70'}`}
            >
              단일 기업 보고서
            </button>
            <button 
              onClick={() => setTab('compare')}
              className={`pb-2 transition-colors duration-300 border-b-4 ${tab === 'compare' ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary active:opacity-70'}`}
            >
              기업 1:1 비교 (VS)
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {showSearch && (
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              <form onSubmit={onSearch}>
                <input 
                  className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-primary w-64 transition-all" 
                  placeholder="기업명 검색..." 
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </form>
            </div>
          )}
          
          <button className="flex items-center justify-center p-2 text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          {currentUser ? (
            <div className="flex items-center gap-3 ml-2 group cursor-pointer" onClick={() => setTab('pricing')}>
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold">{currentUser.name || currentUser.email.split('@')[0]}</p>
                <p className={`text-[10px] uppercase tracking-wider font-bold ${currentUser.plan === 'premium' ? 'text-primary' : 'text-slate-400'}`}>{currentUser.plan} PLAN</p>
              </div>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold">
                {currentUser.name ? currentUser.name[0] : currentUser.email[0].toUpperCase()}
              </div>
            </div>
          ) : (
            <button onClick={() => setTab('login')} className="ml-2 px-5 py-2 bg-slate-900 text-white font-bold text-sm rounded-full hover:bg-slate-800 transition-colors">
              로그인
            </button>
          )}
        </div>
      </div>
      <div className="bg-slate-100/50 dark:bg-slate-800/50 h-[1px]"></div>
    </header>
  );
}

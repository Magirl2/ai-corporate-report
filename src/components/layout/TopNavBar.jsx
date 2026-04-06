import React from 'react';

export default function TopNavBar({ tab, setTab, searchInput, setSearchInput, onSearch, showSearch }) {
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
          <button className="flex items-center justify-center p-2 text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
          
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-200 ml-2">
            <img alt="사용자 프로필" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9b5KMl_yIKNWb-V3lw4GYL5-8NUvnrMYsOZ-vVPtfS6bpbhod_y6xJPorjd5OS8v96wRV_Z5eERpLiB2jLPC2oH3hJPq2ODkQhQ8mJuh91D1_NJvPAEybruEXxgvhesmZaMszLRf7nL797w8yb94cd6krL3FERJ5v5CvmHPvfr_t27O33RIQ7YYyb99rhWwuIjhYanuPtN3Bn7vTjMz3BUsl2cMiPtC8LpQbrxfsMpp8aYciQV1GI4E7_MTdQj8ZMnXYj7n-lD0UW"/>
          </div>
        </div>
      </div>
      <div className="bg-slate-100/50 dark:bg-slate-800/50 h-[1px]"></div>
    </header>
  );
}

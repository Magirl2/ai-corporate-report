import React from 'react';

export default function SearchDashboard({ searchInput, setSearchInput, onSearch, setTab }) {
  // Use today's date formatted
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '년', 1).replace(/\./g, '월', 1).replace(/\./g, '일').replace(/\s/g, ' ');

  const handleQuickSearch = (keyword) => {
    setSearchInput(keyword);
    // Let the parent component handle actually calling the search
  };

  return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center animate-in fade-in zoom-in duration-500">
      {/* Branding Header for Context */}
      <div className="text-center mb-12">
        <span className="text-primary font-headline font-bold text-sm tracking-widest uppercase mb-4 block">The Digital Curator</span>
        <h1 className="text-4xl md:text-5xl font-bold text-on-surface font-headline tracking-tight mb-4">Search Insights</h1>
        <p className="text-on-surface-variant text-lg">{today} • AI가 분석하는 기업의 본질</p>
      </div>

      {/* Search Bar Component */}
      <div className="w-full max-w-3xl relative group px-4">
        <form onSubmit={onSearch}>
          <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontSize: '24px' }}>search</span>
          </div>
          <input 
            className="w-full pl-16 pr-32 py-6 bg-surface-container-lowest text-xl rounded-full border-0 shadow-[0px_24px_48px_-12px_rgba(11,28,48,0.08)] focus:ring-2 focus:ring-primary/20 transition-all duration-300 placeholder:text-outline/60" 
            placeholder="정확한 종목명을 입력하세요 (예: 삼성전자)" 
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="absolute right-8 inset-y-2 flex items-center">
            <button type="submit" className="px-8 h-full bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-full shadow-lg hover:shadow-primary/20 active:scale-95 transition-all">
              분석하기
            </button>
          </div>
        </form>
      </div>

      {/* Empty State / Introduction */}
      <div className="mt-20 text-center">
        <div className="w-32 h-32 bg-surface-container-low rounded-xl flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-105 duration-500">
          <span className="material-symbols-outlined text-6xl text-primary/30" style={{ fontVariationSettings: "'wght' 200" }}>corporate_fare</span>
        </div>
        <h2 className="text-2xl font-semibold text-on-surface mb-3">분석을 원하는 기업명을 검색해 보세요.</h2>
        <p className="text-on-surface-variant max-w-md mx-auto leading-relaxed">
          AI가 실시간 데이터를 기반으로 전문 보고서를 생성합니다.<br/>
          시장 동향, 재무 분석, 그리고 향후 전망을 한눈에 확인하세요.
        </p>

        {/* Quick Filter / Chips */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {['삼성전자', 'SK하이닉스', '현대자동차', 'NAVER'].map((tag) => (
            <button 
              key={tag}
              onClick={() => handleQuickSearch(tag)}
              className="px-5 py-2 bg-surface-container-high text-on-surface-variant text-sm font-medium rounded-full hover:bg-primary hover:text-white transition-all duration-300"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Search Bento Section */}
      <div className="max-w-5xl mx-auto w-full mt-24 px-4 pb-12">
        <h3 className="text-sm font-bold text-on-surface-variant mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">history</span>
          최근 분석 기록
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-all group cursor-pointer border-0" onClick={() => handleQuickSearch('삼성전자')}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">KOSPI 005930</p>
                <h4 className="text-lg font-bold">삼성전자</h4>
              </div>
              <span className="material-symbols-outlined text-emerald-500">trending_up</span>
            </div>
            <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-3/4"></div>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:shadow-md transition-all group cursor-pointer border-0" onClick={() => handleQuickSearch('Apple')}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs text-on-surface-variant mb-1">NASDAQ AAPL</p>
                <h4 className="text-lg font-bold">Apple Inc.</h4>
              </div>
              <span className="material-symbols-outlined text-rose-500">trending_down</span>
            </div>
            <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 w-1/2"></div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-primary-container/10 to-secondary-container/10 p-6 rounded-lg shadow-sm group cursor-pointer relative overflow-hidden" onClick={() => setTab('compare')}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h4 className="text-sm font-bold text-primary">AI 신규 기능</h4>
            </div>
            <p className="text-sm font-medium leading-snug">기업 1:1 비교 분석 모드가 새로 추가되었습니다. 두 기업을 분석해보세요.</p>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-8xl">analytics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// App.jsx 수정본 (주요 변경 부분)

// 1. 헤더 내 검색창 플레이스홀더 수정
<form onSubmit={handleSearch} className="w-full sm:max-w-md relative">
  <input 
    type="text" 
    value={searchInput} 
    onChange={(e) => setSearchInput(e.target.value)}
    placeholder="기업명을 입력하세요 (예: 삼성전자, SK하이닉스)" // <-- 구체적인 예시 추가
    className="w-full pl-10 pr-4 py-2 border rounded-full outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
  />
  <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
</form>

// ... 중략 ...

// 2. 단일 기업 보고서 초기 화면 수정
{!loading && !singleData && !error && (
  <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400"> 
    {/* py-32에서 py-24로 조정하여 밸런스 최적화 */}
    <div className="w-20 h-20 mb-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
      {/* BarChart2를 Building2로 교체하고 스타일 개선 */}
      <Building2 size={40} className="text-slate-300" />
    </div>
    <h2 className="text-xl font-bold text-slate-600 mb-2">글로벌 기업 인사이트 분석</h2>
    <p className="text-sm max-w-xs leading-relaxed text-slate-400">
      미국 기업은 FMP, 한국 기업은 DART 전자공시 기반으로<br /> 최신 동향을 빠르게 수집합니다.
    </p>
  </div>
)}

// ... 중략 ...

// 3. 기업 1:1 비교 초기 화면 수정
{!compareLoading && !compareDataA && !compareDataB && !compareError && (
  <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
    <div className="w-20 h-20 mb-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
      <Building2 size={40} className="text-slate-300" />
    </div>
    <h2 className="text-xl font-bold text-slate-600 mb-2">기업 1:1 비교 분석</h2>
    <p className="text-sm max-w-xs leading-relaxed">두 기업명을 입력하면 재무 지표를 나란히 비교해 드립니다.</p>
  </div>
)}

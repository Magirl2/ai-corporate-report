import React, { useState } from 'react';
import { fetchCompanyData } from './api/companyService';
import TopNavBar from './components/layout/TopNavBar';
import SideNavBar from './components/layout/SideNavBar';
import Footer from './components/layout/Footer';
import SearchDashboard from './pages/SearchDashboard';
import SingleReportView from './pages/SingleReportView';
import LoadingScreen from './components/LoadingScreen';
import CompareFinancials from './components/CompareFinancials';

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Tabs: 'search' (dashboard), 'single' (report), 'compare'
  const [tab, setTab] = useState('search'); 
  const [singleData, setSingleData] = useState(null);

  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [compareDataA, setCompareDataA] = useState(null);
  const [compareDataB, setCompareDataB] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);
  const [compareStatus, setCompareStatus] = useState('');

  const navigateToSearch = () => {
    setTab('search');
    setSingleData(null);
    setSearchInput('');
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    setTab('single');
    setLoading(true); 
    setError(null); 
    setSingleData(null); 
    setStatusMessage('');
    
    try {
      const data = await fetchCompanyData(searchInput, setStatusMessage);
      setSingleData(data);
    } catch (err) {
      setError(`분석 중 오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompareSearch = async (e) => {
    if (e) e.preventDefault();
    if (!inputA.trim() || !inputB.trim()) return;
    setCompareLoading(true); 
    setCompareError(null); 
    setCompareDataA(null); 
    setCompareDataB(null); 
    setCompareStatus('');
    
    try {
      const [dataA, dataB] = await Promise.all([
        fetchCompanyData(inputA, (msg) => setCompareStatus(msg)),
        fetchCompanyData(inputB, (msg) => setCompareStatus(msg)),
      ]);
      setCompareDataA(dataA);
      setCompareDataB(dataB);
    } catch (err) {
      setCompareError(`비교 분석 중 오류 발생: ${err.message}`);
    } finally {
      setCompareLoading(false);
    }
  };

  // View state logic
  const isSearchFocus = tab === 'search';

  return (
    <div className="bg-surface text-on-surface min-h-screen flex selection:bg-primary-container selection:text-on-primary-container font-body">
      {/* Side Nav is hidden in Search Focus view per the design */}
      {!isSearchFocus && <SideNavBar />}

      <div className={`flex-1 flex flex-col min-h-screen ${!isSearchFocus ? 'md:ml-64' : ''} transition-all duration-300`}>
        <TopNavBar 
          tab={tab === 'search' ? 'single' : tab} 
          setTab={(t) => {
             // If user clicks a tab while in search focus, just switch tab state. 
             // If they click 'single' when they have no data, maybe go to search.
             if (t === 'single' && !singleData) setTab('search');
             else setTab(t);
          }} 
          onSearch={handleSearch}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          showSearch={tab === 'single'} 
        />

        {/* Loading Overlay replaces main content entirely when loading */}
        {(loading || compareLoading) ? (
           <LoadingScreen message={loading ? statusMessage : compareStatus} />
        ) : (
          <main className={`flex-1 flex flex-col pt-24 px-6 md:px-12 pb-20 ${isSearchFocus ? '' : 'max-w-[1400px] mx-auto w-full'}`}>
            
            {/* Main Search Dashboard */}
            {tab === 'search' && (
              <SearchDashboard 
                searchInput={searchInput} 
                setSearchInput={setSearchInput} 
                onSearch={handleSearch} 
                setTab={setTab}
              />
            )}

            {/* Error States */}
            {(error || compareError) && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-r-xl w-full max-w-4xl mx-auto my-8 flex items-start gap-4">
                <span className="material-symbols-outlined text-rose-500">error</span>
                <div>
                  <h3 className="font-bold text-rose-800 mb-1">분석 중 오류 발생</h3>
                  <p className="text-rose-600 text-sm">{error || compareError}</p>
                  <button onClick={navigateToSearch} className="mt-4 text-sm font-semibold text-rose-700 hover:text-rose-900 underline">처음으로 돌아가기</button>
                </div>
              </div>
            )}

            {/* Single Report View */}
            {tab === 'single' && !error && singleData && (
              <SingleReportView singleData={singleData} />
            )}

            {/* Compare View */}
            {tab === 'compare' && !compareError && (
              <div className="w-full mx-auto animate-in fade-in slide-in-from-bottom-8">
                <section className="mb-12">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-surface-container-high text-primary text-xs font-bold rounded-full mb-3 tracking-wider">COMPARE MODE</span>
                      <h2 className="text-4xl font-bold tracking-tight text-on-surface font-headline">기업 1:1 비교 분석</h2>
                      <p className="text-on-surface-variant mt-2">두 기업의 핵심 재무 지표와 성장 잠재력을 한눈에 비교합니다.</p>
                    </div>
                  </div>

                  <form onSubmit={handleCompareSearch} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative">
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full items-center justify-center shadow-xl border border-slate-100">
                      <span className="font-headline font-black text-primary italic">VS</span>
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center text-primary">
                        <span className="material-symbols-outlined">apartment</span>
                      </div>
                      <input 
                        className="w-full pl-14 pr-6 py-5 bg-surface-container-lowest rounded-lg border-none focus:ring-2 focus:ring-primary shadow-sm group-hover:shadow-md transition-all text-lg font-bold" 
                        placeholder="기준 기업 입력 (예: 삼성전자)" 
                        type="text" 
                        value={inputA} 
                        onChange={(e) => setInputA(e.target.value)} 
                      />
                    </div>
                    
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-6 flex items-center text-rose-500">
                        <span className="material-symbols-outlined">apartment</span>
                      </div>
                      <input 
                        className="w-full pl-14 pr-32 py-5 bg-surface-container-lowest rounded-lg border-none focus:ring-2 focus:ring-rose-500 shadow-sm group-hover:shadow-md transition-all text-lg font-bold" 
                        placeholder="비교 기업 입력 (예: SK하이닉스)" 
                        type="text" 
                        value={inputB} 
                        onChange={(e) => setInputB(e.target.value)} 
                      />
                      <div className="absolute right-2 inset-y-2 flex items-center">
                        <button type="submit" className="px-6 h-full bg-slate-800 text-white font-semibold rounded-md shadow-sm hover:bg-slate-900 active:scale-95 transition-all">
                          비교하기
                        </button>
                      </div>
                    </div>
                  </form>
                </section>

                {compareDataA && compareDataB && (
                  <CompareFinancials dataA={compareDataA} dataB={compareDataB} />
                )}
              </div>
            )}
          </main>
        )}

        {/* Footer */}
        <Footer className={isSearchFocus ? "" : "border-t-0 bg-slate-50"} />
      </div>

      {/* Mobile Bottom Nav Bar Component */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-50 pb-safe">
        <button className={`flex flex-col items-center gap-1 ${isSearchFocus ? 'text-primary' : 'text-slate-400'}`} onClick={navigateToSearch}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: isSearchFocus ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span className="text-[10px]">홈</span>
        </button>
        <button className={`flex flex-col items-center gap-1 ${tab === 'single' ? 'text-primary' : 'text-slate-400'}`} onClick={() => setTab('single')}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: tab === 'single' ? "'FILL' 1" : "'FILL' 0" }}>analytics</span>
          <span className="text-[10px]">분석</span>
        </button>
        <div className="relative -top-6">
          <button className="bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all">
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
        <button className={`flex flex-col items-center gap-1 ${tab === 'compare' ? 'text-primary' : 'text-slate-400'}`} onClick={() => setTab('compare')}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: tab === 'compare' ? "'FILL' 1" : "'FILL' 0" }}>psychology</span>
          <span className="text-[10px]">비교</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px]">프로필</span>
        </button>
      </nav>
    </div>
  );
}
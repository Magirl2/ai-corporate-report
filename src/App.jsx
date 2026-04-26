import React, { useState, useEffect } from 'react';
import TopNavBar from './components/layout/TopNavBar';
import SideNavBar from './components/layout/SideNavBar';
import Footer from './components/layout/Footer';
import SearchDashboard from './pages/SearchDashboard';
import SingleReportView from './pages/SingleReportView';
import LoadingScreen from './components/LoadingScreen';
import CompareFinancials from './components/CompareFinancials';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Pricing from './pages/Pricing';
import { useAuth } from './contexts/AuthContext';
import { useSingleReport } from './hooks/useSingleReport';
import { useCompareReport } from './hooks/useCompareReport';

/* ── 토스트 알림 컴포넌트 ── */
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    info: { bg: '#eff4ff', border: '#004ac6', text: '#004ac6', icon: 'info' },
    error: { bg: '#fff1f2', border: '#f43f5e', text: '#be123c', icon: 'error' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: 'check_circle' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: 'warning' },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000,
      background: c.bg, borderLeft: `4px solid ${c.border}`,
      color: c.text, borderRadius: '0.75rem',
      padding: '0.875rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      boxShadow: '0 8px 24px rgba(11,28,48,0.12)',
      minWidth: '280px', maxWidth: '480px',
      animation: 'fadeInUp 0.3s ease-out',
      fontSize: '0.9rem', fontWeight: 600,
    }}>
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
      </button>
    </div>
  );
}

export default function App() {
  const auth = useAuth();
  const { currentUser } = auth;
  const [tab, setTab] = useState('search');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const single = useSingleReport({ auth, showToast, setTab });
  const compare = useCompareReport({ auth, showToast, setTab });

  // 로그아웃 시 단일 보고서 뷰 초기화 (검색 기록은 유지됨)
  useEffect(() => {
    if (!currentUser) {
      single.resetSearch();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (tab === 'single') setTab('search');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const navigateToSearch = () => {
    setTab('search');
    single.resetSearch();
  };


  const isSearchFocus = tab === 'search';
  const showSidebar = !isSearchFocus && !['login', 'signup', 'pricing'].includes(tab);

  return (
    <div style={{ background: 'var(--color-surface)', color: 'var(--color-on-surface)', minHeight: '100vh', display: 'flex' }}>
      {showSidebar && <SideNavBar tab={tab} setTab={setTab} navigateToSearch={navigateToSearch} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', marginLeft: showSidebar ? undefined : 0, transition: 'margin 0.3s' }}
        className={showSidebar ? 'md:ml-64' : ''}
      >
        <TopNavBar
          tab={tab === 'search' ? 'single' : tab}
          setTab={(t) => {
            if (t === 'single' && !single.singleData) setTab('search');
            else setTab(t);
          }}
          onSearch={single.handleSearch}
          searchInput={single.searchInput}
          setSearchInput={single.setSearchInput}
          showSearch={tab === 'single'}
        />

        {/* 로딩 화면 */}
        {(single.loading || compare.compareLoading) ? (
          <LoadingScreen message={single.loading ? single.statusMessage : compare.compareStatus} />
        ) : (
          <main className={`flex-1 flex flex-col pt-24 px-6 md:px-12 pb-20 ${isSearchFocus ? '' : 'max-w-[1400px] mx-auto w-full'}`}>

            {/* 검색 대시보드 */}
            {tab === 'search' && (
              <SearchDashboard
                searchInput={single.searchInput}
                setSearchInput={single.setSearchInput}
                onSearch={single.handleSearch}
                setTab={setTab}
                recentSearches={single.recentSearches}
                onDeleteRecentSearch={single.removeRecentSearchItem}
                onClearRecentSearches={single.clearRecentSearchHistory}
                onRefreshSearch={single.refreshSearch}
              />
            )}

            {/* 에러 배너 */}
            {(single.error || compare.compareError) && (
              <div style={{
                background: '#fff1f2', borderLeft: '4px solid #f43f5e',
                padding: '1.5rem', borderRadius: '0.75rem',
                margin: '2rem auto', maxWidth: '800px', width: '100%',
                display: 'flex', gap: '1rem', alignItems: 'flex-start',
              }}>
                <span className="material-symbols-outlined" style={{ color: '#f43f5e', fontVariationSettings: "'FILL' 1" }}>error</span>
                <div>
                  <h3 style={{ fontWeight: 700, color: '#be123c', marginBottom: '0.25rem' }}>분석 중 오류 발생</h3>
                  <p style={{ color: '#be123c', fontSize: '0.875rem' }}>{single.error || compare.compareError}</p>
                  <button
                    onClick={navigateToSearch}
                    style={{
                      marginTop: '1rem', fontSize: '0.875rem', fontWeight: 600,
                      color: '#be123c', background: 'none', border: 'none',
                      cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    처음으로 돌아가기
                  </button>
                </div>
              </div>
            )}

            {/* 단일 보고서 */}
            {tab === 'single' && !single.error && single.singleData && (
              <SingleReportView singleData={single.singleData} />
            )}

            {/* 비교 분석 */}
            {tab === 'compare' && !compare.compareError && (
              <div className="w-full mx-auto animate-in fade-in">
                <section style={{ marginBottom: '3rem' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.25rem 0.75rem',
                      background: 'var(--color-surface-container-high)',
                      color: 'var(--color-primary)',
                      fontSize: '0.75rem', fontWeight: 700, borderRadius: '9999px',
                      marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>Compare Mode</span>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>기업 1:1 비교 분석</h2>
                    <p style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.5rem' }}>두 기업의 핵심 재무 지표와 성장 잠재력을 한눈에 비교합니다.</p>
                  </div>

                  <form onSubmit={compare.handleCompareSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', position: 'relative' }}>
                    {/* VS 뱃지 */}
                    <div style={{
                      position: 'absolute', left: '50%', top: '50%',
                      transform: 'translate(-50%,-50%)', zIndex: 10,
                      width: '48px', height: '48px',
                      background: '#fff', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(11,28,48,0.12)',
                      border: '1px solid var(--color-outline-variant)',
                    }}>
                      <span style={{ fontWeight: 900, color: 'var(--color-primary)', fontStyle: 'italic', fontSize: '0.875rem' }}>VS</span>
                    </div>

                    {/* 기업 A */}
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{
                        position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--color-primary)', fontSize: '20px', pointerEvents: 'none',
                      }}>apartment</span>
                      <input
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          paddingLeft: '3rem', paddingRight: '1rem', paddingTop: '1.25rem', paddingBottom: '1.25rem',
                          background: 'var(--color-surface-container-lowest)',
                          border: '1.5px solid var(--color-outline-variant)',
                          borderRadius: '1rem', fontSize: '1rem', fontWeight: 700,
                          color: 'var(--color-on-surface)', outline: 'none',
                        }}
                        placeholder="기준 기업 입력 (예: 삼성전자)"
                        type="text" value={compare.inputA}
                        onChange={(e) => compare.setInputA(e.target.value)}
                      />
                    </div>

                    {/* 기업 B + 비교하기 버튼 */}
                    <div style={{ position: 'relative' }}>
                      <span className="material-symbols-outlined" style={{
                        position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                        color: '#f43f5e', fontSize: '20px', pointerEvents: 'none',
                      }}>apartment</span>
                      <input
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          paddingLeft: '3rem', paddingRight: '8rem', paddingTop: '1.25rem', paddingBottom: '1.25rem',
                          background: 'var(--color-surface-container-lowest)',
                          border: '1.5px solid var(--color-outline-variant)',
                          borderRadius: '1rem', fontSize: '1rem', fontWeight: 700,
                          color: 'var(--color-on-surface)', outline: 'none',
                        }}
                        placeholder="비교 기업 입력 (예: SK하이닉스)"
                        type="text" value={compare.inputB}
                        onChange={(e) => compare.setInputB(e.target.value)}
                      />
                      <button
                        type="submit"
                        style={{
                          position: 'absolute', right: '8px', top: '8px', bottom: '8px',
                          backgroundColor: '#1e293b', color: '#fff',
                          border: 'none', borderRadius: '0.625rem',
                          padding: '0 1.25rem', fontWeight: 700, fontSize: '0.875rem',
                          cursor: 'pointer',
                        }}
                      >
                        비교하기
                      </button>
                    </div>
                  </form>
                </section>

                {compare.compareDataA && compare.compareDataB && (
                  <CompareFinancials dataA={compare.compareDataA} dataB={compare.compareDataB} />
                )}
              </div>
            )}

            {/* 인증 / 결제 페이지 */}
            {tab === 'login'   && <Login setTab={setTab} />}
            {tab === 'signup'  && <Signup setTab={setTab} />}
            {tab === 'pricing' && <Pricing setTab={setTab} />}

          </main>
        )}

        <Footer />
      </div>

      {/* 모바일 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 flex justify-around items-center z-50"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
      >
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', color: isSearchFocus ? 'var(--color-primary)' : '#94a3b8' }}
          onClick={navigateToSearch}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: isSearchFocus ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
          <span style={{ fontSize: '10px', fontWeight: 600 }}>홈</span>
        </button>
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', color: tab === 'single' ? 'var(--color-primary)' : '#94a3b8' }}
          onClick={() => setTab('single')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: tab === 'single' ? "'FILL' 1" : "'FILL' 0" }}>analytics</span>
          <span style={{ fontSize: '10px', fontWeight: 600 }}>분석</span>
        </button>
        <div style={{ position: 'relative', top: '-20px' }}>
          <button
            onClick={() => setTab('pricing')}
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,74,198,0.4)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}>diamond</span>
          </button>
        </div>
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', color: tab === 'compare' ? 'var(--color-primary)' : '#94a3b8' }}
          onClick={() => setTab('compare')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: tab === 'compare' ? "'FILL' 1" : "'FILL' 0" }}>psychology</span>
          <span style={{ fontSize: '10px', fontWeight: 600 }}>비교</span>
        </button>
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', color: ['login','signup'].includes(tab) ? 'var(--color-primary)' : '#94a3b8' }}
          onClick={() => setTab(currentUser ? 'search' : 'login')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>person</span>
          <span style={{ fontSize: '10px', fontWeight: 600 }}>{currentUser ? '내 정보' : '로그인'}</span>
        </button>
      </nav>

      {/* 토스트 알림 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
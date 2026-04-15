import React, { useMemo } from 'react';

// 상대 시간 포맷터
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

// 기업명 → 일관된 액센트 색상
const COLOR_SEEDS = ['#004ac6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
function nameToColor(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLOR_SEEDS[Math.abs(hash) % COLOR_SEEDS.length];
}

const FALLBACK_COMPANIES = [
  { name: '삼성전자' },
  { name: 'Apple' },
  { name: '카카오' },
];

export default function SearchDashboard({ searchInput, setSearchInput, onSearch, setTab }) {
  const d = new Date();
  const today = `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;

  // LocalStorage에서 최근 검색 기록 로드
  const recentSearches = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ei_recent_searches') || '[]');
    } catch {
      return [];
    }
  }, []);

  const hasHistory = recentSearches.length > 0;

  const handleQuickSearch = (keyword) => {
    setSearchInput(keyword);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      onSearch(fakeEvent, keyword);
    }, 50);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(e);
  };

  return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center animate-in fade-in duration-500">

      {/* 브랜딩 헤더 */}
      <div className="text-center mb-10">
        <span
          className="font-bold text-sm tracking-widest uppercase mb-4 block"
          style={{ color: 'var(--color-primary)' }}
        >
          The Digital Curator
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 font-headline"
          style={{ color: 'var(--color-on-surface)' }}
        >
          Search Insights
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)' }} className="text-lg">
          {today} • AI가 분석하는 기업의 본질
        </p>
      </div>

      {/* 검색바 */}
      <div className="w-full max-w-2xl relative px-4">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center"
            style={{
              background: 'var(--color-surface-container-lowest)',
              borderRadius: '9999px',
              boxShadow: '0 8px 32px rgba(11,28,48,0.10)',
              border: '1px solid var(--color-outline-variant)',
            }}
          >
            <span
              className="material-symbols-outlined absolute left-5 pointer-events-none"
              style={{ color: 'var(--color-primary)', fontSize: '22px' }}
            >
              search
            </span>
            <input
              className="w-full bg-transparent text-base outline-none"
              style={{
                paddingLeft: '3rem',
                paddingRight: '7.5rem',
                paddingTop: '1rem',
                paddingBottom: '1rem',
                color: 'var(--color-on-surface)',
                fontSize: '1rem',
              }}
              placeholder="정확한 종목명을 입력하세요 (예: 삼성전자)"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: '6px',
                top: '6px',
                bottom: '6px',
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                borderRadius: '9999px',
                padding: '0 1.25rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,74,198,0.3)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>
                analytics
              </span>
              분석하기
            </button>
          </div>
        </form>
      </div>

      {/* 소개 영역 */}
      <div className="mt-16 text-center">
        <div
          className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-105 duration-500"
          style={{
            background: 'var(--color-surface-container)',
            boxShadow: '0 4px 16px rgba(11,28,48,0.06)',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '44px',
              color: 'var(--color-primary)',
              opacity: 0.5,
              fontVariationSettings: "'FILL' 1, 'wght' 300",
            }}
          >
            domain
          </span>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-on-surface)' }}>
          분석을 원하는 기업명을 검색해 보세요.
        </h2>
        <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
          AI가 실시간 데이터를 기반으로 전문 보고서를 생성합니다.<br />
          시장 동향, 재무 분석, 그리고 향후 전망을 한눈에 확인하세요.
        </p>

        {/* 퀵 검색 태그 */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {['삼성전자', 'SK하이닉스', '현대자동차', 'NAVER', 'Apple', 'Tesla'].map((tag) => (
            <button
              key={tag}
              onClick={() => handleQuickSearch(tag)}
              style={{
                padding: '0.375rem 1rem',
                background: 'var(--color-surface-container-high)',
                color: 'var(--color-on-surface-variant)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-primary)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-surface-container-high)';
                e.currentTarget.style.color = 'var(--color-on-surface-variant)';
                e.currentTarget.style.borderColor = 'var(--color-outline-variant)';
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 최근 검색 기록 / 추천 기업 */}
      <div className="max-w-4xl mx-auto w-full mt-20 px-4 pb-16">
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-5 flex items-center gap-2"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {hasHistory ? 'history' : 'star'}
          </span>
          {hasHistory ? '최근 검색 기업' : '추천 기업'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(hasHistory ? recentSearches : FALLBACK_COMPANIES).map((item) => {
            const accentColor = nameToColor(item.name);
            return (
              <button
                key={item.name}
                onClick={() => handleQuickSearch(item.name)}
                style={{
                  background: 'var(--color-surface-container-lowest)',
                  borderRadius: '1rem',
                  border: '1px solid var(--color-outline-variant)',
                  padding: '1.25rem 1.5rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  boxShadow: '0 2px 8px rgba(11,28,48,0.04)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,74,198,0.12)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(11,28,48,0.04)';
                  e.currentTarget.style.borderColor = 'var(--color-outline-variant)';
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {/* 기업명 이니셜 아바타 */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: accentColor + '18',
                      border: `1px solid ${accentColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: accentColor }}>
                        {item.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-bold" style={{ color: 'var(--color-on-surface)' }}>{item.name}</h4>
                      {item.date && (
                        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-outline)' }}>
                          {timeAgo(item.date)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', color: 'var(--color-outline-variant)', fontVariationSettings: "'FILL' 0" }}
                  >
                    {hasHistory ? 'history' : 'arrow_forward'}
                  </span>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px', borderRadius: '9999px',
                  background: accentColor + '14',
                  fontSize: '0.7rem', fontWeight: 700, color: accentColor,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>
                    analytics
                  </span>
                  {hasHistory ? 'AI 분석 완료' : '분석 가능'}
                </div>
              </button>
            );
          })}

          {/* 비교 기능 프로모 카드 */}
          <button
            onClick={() => setTab('compare')}
            style={{
              background: 'linear-gradient(135deg, rgba(0,74,198,0.08) 0%, rgba(37,99,235,0.04) 100%)',
              borderRadius: '1rem',
              border: '1px solid rgba(0,74,198,0.15)',
              padding: '1.25rem 1.5rem',
              textAlign: 'left',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,74,198,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>AI 신규 기능</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
              기업 1:1 비교 분석 모드가 새로 추가되었습니다.
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-on-surface-variant)' }}>두 기업을 비교해보세요 →</p>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                right: '-12px',
                bottom: '-12px',
                fontSize: '72px',
                color: 'var(--color-primary)',
                opacity: 0.06,
                fontVariationSettings: "'FILL' 1",
              }}
            >
              analytics
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

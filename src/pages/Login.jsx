import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ setTab }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('이메일과 비밀번호를 모두 입력하세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      setTab('search');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in duration-500"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-surface-container-lowest)',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          boxShadow: '0 8px 32px rgba(11,28,48,0.08)',
          border: '1px solid var(--color-outline-variant)',
        }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'rgba(0,74,198,0.1)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}>
              lock
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
            로그인
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            Editorial Intelligence에 오신 것을 환영합니다
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            background: '#fff1f2', borderLeft: '4px solid #f43f5e',
            padding: '0.75rem 1rem', borderRadius: '0.5rem',
            marginBottom: '1.5rem', fontSize: '0.875rem', color: '#be123c',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 이메일 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>
              이메일
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.75rem 1rem',
                background: 'var(--color-surface-container-low)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: '0.75rem',
                fontSize: '0.9375rem',
                color: 'var(--color-on-surface)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-outline-variant)'; }}
            />
          </div>

          {/* 비밀번호 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.375rem' }}>
              비밀번호
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.75rem 1rem',
                background: 'var(--color-surface-container-low)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: '0.75rem',
                fontSize: '0.9375rem',
                color: 'var(--color-on-surface)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-outline-variant)'; }}
            />
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: loading ? '#94a3b8' : 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(0,74,198,0.3)',
              transition: 'background-color 0.2s, box-shadow 0.2s',
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>refresh</span>
                로그인 중...
              </>
            ) : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-outline-variant)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', whiteSpace: 'nowrap' }}>계정이 없으신가요?</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-outline-variant)' }} />
        </div>

        {/* 회원가입 링크 */}
        <button
          onClick={() => setTab('signup')}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: 'transparent',
            border: '1.5px solid var(--color-primary)',
            borderRadius: '0.75rem',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,74,198,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          회원가입
        </button>

        {/* 홈으로 돌아가기 */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={() => setTab('search')}
            style={{
              background: 'none', border: 'none',
              fontSize: '0.8125rem', color: 'var(--color-outline)',
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            ← 홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

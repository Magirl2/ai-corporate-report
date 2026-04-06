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
    try {
      await login(email, password);
      setTab('search'); // Go to Dashboard on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-md bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-4xl text-primary mb-2">lock</span>
          <h2 className="text-2xl font-bold font-headline text-on-surface">로그인</h2>
          <p className="text-on-surface-variant text-sm mt-2">Editorial Intelligence에 오신 것을 환영합니다</p>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 p-3 mb-6 rounded text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">이메일</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-lg border-none bg-surface-container-low focus:ring-2 focus:ring-primary transition-all text-sm"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">비밀번호</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border-none bg-surface-container-low focus:ring-2 focus:ring-primary transition-all text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-lg font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          계정이 없으신가요? <button onClick={() => setTab('signup')} className="text-primary font-bold hover:underline">회원가입</button>
        </div>
      </div>
    </div>
  );
}

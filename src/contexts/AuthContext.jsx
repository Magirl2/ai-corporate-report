import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from Real Backend (/api/auth/me)
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Session verification failed", err);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSession();
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    if (!response.ok) {
      const errorObj = data.error || { message: '로그인에 실패했습니다.' };
      const error = new Error(typeof errorObj === 'string' ? errorObj : errorObj.message);
      if (typeof errorObj === 'object') {
        error.category = errorObj.category;
        error.code = errorObj.code;
      }
      throw error;
    }
    
    setCurrentUser(data.user);
    return data.user;
  };

  const signup = async (email, password, name) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorObj = data.error || { message: '회원가입에 실패했습니다.' };
      const error = new Error(typeof errorObj === 'string' ? errorObj : errorObj.message);
      if (typeof errorObj === 'object') {
        error.category = errorObj.category;
        error.code = errorObj.code;
      }
      throw error;
    }

    setCurrentUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error', err);
    }
    setCurrentUser(null);
  };

  const upgradePlan = async (planType) => {
    if (!currentUser) throw new Error('로그인이 필요합니다.');
    
    const response = await fetch('/api/user/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorObj = data.error || { message: '플랜 변경에 실패했습니다.' };
      const error = new Error(typeof errorObj === 'string' ? errorObj : errorObj.message);
      if (typeof errorObj === 'object') {
        error.category = errorObj.category;
        error.code = errorObj.code;
      }
      throw error;
    }
    
    setCurrentUser(data.user);
    return data.user;
  };

  /**
   * 서버 측 권한 검사를 수행하고 결과를 반환합니다.
   * action: 'search' | 'compare'
   */
  const trackUsage = async (action) => {
    if (!currentUser) throw new Error('로그인이 필요합니다.');

    const response = await fetch('/api/user/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    const data = await response.json();
    if (!response.ok) {
      const errorObj = data.error || { message: '권한 검증에 실패했습니다.' };
      const error = new Error(typeof errorObj === 'string' ? errorObj : errorObj.message);
      if (typeof errorObj === 'object') {
        error.category = errorObj.category;
        error.code = errorObj.code;
      }
      throw error;
    }

    // 서버가 변경된 사용량(usage) 정보를 내려주면 즉각 동기화
    setCurrentUser(data.user);
    return data.allowed;
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    upgradePlan,
    trackUsage
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

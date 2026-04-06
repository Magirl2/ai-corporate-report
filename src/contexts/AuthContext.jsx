import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from LocalStorage (Mock Backend)
  useEffect(() => {
    const storedUser = localStorage.getItem('ei_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Fake Server Delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // In a real app we'd query Supabase: const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const storedUsers = JSON.parse(localStorage.getItem('ei_users_db') || '[]');
    const user = storedUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('이메일 혹은 비밀번호가 일치하지 않습니다.');
    }
    
    // Update local state
    const userInfo = { id: user.id, email: user.email, plan: user.plan || 'free', usage: user.usage || 0 };
    setCurrentUser(userInfo);
    localStorage.setItem('ei_user', JSON.stringify(userInfo));
    return userInfo;
  };

  const signup = async (email, password, name) => {
    // Fake Server Delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const storedUsers = JSON.parse(localStorage.getItem('ei_users_db') || '[]');
    if (storedUsers.some(u => u.email === email)) {
      throw new Error('이미 가입된 이메일입니다.');
    }
    
    const newUser = { id: Date.now().toString(), email, password, name, plan: 'free', usage: 0 };
    storedUsers.push(newUser);
    localStorage.setItem('ei_users_db', JSON.stringify(storedUsers));
    
    const userInfo = { id: newUser.id, email: newUser.email, name: newUser.name, plan: 'free', usage: 0 };
    setCurrentUser(userInfo);
    localStorage.setItem('ei_user', JSON.stringify(userInfo));
    return userInfo;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ei_user');
  };

  const upgradePlan = async (planType) => {
    await new Promise(resolve => setTimeout(resolve, 1500)); // Fake Stripe processing
    if (!currentUser) throw new Error('로그인이 필요합니다.');
    
    const updatedUser = { ...currentUser, plan: planType };
    setCurrentUser(updatedUser);
    localStorage.setItem('ei_user', JSON.stringify(updatedUser));
    
    // Update the fake DB
    let storedUsers = JSON.parse(localStorage.getItem('ei_users_db') || '[]');
    storedUsers = storedUsers.map(u => u.email === currentUser.email ? { ...u, plan: planType } : u);
    localStorage.setItem('ei_users_db', JSON.stringify(storedUsers));
    
    return updatedUser;
  };

  const checkUsageLimit = () => {
    if (!currentUser) return false;
    if (currentUser.plan === 'premium') return true;
    if (currentUser.usage >= 3) return false; // Free users get 3 times
    return true;
  };

  const recordUsage = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, usage: (currentUser.usage || 0) + 1 };
    setCurrentUser(updatedUser);
    localStorage.setItem('ei_user', JSON.stringify(updatedUser));
    
    let storedUsers = JSON.parse(localStorage.getItem('ei_users_db') || '[]');
    storedUsers = storedUsers.map(u => u.email === currentUser.email ? { ...u, usage: updatedUser.usage } : u);
    localStorage.setItem('ei_users_db', JSON.stringify(storedUsers));
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
    logout,
    upgradePlan,
    checkUsageLimit,
    recordUsage
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

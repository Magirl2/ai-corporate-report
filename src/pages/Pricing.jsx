import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PaymentModal from '../components/PaymentModal';

export default function Pricing({ setTab }) {
  const { currentUser, upgradePlan } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successPlan, setSuccessPlan] = useState(null);
  const [countdown, setCountdown] = useState(3);

  // 성공 후 카운트다운 → 자동 홈 이동
  useEffect(() => {
    if (!successPlan) return;
    if (countdown <= 0) { setTab('search'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [successPlan, countdown, setTab]);

  const handleSubscribe = (plan) => {
    if (!currentUser) {
      setTab('login');
      return;
    }
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const onPaymentSuccess = async (plan) => {
    setIsProcessing(true);
    try {
      await upgradePlan(plan);
      setIsModalOpen(false);
      setSuccessPlan(plan);
      setCountdown(3);
    } catch (err) {
      // 실패 시 모달 닫고 에러는 조용히 처리 (향후 toast 연동 가능)
      setIsModalOpen(false);
      console.error('결제 처리 오류:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 결제 성공 화면
  if (successPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500">
        <div style={{
          maxWidth: '480px', width: '100%',
          background: 'var(--color-surface-container-lowest)',
          borderRadius: '1.5rem', padding: '3rem 2.5rem',
          boxShadow: '0 8px 40px rgba(11,28,48,0.10)',
          border: '1px solid var(--color-outline-variant)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>
            업그레이드 완료!
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '2rem', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-primary)' }}>Premium</strong> 플랜이 활성화되었습니다.<br />
            이제 무제한으로 AI 분석을 이용할 수 있습니다.
          </p>
          <div style={{
            padding: '1rem', background: '#f0fdf4',
            borderRadius: '0.75rem', border: '1px solid #86efac',
            marginBottom: '1.5rem', fontSize: '0.875rem', color: '#166534',
          }}>
            {countdown}초 후 홈으로 이동합니다...
          </div>
          <button
            onClick={() => setTab('search')}
            style={{
              width: '100%', padding: '0.875rem',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: '0.75rem',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,74,198,0.3)',
            }}
          >
            지금 바로 분석하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-12 px-4 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8">
      <div className="text-center mb-16">
        <span className="text-primary font-headline font-bold text-sm tracking-widest uppercase mb-4 block">Pricing Plans</span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface font-headline tracking-tight mb-4">투자 인사이트를 한 단계 높이세요</h1>
        <p className="text-xl text-on-surface-variant max-w-2xl mx-auto">
          AI 애널리스트가 작성하는 심층 기업 리포트를 무제한으로 열람하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
        {/* Free Plan */}
        <div className={`p-8 rounded-3xl flex flex-col justify-between transition-all duration-300 ${
          currentUser?.plan === 'free' || !currentUser
            ? 'bg-white border-2 border-slate-200 shadow-md ring-4 ring-slate-50' 
            : 'bg-slate-50/50 border border-slate-100 opacity-80'
        }`}>
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold font-headline text-slate-800">Free</h3>
              {(currentUser?.plan === 'free' || !currentUser) && (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Current Plan</span>
              )}
            </div>
            <p className="text-slate-500 text-sm mb-6">기본적인 분석을 경험해보세요.</p>
            <div className="mb-8">
              <span className="text-4xl font-black text-slate-900">₩0</span>
              <span className="text-slate-500 font-medium ml-1"> / 평생 무료</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                <span className="text-sm">하루 최대 3회 기업 분석 무료</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <span className="material-symbols-outlined text-emerald-500 text-[20px]">check_circle</span>
                <span className="text-sm">기본 DART 및 글로벌 재무 데이터 연동</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <span className="material-symbols-outlined text-[20px]">do_not_disturb_on</span>
                <span className="text-sm">기업 1:1 비교 분석 (제한됨)</span>
              </li>
            </ul>
          </div>
          
          <button 
            disabled={currentUser?.plan === 'free' || !currentUser}
            onClick={() => setTab('search')}
            className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
              currentUser?.plan === 'free' || !currentUser
                ? 'bg-slate-100 text-slate-400 cursor-default'
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
            }`}
          >
            {(currentUser?.plan === 'free' || !currentUser) ? '현재 이용 중인 플랜' : '무료 플랜으로 시작하기'}
          </button>
        </div>

        {/* Premium Plan (Highlighted) */}
        <div className={`p-8 rounded-3xl relative flex flex-col justify-between transition-all duration-500 transform ${
          currentUser?.plan === 'premium'
            ? 'bg-white border-2 border-primary shadow-xl ring-8 ring-primary/5 -translate-y-2'
            : 'bg-gradient-to-b from-primary/5 to-white border border-primary/20 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-1'
        }`}>
          {currentUser?.plan === 'premium' ? (
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span> Active
            </div>
          ) : (
            <div className="absolute top-0 right-8 -translate-y-1/2 bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
              Most Popular
            </div>
          )}
          
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold font-headline text-primary">Premium</h3>
              {currentUser?.plan === 'premium' && (
                <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Current Plan</span>
              )}
            </div>
            <p className="text-slate-600 text-sm mb-6">모든 한계를 부수고 무제한으로 분석하세요.</p>
            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">₩19,000</span>
              <span className="text-slate-500 font-medium ml-1"> / 월</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-800 font-medium">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="text-sm">무제한 AI 심층 기업 분석</span>
              </li>
              <li className="flex items-center gap-3 text-slate-800 font-medium">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="text-sm">무제한 기업 1:1 비교 분석 모드</span>
              </li>
              <li className="flex items-center gap-3 text-slate-800 font-medium">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span className="text-sm">포트폴리오 백테스팅 기능 (출시 예정)</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={() => handleSubscribe('premium')}
            disabled={currentUser?.plan === 'premium'}
            className={`w-full py-4 rounded-xl font-bold text-md transition-all ${
              currentUser?.plan === 'premium'
                ? 'bg-primary/10 text-primary cursor-default'
                : 'bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {currentUser?.plan === 'premium' ? '현재 구독 중인 플랜' : 'Premium으로 업그레이드'}
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 z-[60] bg-white/80 backdrop-blur flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-6xl text-primary animate-spin mb-4">sync</span>
          <p className="text-lg font-bold">결제 정보를 파싱하고 승인을 대기중입니다...</p>
        </div>
      )}

      <PaymentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        selectedPlan={selectedPlan}
        onPaymentSuccess={onPaymentSuccess} 
      />
    </div>
  );
}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Free Plan */}
        <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold font-headline mb-2 text-slate-800">Free</h3>
            <p className="text-slate-500 text-sm mb-6">기본적인 분석을 경험해보세요.</p>
            <div className="mb-8">
              <span className="text-4xl font-black text-slate-900">₩0</span>
              <span className="text-slate-500 font-medium"> / 평생 무료</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-600">
                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                <span>하루 최대 3회 기업 분석 무료</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                <span>기본 DART 및 글로벌 재무 데이터 연동</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <span className="material-symbols-outlined">do_not_disturb_on</span>
                <span>기업 1:1 비교 분석 (제한됨)</span>
              </li>
            </ul>
          </div>
          
          <button 
            disabled
            className="w-full py-4 text-slate-500 bg-slate-100 rounded-xl font-bold text-sm"
          >
            기본 플랜 유지중
          </button>
        </div>

        {/* Premium Plan (Highlighted) */}
        <div className="bg-gradient-to-b from-primary/10 to-primary/5 p-8 rounded-3xl border-2 border-primary relative flex flex-col justify-between shadow-2xl shadow-primary/20 transform md:-translate-y-4">
          <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
            Most Popular
          </div>
          
          <div>
            <h3 className="text-2xl font-bold font-headline mb-2 text-primary">Premium</h3>
            <p className="text-slate-600 text-sm mb-6">모든 한계를 부수고 무제한으로 분석하세요.</p>
            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">₩19,000</span>
              <span className="text-slate-500 font-medium"> / 월</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-800 font-medium">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span>무제한 AI 심층 기업 분석</span>
              </li>
              <li className="flex items-center gap-3 text-slate-800 font-medium">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span>무제한 기업 1:1 비교 분석 모드</span>
              </li>
              <li className="flex items-center gap-3 text-slate-800 font-medium">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                <span>포트폴리오 백테스팅 기능 (출시 예정)</span>
              </li>
            </ul>
          </div>
          
          <button 
            onClick={() => handleSubscribe('premium')}
            disabled={currentUser?.plan === 'premium'}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold text-md shadow-lg shadow-primary/30 hover:bg-primary-container disabled:bg-slate-300 disabled:shadow-none transition-all"
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

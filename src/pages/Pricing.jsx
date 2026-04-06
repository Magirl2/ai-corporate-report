import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PaymentModal from '../components/PaymentModal';

export default function Pricing({ setTab }) {
  const { currentUser, upgradePlan } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [isProcessing, setIsProcessing] = useState(false);

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
      setTab('search'); // Go back to dashboard on success
      alert('성공적으로 프리미엄 플랜으로 업그레이드 되었습니다!');
    } catch (err) {
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

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

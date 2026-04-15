import React, { useEffect, useState } from 'react';

export default function LoadingScreen({ message }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Animate through different loading steps for visual feedback
    const timer1 = setTimeout(() => setStep(1), 5000);
    const timer2 = setTimeout(() => setStep(2), 15000);
    const timer3 = setTimeout(() => setStep(3), 25000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-mesh px-6 z-40 min-h-screen">
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 pointer-events-none">
        <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl"></div>
          <svg className="opacity-20 hidden md:block" fill="none" height="400" viewBox="0 0 600 400" width="600" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 350L150 250L250 300L400 100L550 150" stroke="url(#paint0_linear)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            <circle cx="50" cy="350" fill="#004ac6" r="4"></circle>
            <circle cx="150" cy="250" fill="#004ac6" r="4"></circle>
            <circle cx="250" cy="300" fill="#004ac6" r="4"></circle>
            <circle cx="400" cy="100" fill="#004ac6" r="4"></circle>
            <circle cx="550" cy="150" fill="#004ac6" r="4"></circle>
            <defs>
              <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear" x1="50" x2="550" y1="350" y2="150">
                <stop stopColor="#004ac6"></stop>
                <stop offset="1" stopColor="#2563eb"></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        <div className="mb-12 relative flex justify-center">
          <div className="w-24 h-24 bg-surface-container-lowest rounded-xl shadow-xl flex items-center justify-center relative overflow-hidden">
            <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <div className="absolute inset-0 shimmer opacity-30"></div>
          </div>
          <div className="absolute -top-2 -right-2 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-20"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-primary/10 flex items-center justify-center">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
            </span>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface mb-4 tracking-tight font-headline">Editorial Intelligence</h1>
        <p className="text-on-surface-variant font-medium text-lg mb-12">데이터를 정교하게 엮어 인사이트를 도출하고 있습니다.</p>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 text-primary font-semibold">
              <span className="material-symbols-outlined text-xl animate-spin">sync</span>
              <span>{message || 'AI가 실시간 데이터를 수집하고 있습니다...'}</span>
            </div>
            <p className="text-sm text-outline">보고서 생성 중 (약 30초 소요)...</p>
          </div>

          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary-container animate-loading-bar rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-8 text-left max-w-sm mx-auto">
            <div className={`flex items-center gap-3 transition-opacity duration-500 ${step >= 1 ? 'opacity-100' : 'opacity-40'}`}>
              <span className={`material-symbols-outlined ${step >= 1 ? 'text-emerald-500' : 'text-outline'}`} style={{ fontVariationSettings: step >= 1 ? "'FILL' 1" : "'FILL' 0" }}>
                {step >= 1 ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={`text-sm font-medium ${step >= 1 ? 'text-on-surface' : 'text-outline'}`}>재무제표 · 공시 · 뉴스 데이터 수집 완료</span>
            </div>
            <div className={`flex items-center gap-3 transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-40'}`}>
              <span className={`material-symbols-outlined ${step >= 2 ? 'text-emerald-500' : 'text-outline'}`} style={{ fontVariationSettings: step >= 2 ? "'FILL' 1" : "'FILL' 0" }}>
                {step >= 2 ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={`text-sm font-medium ${step >= 2 ? 'text-on-surface' : 'text-outline'}`}>4개 분야 AI 전문 분석 완료</span>
            </div>
            <div className={`flex items-center gap-3 transition-opacity duration-500 ${step >= 3 ? 'opacity-100' : (step === 2 ? 'opacity-100' : 'opacity-40')}`}>
              <span className={`material-symbols-outlined ${step >= 3 ? 'text-emerald-500' : (step === 2 ? 'text-primary animate-pulse' : 'text-outline')}`} style={{ fontVariationSettings: step >= 3 ? "'FILL' 1" : "'FILL' 0" }}>
                {step >= 3 ? 'check_circle' : (step === 2 ? 'radio_button_checked' : 'radio_button_unchecked')}
              </span>
              <span className={`text-sm font-medium ${step >= 3 ? 'text-on-surface' : (step === 2 ? 'text-primary' : 'text-outline')}`}>보고서 합성 · 팩트체크 · 품질 평가 중</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

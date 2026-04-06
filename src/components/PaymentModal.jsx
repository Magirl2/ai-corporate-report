import React from 'react';

export default function PaymentModal({ isOpen, onClose, selectedPlan, onPaymentSuccess }) {
  if (!isOpen) return null;

  const handleFakePayment = () => {
    // Fake the payment processing
    onPaymentSuccess(selectedPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold font-headline flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">credit_card</span>
            결제 진행
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
            <div>
              <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">선택한 플랜</p>
              <p className="text-lg font-bold text-slate-800">{selectedPlan === 'premium' ? 'Premium Plan' : 'Enterprise Plan'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary">{selectedPlan === 'premium' ? '₩19,000' : '₩99,000'}</p>
              <p className="text-xs text-slate-500">/ 월</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">카드 번호</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300">credit_card</span>
                <input type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">유효기간</label>
                <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">CVC</label>
                <input type="text" placeholder="123" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleFakePayment}
            className="w-full mt-8 py-4 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
          >
            <span className="material-symbols-outlined">lock</span>
            안전하게 결제하기
          </button>
          <p className="text-center text-xs text-slate-400 mt-4">실제 결제가 이루어지지 않는 가상 테스트 환경입니다.</p>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function PaymentModal({ isOpen, onClose, selectedPlan, onPaymentSuccess }) {
  if (!isOpen) return null;

  const handleFakePayment = () => {
    // Fake the payment processing
    onPaymentSuccess(selectedPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 mx-4">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">credit_card</span>
              결제 진행
            </h3>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200">
              <span className="material-symbols-outlined text-[12px]">biotech</span> TEST MODE
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-200">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-8 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">선택한 플랜</p>
              <p className="text-md font-bold text-slate-800">{selectedPlan === 'premium' ? 'Premium Plan' : 'Enterprise Plan'}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-primary">{selectedPlan === 'premium' ? '₩19,000' : '₩99,000'}</p>
              <p className="text-[10px] text-slate-500 font-medium">/ 1개월 이용</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">카드 번호</label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 group-focus-within:text-primary transition-colors">credit_card</span>
                <input type="text" placeholder="0000 0000 0000 0000" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">유효기간</label>
                <input type="text" placeholder="MM / YY" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all text-center" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CVC</label>
                <input type="text" placeholder="123" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all text-center" />
              </div>
            </div>
          </div>

          <button 
            onClick={handleFakePayment}
            className="w-full mt-10 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20"
          >
            <span className="material-symbols-outlined text-[20px]">lock</span>
            안전하게 결제하기
          </button>
          <div className="mt-6 flex flex-col items-center gap-1 opacity-60">
            <p className="text-[10px] text-slate-500 font-medium">본 페이지는 실제 결제가 이루어지지 않는</p>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">info</span>
              가상 테스트를 위한 시뮬레이션 환경입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

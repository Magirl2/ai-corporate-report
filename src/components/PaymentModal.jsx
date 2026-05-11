import React, { useState } from 'react';

const TEST_CARD = '4242 4242 4242 4242';

export default function PaymentModal({ isOpen, onClose, selectedPlan, onPaymentSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const normalizedCard = cardNumber.replace(/\s+/g, ' ').trim();
  const isCardValid = normalizedCard === TEST_CARD;
  const isExpiryValid = /^\d{2}\s*\/\s*\d{2}$/.test(expiry.trim());
  const isCvcValid = /^\d{3,4}$/.test(cvc.trim());
  const canSubmit = isCardValid && isExpiryValid && isCvcValid && !submitting;

  const planLabel = selectedPlan === 'premium' ? 'Premium Plan' : 'Enterprise Plan';
  const planPrice = selectedPlan === 'premium' ? '₩19,000' : '₩99,000';

  const handleFakePayment = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    onPaymentSuccess(selectedPlan);
  };

  const formatCard = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
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
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6">
          {/* 테스트 안내 배너 */}
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <span className="material-symbols-outlined text-amber-500 shrink-0 text-[16px] mt-0.5">info</span>
            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
              테스트 카드 번호 <span className="font-black font-mono">{TEST_CARD}</span>를 입력하면 결제가 진행됩니다. 실제 결제는 이루어지지 않습니다.
            </p>
          </div>

          <div className="flex justify-between items-center mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <div>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">선택한 플랜</p>
              <p className="text-base font-bold text-slate-800">{planLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-primary">{planPrice}</p>
              <p className="text-[10px] text-slate-500 font-medium">/ 1개월 이용</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">카드 번호</label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 group-focus-within:text-primary transition-colors">credit_card</span>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCard(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  disabled={submitting}
                  maxLength={19}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all disabled:opacity-50 font-mono ${
                    cardNumber && !isCardValid ? 'border-red-300 focus:border-red-400' : isCardValid ? 'border-emerald-300 focus:border-emerald-400' : 'border-slate-200 focus:border-primary'
                  }`}
                />
                {isCardValid && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                )}
              </div>
              {cardNumber && !isCardValid && (
                <p className="text-[10px] text-red-500 mt-1 ml-1">테스트 카드 번호를 입력하세요: {TEST_CARD}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">유효기간</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM / YY"
                  disabled={submitting}
                  maxLength={7}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all text-center disabled:opacity-50 ${
                    expiry && !isExpiryValid ? 'border-red-300' : isExpiryValid ? 'border-emerald-300' : 'border-slate-200 focus:border-primary'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">CVC</label>
                <input
                  type="text"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  disabled={submitting}
                  maxLength={4}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none transition-all text-center disabled:opacity-50 ${
                    cvc && !isCvcValid ? 'border-red-300' : isCvcValid ? 'border-emerald-300' : 'border-slate-200 focus:border-primary'
                  }`}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFakePayment}
            disabled={!canSubmit}
            className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                처리 중...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">lock</span>
                안전하게 결제하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export default function Terms({ setTab }) {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-12 animate-in fade-in slide-in-from-bottom-4">
      {/* 1. Header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-on-surface tracking-tight">이용약관</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          본 서비스의 이용 조건, AI 분석 결과의 한계, 사용자의 권리와 책임, 그리고 면책 조항을 안내합니다.
        </p>
      </div>

      <div className="space-y-12">
        
        {/* 4. 투자 및 전문 자문 관련 고지 (최우선 강조) */}
        <section>
          <div className="bg-rose-50 border border-rose-200 p-6 md:p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-rose-800 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              투자 및 전문 자문 관련 고지
            </h2>
            <ul className="space-y-3 text-rose-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>본 서비스는 <strong>투자 권유 서비스가 아닙니다.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>본 서비스의 보고서는 <strong>매수, 매도, 보유 추천이 아닙니다.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>본 서비스는 <strong>법률, 세무, 회계, 투자 자문을 제공하지 않습니다.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>사용자는 투자 또는 사업 의사결정 전에 반드시 <strong>공식 공시, 원문 뉴스, 전문가 자문</strong>을 확인해야 합니다.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 2. 서비스의 목적 & 3. AI 분석 결과의 한계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              서비스의 목적
            </h2>
            <ul className="space-y-3 text-slate-600 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>본 서비스는 AI 기반 기업 정보 분석 및 보고서 제공 서비스입니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>사용자가 입력한 기업명 또는 분석 요청을 기반으로 공시, 재무 데이터, 뉴스, AI 검색 결과 등을 종합해 보고서를 제공합니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>본 서비스는 오직 <strong>정보 제공</strong>을 목적으로 합니다.</span></li>
            </ul>
          </section>

          <section className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
            <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700">psychology_alt</span>
              AI 분석 결과의 한계
            </h2>
            <ul className="space-y-3 text-amber-800 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>AI 분석 결과에는 오류, 지연, 누락, 해석상 한계가 있을 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>최신 공시, 뉴스, 시장 정보가 즉시 반영되지 않을 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>외부 API, 검색 결과, 캐시 상태에 따라 보고서 내용이 달라질 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>AI가 생성한 요약은 <strong>원문 자료를 대체하지 않습니다.</strong></span></li>
            </ul>
          </section>
        </div>

        {/* 5. 회원 계정 정책 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            회원 계정 정책
          </h2>
          <ul className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>사용자는 서비스 이용 시 정확한 정보를 제공해야 합니다.</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>계정 공유, 명의 도용, 부정 사용을 해서는 안 됩니다.</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>서비스 운영자는 부정 사용이 의심되는 경우 서비스 이용을 제한할 수 있습니다.</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>로그인 정보와 계정 보안에 대한 모든 책임은 사용자 본인에게 있습니다.</p>
            </li>
          </ul>
        </section>

        {/* 6. 금지 행위 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">block</span>
            금지 행위
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: 'spider', text: '무단 크롤링 및 데이터 수집' },
              { icon: 'smart_toy', text: '자동화 도구를 통한 과도한 요청' },
              { icon: 'speed', text: 'API 과다 호출 또는 서비스 부하 유발' },
              { icon: 'shopping_cart_checkout', text: '보고서의 무단 재판매 및 상업적 이용' },
              { icon: 'gpp_bad', text: '서비스 방해 및 비정상적 접근 행위' },
              { icon: 'person_cancel', text: '허위 정보 입력 및 타인 명의 도용' },
              { icon: 'no_accounts', text: '타인의 계정 또는 정보를 무단으로 사용하는 행위' },
              { icon: 'bug_report', text: '보안 취약점을 악용하는 행위' }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-rose-500">{item.icon}</span>
                <span className="text-slate-800 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 7. 요금제 및 사용량 제한 & 8. 서비스 변경 및 중단 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">payments</span>
              요금제 및 사용량 제한
            </h2>
            <ul className="space-y-3 text-slate-600 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>무료 및 유료 플랜에 따라 일일 분석 횟수 및 사용량 제한이 적용될 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>비교 분석 기능, 고급 보고서 기능 등의 제공 범위는 플랜에 따라 달라질 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>사용량 정책 및 요금제는 서비스 운영 상황에 따라 변경될 수 있습니다.</span></li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">settings_ethernet</span>
              서비스 변경 및 중단
            </h2>
            <ul className="space-y-3 text-slate-600 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>서비스 기능, 데이터 출처, AI 모델, 요금제 정책은 향상되거나 변경될 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>외부 API 장애, 서버 점검, 보안 이슈 등으로 서비스가 일시 중단될 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>서비스 운영자는 안정적인 제공을 위해 필요한 조치를 취할 수 있습니다.</span></li>
            </ul>
          </section>
        </div>

        {/* 9. 데이터 및 출처 관련 고지 */}
        <section>
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">dataset</span>
              데이터 및 출처 관련 고지
            </h2>
            <p className="text-slate-600 mb-3 text-sm leading-relaxed">
              보고서 생성에는 DART(전자공시시스템), FMP, Google Gemini API, 검색 기반 grounding 결과 등 외부 데이터가 사용될 수 있습니다.
            </p>
            <p className="text-slate-600 mb-3 text-sm leading-relaxed">
              외부 데이터의 정확성, 완전성, 최신성은 각 제공처의 상태와 수집 시점에 따라 달라질 수 있으므로, 사용자는 중요한 판단 전에 반드시 <strong>원문 출처를 직접 확인</strong>해야 합니다.
            </p>
          </div>
        </section>

        {/* 10. 면책 조항 */}
        <section>
          <div className="bg-rose-50 border border-rose-200 p-6 md:p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-rose-800 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined">gavel</span>
              면책 조항
            </h2>
            <ul className="space-y-3 text-rose-700 text-sm font-medium">
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>본 서비스는 정보 제공 목적으로만 제공됩니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>AI 보고서 결과를 근거로 한 <strong>투자, 사업, 법률, 세무, 회계 판단에 대한 최종 책임은 사용자 본인</strong>에게 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>서비스 운영자는 고의 또는 중대한 과실이 없는 한, 외부 데이터 오류, AI 분석 오류, 서비스 중단, 사용자의 판단 결과로 인한 손해에 대해 책임을 부담하지 않습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>단, 관련 법령상 책임을 제한할 수 없는 경우에는 해당 법령이 정하는 바를 따릅니다.</span></li>
            </ul>
          </div>
        </section>

        {/* 11. 이용 제한 및 해지 */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-3">이용 제한 및 해지</h2>
          <p className="text-slate-600 text-sm mb-2">
            본 약관 위반, 부정 사용, 서비스 방해 행위가 확인되는 경우 이용이 제한될 수 있습니다.
          </p>
          <p className="text-slate-600 text-sm">
            사용자는 언제든지 서비스 이용을 중단하거나 계정 삭제(회원 탈퇴)를 요청할 수 있습니다.
          </p>
        </section>

        {/* 12. 시행일 */}
        <section className="text-center py-8 border-t border-slate-200 mt-12">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 inline-block px-3 py-1 rounded-full">
            시행일: 2026년 5월 4일
          </p>
        </section>

        {/* 13. 메인으로 돌아가기 버튼 */}
        <div className="flex justify-center pb-12">
          <button
            onClick={() => setTab?.('search')}
            className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

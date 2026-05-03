import React from 'react';

export default function DataNotice({ setTab }) {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-12 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-on-surface tracking-tight">데이터 출처 및 고지사항</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          본 서비스가 어떤 데이터를 기반으로 AI 기업 보고서를 생성하는지, 그리고 분석 결과의 한계와 유의사항을 안내합니다.
        </p>
      </div>

      <div className="space-y-12">
        {/* 6. 투자 판단 유의사항 (최우선 강조) */}
        <section>
          <div className="bg-rose-50 border border-rose-200 p-6 md:p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-rose-800 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              투자 판단 유의사항
            </h2>
            <ul className="space-y-3 text-rose-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>본 서비스는 <strong>투자 권유 서비스가 아닙니다.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>본 서비스가 제공하는 모든 보고서는 <strong>매수, 매도, 보유 추천이 아닙니다.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>본 서비스는 어떠한 형태의 <strong>법률, 세무, 회계, 투자 자문도 제공하지 않습니다.</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-rose-500">•</span>
                <span>사용자는 투자 또는 사업 의사결정 전에 반드시 <strong>공식 공시, 원문 뉴스, 전문가의 자문</strong>을 확인해야 합니다.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 2. 사용 데이터 개요 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">database</span>
            사용 데이터 개요
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: 'corporate_fare', title: '기업 공시 데이터' },
              { icon: 'account_balance', title: '재무 데이터' },
              { icon: 'newspaper', title: '뉴스 및 시장 동향' },
              { icon: 'auto_awesome', title: 'AI 검색 및 요약 결과' },
              { icon: 'person_search', title: '사용자가 입력한 분석 요청 정보' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">{item.icon}</span>
                <span className="font-semibold text-slate-700">{item.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. 주요 데이터 출처 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">link</span>
            주요 데이터 출처
          </h2>
          <div className="space-y-4">
            {[
              { 
                name: 'DART 전자공시시스템', 
                desc: '한국 기업의 공식 재무제표 및 사업보고서 원천 데이터로 사용됩니다. 최신 공시 반영까지 지연이 발생할 수 있습니다.' 
              },
              { 
                name: 'FMP 등 외부 재무 데이터 API', 
                desc: '주로 해외 기업의 재무 상태 및 시장 지표를 파악하는 보조 데이터로 활용됩니다.' 
              },
              { 
                name: 'Google Gemini API (검색 기반)', 
                desc: '최신 뉴스와 시장 동향 검색에 사용됩니다. 원문 접근 가능 여부에 따라 요약 품질이 달라질 수 있습니다.' 
              },
              { 
                name: '기업 공식 홈페이지 및 IR 자료', 
                desc: '기업 비전과 비즈니스 모델 분석 시 참고되는 공식 자료입니다.' 
              }
            ].map((source, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-2">{source.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{source.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. AI 분석 방식 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">psychology</span>
            AI 분석 방식
          </h2>
          <ul className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>AI가 여러 수집된 자료를 종합, 분류, 분석하여 단일 보고서 형태로 생성합니다.</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>AI 분석 결과는 사실을 요약한 것일 뿐, 원문 자료를 절대 대체하지 않습니다.</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>AI가 생성한 문장이나 추론에는 <strong>오류, 누락, 해석상 한계</strong>가 포함될 수 있습니다.</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>중요한 판단 전에는 제공된 출처 링크를 통해 반드시 <strong>공식 공시와 원문을 직접 확인</strong>해야 합니다.</p>
            </li>
          </ul>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 5. 캐시 및 최신성 안내 */}
          <section className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
            <h2 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">update</span>
              캐시 및 최신성 안내
            </h2>
            <ul className="space-y-3 text-amber-800 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>생성된 보고서는 서비스 성능 개선을 위해 일정 시간 캐시될 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>보고서 캐시는 최대 24시간 이전 데이터일 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>중간 분석 데이터는 제한된 시간 동안 저장될 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>최신 공시, 뉴스, 주가 정보와 차이가 있을 수 있습니다.</span></li>
            </ul>
          </section>

          {/* 7. 데이터 한계 */}
          <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">report</span>
              데이터 한계
            </h2>
            <ul className="space-y-3 text-slate-600 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>외부 API 응답 지연 또는 장애가 있을 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>일부 기업은 데이터가 부족하거나 최신 공시가 없을 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>해외 기업과 국내 기업은 사용 가능한 데이터 출처가 다를 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>검색 기반 출처는 원문 접근 가능 여부에 따라 품질이 달라질 수 있습니다.</span></li>
            </ul>
          </section>
        </div>

        {/* 8. 문의 및 정정 요청 안내 */}
        <section className="text-center py-8 border-t border-slate-200 mt-12">
          <h2 className="text-lg font-bold text-slate-800 mb-2">문의 및 정정 요청 안내</h2>
          <p className="text-slate-500 text-sm">
            보고서 내용이나 출처 표시가 부정확하다고 판단되는 경우 서비스 운영자에게 문의할 수 있습니다.
          </p>
        </section>

        {/* 9. 메인으로 돌아가기 버튼 */}
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

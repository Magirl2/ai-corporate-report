import React from 'react';

export default function PrivacyPolicy({ setTab }) {
  return (
    <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-12 animate-in fade-in slide-in-from-bottom-4">
      {/* 1. Header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-on-surface tracking-tight">개인정보처리방침</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          본 서비스가 어떠한 개인정보와 이용 정보를 처리하고 보호하는지 안내합니다.
        </p>
      </div>

      <div className="space-y-12">
        
        {/* 2. 수집하는 개인정보 항목 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            수집하는 개인정보 항목
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm bg-white">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-700">항목</th>
                  <th className="p-4 font-bold text-slate-700">수집 목적 및 처리 맥락</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">이름, 이메일</td>
                  <td className="p-4">회원가입, 로그인 및 사용자 식별</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">비밀번호 해시</td>
                  <td className="p-4">안전한 사용자 인증 (원문 저장 안 함)</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">로그인 세션 쿠키</td>
                  <td className="p-4">인증 상태 유지 및 접근 제어</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">요금제, 일일 사용량 정보</td>
                  <td className="p-4">계정 권한 관리 및 분석 한도 제한</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">분석 요청 기업명, 검색어</td>
                  <td className="p-4">AI 분석 및 보고서 생성 타겟 지정</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">생성된 보고서 캐시</td>
                  <td className="p-4">응답 속도 개선 및 중복 요청 최적화</td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-800">오류 및 접속 로그</td>
                  <td className="p-4">서비스 장애 분석 및 부정 이용 방지</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. 개인정보 처리 목적 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">target</span>
            개인정보 처리 목적
          </h2>
          <ul className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>회원가입, 로그인, 사용자 식별, 사용량 제한 등 기본 서비스 제공</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>AI 기업 보고서 생성 및 이전에 생성된 보고서 캐시 제공</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>서비스 장애 분석, 고객지원, 문의 대응 및 서비스 안정성 확보</p>
            </li>
            <li className="flex gap-3 text-slate-700">
              <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
              <p>서비스 보안 유지 및 부정 이용 방지</p>
            </li>
          </ul>
        </section>

        {/* 4. 보유 및 이용 기간 */}
        <section>
          <div className="bg-blue-50 border border-blue-200 p-6 md:p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
              보유 및 이용 기간
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">회원 정보</span>
                <span className="font-semibold text-slate-800">회원 탈퇴 시까지</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">세션 쿠키</span>
                <span className="font-semibold text-slate-800">최대 7일</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">보고서 캐시</span>
                <span className="font-semibold text-slate-800">최대 24시간</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                <span className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">중간 분석 데이터</span>
                <span className="font-semibold text-slate-800">최대 1시간</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-blue-800 font-medium">
              * 단, 관련 법령상 보관이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관합니다.
            </p>
          </div>
        </section>

        {/* 5. 외부 서비스 및 처리위탁 가능성 */}
        <section>
          <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">api</span>
            외부 서비스 연동 및 처리위탁
          </h2>
          <p className="text-slate-600 mb-4 leading-relaxed">
            본 서비스는 제3자에게 개인정보를 임의로 판매하지 않으며, 원활한 서비스 제공을 위해 아래와 같은 외부 시스템과 연동합니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">Vercel</span>
              <span className="text-sm text-slate-600">서비스 호스팅 및 백엔드 배포</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">Redis (Upstash 등)</span>
              <span className="text-sm text-slate-600">회원 정보, 사용량, 캐시 데이터 저장</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">Google Gemini API</span>
              <span className="text-sm text-slate-600">데이터 요약, AI 분석 및 보고서 생성</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">DART API / FMP 등</span>
              <span className="text-sm text-slate-600">국내외 기업 공시 및 재무 데이터 조회</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 6. 이용자의 권리 */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">manage_accounts</span>
              이용자의 권리
            </h2>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li className="flex items-center gap-2"><span className="text-slate-400">•</span> 개인정보 열람 및 정정 요청</li>
              <li className="flex items-center gap-2"><span className="text-slate-400">•</span> 개인정보 삭제 및 처리정지 요청</li>
              <li className="flex items-center gap-2"><span className="text-slate-400">•</span> 회원 탈퇴 요청</li>
              <li className="flex items-center gap-2"><span className="text-slate-400">•</span> 개인정보 제공 동의 철회 또는 문의</li>
            </ul>
          </section>

          {/* 7. 쿠키 및 세션 */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">cookie</span>
              쿠키 및 세션
            </h2>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>로그인 유지를 위해 세션 쿠키를 사용할 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>세션 쿠키는 사용자 인증 상태 확인에 주로 사용됩니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 text-slate-400">•</span><span>브라우저 설정으로 쿠키를 제한할 수 있으나, 이 경우 로그인 등 일부 기능이 제한될 수 있습니다.</span></li>
            </ul>
          </section>
        </div>

        {/* 8. 안전성 확보 조치 */}
        <section>
          <div className="bg-amber-50 border border-amber-200 p-6 md:p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined">security</span>
              안전성 확보 조치
            </h2>
            <ul className="space-y-3 text-amber-800 text-sm">
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>비밀번호는 원문이 아니라 안전하게 해시(Hash)된 형태로 저장됩니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>인증 세션은 httpOnly, secure, sameSite 등의 보안 속성을 적용할 수 있습니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>운영 환경에서는 환경변수를 통해 시크릿 키 및 API 키를 보호합니다.</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">•</span><span>데이터 보호를 위해 접근 권한 관리와 정기적인 오류 로그 점검을 수행합니다.</span></li>
            </ul>
          </div>
        </section>

        {/* 9. 개인정보 보호 문의 & 10. 시행일 */}
        <section className="text-center py-8 border-t border-slate-200 mt-12">
          <h2 className="text-lg font-bold text-slate-800 mb-2">개인정보 보호 문의</h2>
          <p className="text-slate-600 text-sm mb-4">
            개인정보 처리와 관련된 문의, 불만 처리, 피해 구제 등에 관한 사항은 서비스 운영자에게 문의해 주시기 바랍니다.
          </p>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 inline-block px-3 py-1 rounded-full">
            시행일: 2026년 5월 3일
          </p>
        </section>

        {/* 11. 메인으로 돌아가기 버튼 */}
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

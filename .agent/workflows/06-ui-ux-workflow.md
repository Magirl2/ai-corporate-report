# UI/UX 개선 워크플로우

## 목적
사용자가 보고서와 출처, 법적 고지, 오류 상태를 쉽게 이해할 수 있게 개선한다.

## 참여 순서
1. product-designer
2. developer-frontend
3. product-manager QA

## 주요 대상
- SearchDashboard
- SingleReportView
- Footer
- Login
- Signup
- DataNotice
- PrivacyPolicy
- Terms

## 처리 순서
1. 현재 화면 구조 분석
2. 사용자 혼란 지점 정의
3. 데스크톱/모바일 상태 설계
4. 컴포넌트 구조 결정
5. Tailwind로 구현
6. 접근성 확인
7. 오류/빈 상태/로딩 상태 확인
8. build 검증

## 중요한 UI 상태
- 로딩
- 성공
- 부분 성공
- 실패
- 데이터 없음
- 출처 없음
- DART 미사용
- 로그인 필요
- 세션 만료

## 접근성 규칙
- button에는 type="button" 사용
- 외부 링크에는 rel="noopener noreferrer"
- 색상만으로 상태를 전달하지 않음
- aria-label 또는 명확한 텍스트 제공
- 모바일 터치 영역 충분히 확보

## 완료 기준
- 모바일에서 깨지지 않음
- 주요 버튼이 의도대로 동작
- 빈 상태와 오류 상태가 친절함
- npm run build 성공

# 프론트엔드 React 및 UI 구현 (Frontend React UI)

## 목적
React와 Tailwind CSS를 활용하여 안정적이고 반응성이 뛰어난 사용자 인터페이스를 구축하기 위함입니다.

## 언제 사용하나
- 새로운 화면이나 컴포넌트를 추가할 때
- 사용자 입력 폼이나 인터랙션 로직을 구현할 때
- 전체적인 레이아웃이나 스타일 가이드를 수정할 때

## 관련 파일
- `src/App.jsx`
- `src/pages/Login.jsx`, `Signup.jsx`, `SearchDashboard.jsx`
- `src/components/layout/Footer.jsx`
- `src/api/companyService.js`
- `src/hooks/useSingleReport.js`

## 핵심 규칙
- `App.jsx`의 탭 기반 SPA 구조와 `navigateTab` 이동 로직을 준수한다.
- 컴포넌트 간의 Props 흐름을 명확하게 관리한다.
- 로그인/회원가입 시 발생하는 에러를 사용자에게 적절히 표시한다.
- `SearchDashboard`의 최근 검색 카드 등에서 이벤트 버블링 문제를 방지한다.
- Tailwind CSS를 사용하여 모바일 우선의 반응형 레이아웃을 구성한다.
- 버튼 타입 지정, `aria-label` 등 기본적인 웹 접근성을 준수한다.
- 데이터 로딩, 빈 데이터, 오류 발생 시의 상태 처리를 반드시 구현한다.

## 검증 방법
- `npm run build` 성공 여부 확인
- 개발 도구 모바일 뷰를 통한 레이아웃 깨짐 확인
- 주요 버튼 및 네비게이션 동작 테스트

## 흔한 실수
- 탭 이동 로직을 무시하고 일반 `<a>` 태그로 페이지 이동을 시도하여 상태를 초기화하는 경우
- 모바일에서 표(Table)나 긴 텍스트가 화면 밖으로 나가는 경우
- 로딩 상태 처리가 없어 사용자가 빈 화면을 오랫동안 보게 되는 경우

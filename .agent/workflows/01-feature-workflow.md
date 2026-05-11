# 기능 개발 워크플로우

## 목적
새 기능을 추가할 때 에이전트들이 어떤 순서로 협업할지 정의한다.

## 참여 순서
1. product-manager
2. product-designer
3. developer-backend
4. developer-frontend
5. engineer-ai-prompt 또는 engineer-financial-data
6. product-manager QA

## 단계별 역할

### 1단계 product-manager
- 사용자 문제를 정의한다.
- 기능 목표를 한 문장으로 정리한다.
- P0/P1/P2 우선순위를 정한다.
- 완료 기준을 작성한다.
- 대상 파일과 영향 범위를 추정한다.

산출물:
- 기능 요약
- 요구사항
- 완료 기준
- 테스트 시나리오

### 2단계 product-designer
- 화면 정보 구조를 설계한다.
- 데스크톱/모바일 레이아웃을 정의한다.
- 빈 상태, 로딩 상태, 오류 상태를 정의한다.
- 필요한 카드, 배지, 버튼, 안내 문구를 정리한다.

산출물:
- UI 구조
- 상태별 화면 정의
- 접근성 고려사항

### 3단계 developer-backend
- API 필요 여부를 판단한다.
- 요청/응답 스키마를 정의한다.
- 환경변수, 인증, 저장소, 캐시 영향을 확인한다.
- 안전한 에러 응답을 구현한다.

산출물:
- API 변경사항
- 응답 예시
- 서버 검증 결과

### 4단계 developer-frontend
- React 컴포넌트와 상태를 구현한다.
- API 응답을 UI에 연결한다.
- 빈 데이터, 로딩, 오류, partial success 상태를 처리한다.
- 모바일 반응형을 확인한다.

산출물:
- UI 구현
- 상태 처리 방식
- 빌드 결과

### 5단계 전문 에이전트
필요한 경우만 참여한다.

engineer-ai-prompt:
- 프롬프트, JSON schema, composer 보고서 품질 검토

engineer-financial-data:
- DART/FMP 데이터, corp_code, 재무 지표 검증

### 6단계 product-manager QA
- 완료 기준 충족 여부 확인
- 회귀 테스트
- 릴리즈 가능 여부 판단

## 완료 기준
- npm run build 성공
- 주요 기능 수동 테스트 성공
- 기존 로그인/검색/보고서 생성 흐름 유지
- 변경 파일 목록과 검증 결과 보고

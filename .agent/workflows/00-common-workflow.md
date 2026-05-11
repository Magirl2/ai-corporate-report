# 공통 개발 워크플로우

## 목적
모든 개발용 에이전트가 공통으로 따르는 작업 절차를 정의한다.

## 기본 순서
1. 관련 파일 먼저 읽기
2. 현재 동작과 문제 재정의
3. 영향 범위 파악
4. 최소 수정 계획 작성
5. 코드 수정
6. 빌드/grep/API/UI 검증
7. 변경 파일 목록 보고
8. 남은 리스크와 다음 작업 제안

## 공통 원칙
- 추측보다 코드 기준으로 판단한다.
- 기존 동작을 깨지 않는 최소 변경을 우선한다.
- API key, JWT secret, Redis token을 코드/로그/응답에 노출하지 않는다.
- 사용자에게 보이는 메시지와 서버 내부 로그를 분리한다.
- 모바일 반응형과 접근성을 고려한다.
- 빈 데이터, 오류, 로딩, 부분 성공 상태를 처리한다.
- npm run build 결과를 보고한다.
- git diff, git grep, Select-String, findstr 등을 사용해 검증한다.

## 공통 산출물
- 수정 파일 목록
- 핵심 변경 요약
- 검증 결과
- 남은 이슈
- 다음 액션

## 기본 핸드오프
- product-manager → 요구사항/우선순위 정의
- product-designer → UI/UX 구조 정의
- developer-frontend → React/UI 구현
- developer-backend → API/DB/인증/서버 구현
- engineer-financial-data → DART/FMP/재무 데이터 검증
- engineer-ai-prompt → 프롬프트/보고서 품질 검증

# 버그 수정 워크플로우

## 목적
버그가 발생했을 때 원인을 좁히고 안전하게 수정한다.

## 참여 순서
1. product-manager
2. 담당 도메인 에이전트
3. QA 검증

## 버그 접수 형식
- 증상
- 재현 경로
- 기대 동작
- 실제 동작
- 콘솔/네트워크 로그
- 최근 변경사항
- 영향 범위

## 공통 디버깅 순서
1. 증상 재정의
2. 가능한 원인 3개 작성
3. 가장 가능성 높은 원인 선택
4. 관련 파일 확인
5. 최소 수정
6. 재현/검증
7. 회귀 확인

## 담당 에이전트 선택 기준
- 로그인/회원가입/API 500 → developer-backend
- 화면 렌더링/버튼/탭 이동 → developer-frontend
- 보고서 내용/프롬프트/종합보고서 품질 → engineer-ai-prompt
- DART/FMP/재무 수치 → engineer-financial-data
- 화면이 허접하거나 정보 구조 문제 → product-designer
- 우선순위/범위 불명확 → product-manager

## 필수 검증
- npm run build
- 관련 API 직접 호출
- 브라우저 콘솔 확인
- Network status 확인
- git grep으로 잔여 위험 문자열 확인

## 완료 기준
- 재현 조건에서 문제가 사라진다.
- 기존 기능이 깨지지 않는다.
- 원인과 수정 내용을 명확히 보고한다.

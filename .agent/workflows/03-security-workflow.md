# 보안 패치 워크플로우

## 목적
환경변수, 인증, 저장소, 외부 API 키 관련 보안 문제를 안전하게 처리한다.

## 주 담당
- developer-backend

## 보조 담당
- product-manager
- developer-frontend

## 처리 순서
1. 민감값 노출 여부 확인
2. 환경변수 사용 구조 확인
3. fallback secret 제거
4. 안전한 서버 오류 응답 구현
5. 프론트 에러 메시지 정리
6. Vercel 환경변수 설정 확인
7. 재배포 필요 여부 안내
8. grep 검증
9. build 검증

## 반드시 검색할 문자열
- ei_mock_secret_key_123
- process.env.JWT_SECRET ||
- process.env.DART_API_KEY ||
- 98c7f5
- API_KEY ||
- SECRET ||

## 주요 파일
- api/_lib/env.js
- api/auth/login.js
- api/auth/signup.js
- api/auth/me.js
- api/_lib/db.js
- api/_lib/orchestrator.js
- api/_lib/handlers/report/search.js
- .env.example
- .gitignore

## 응답 원칙
- 사용자 응답에 secret 값을 노출하지 않는다.
- 서버 로그에도 실제 secret 값을 출력하지 않는다.
- 설정 누락은 code/message로 구분한다.

예:
- SERVER_AUTH_MISCONFIGURED
- SERVER_STORAGE_MISCONFIGURED
- DART_API_KEY_MISSING

## 완료 기준
- 민감 fallback 문자열 없음
- 환경변수 누락 시 안전하게 실패
- npm run build 성공
- 필요한 Vercel 환경변수 목록 보고
- 노출된 키는 폐기/재발급 안내

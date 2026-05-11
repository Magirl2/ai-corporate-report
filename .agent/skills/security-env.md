# 보안 및 환경변수 관리 (Security & Environment)

## 목적
API Key, 비밀번호, JWT Secret 등 민감한 정보를 보호하고, 개발/운영 환경에 따라 안전하게 환경변수를 관리하기 위함입니다.

## 언제 사용하나
- 새로운 API 서비스를 연동할 때
- 인증 및 권한 부여 로직을 수정할 때
- 환경변수를 추가하거나 `.env.example`을 업데이트할 때

## 관련 파일
- `api/_lib/env.js`
- `api/auth/login.js`
- `api/auth/signup.js`
- `api/auth/me.js`
- `api/_lib/handlers/report/search.js`
- `api/_lib/orchestrator.js`
- `.env.example`
- `.gitignore`

## 핵심 규칙
- API Key, JWT Secret, Redis Token 등을 코드에 하드코딩하지 않는다.
- `.env.example`에는 실제 키 값을 넣지 않고 자리표시자만 남긴다.
- Vercel 프로젝트 설정에서 환경변수가 올바르게 등록되어 있는지 확인한다.
- `JWT_SECRET` 누락 시 서버가 안전하게 오류를 반환하도록 처리한다.
- `DART_API_KEY`, `GEMINI_API_KEY`, `FMP_API_KEY` 등 외부 API 키 누락 시 적절한 에러를 반환한다.
- 클라이언트 응답이나 공개 로그에 Secret 값을 절대 노출하지 않는다.
- 하드코딩된 Fallback Secret을 절대 사용하지 않는다.

## 검증 방법
- `git grep -n "ei_mock_secret_key_123"` (하드코딩 검색)
- `git grep -n "process.env.JWT_SECRET ||"` (Fallback 확인)
- `npm run build` (빌드 오류 확인)

## 흔한 실수
- 테스트를 위해 임시로 하드코딩한 키를 커밋하는 경우
- `.env` 파일을 실수로 Git에 포함시키는 경우
- 에러 메시지에 API 호출 결과(키 포함)를 그대로 반환하는 경우

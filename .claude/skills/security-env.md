---
name: security-env
description: API Key·JWT Secret·Redis Token·Stripe Key 등 민감값 보호와 환경변수 안전 관리. 새 API 연동, 인증 수정, .env 구조 변경 시 호출한다.
type: skill
---

# Skill: security-env

## 언제 사용하나
- 새 외부 API(DART, FMP, Gemini, Stripe 등) 연동 시
- 인증·권한 로직 수정 시
- 환경변수 추가 또는 `.env.example` 업데이트 시
- 보안 패치 or 민감값 노출 의심 시

## 관련 파일
- `api/_lib/env.js` — 환경변수 중앙 검증 (getRequiredEnv 패턴)
- `api/auth/login.js`, `signup.js`, `me.js`, `logout.js`
- `api/_lib/db.js` — Upstash Redis 연결
- `api/_lib/orchestrator.js` — Gemini/DART/FMP 호출부
- `api/_lib/handlers/data/dart.js`, `dart-finance.js`
- `.gitignore` — `.env`, `.users.json`, `.reports_cache.json` 제외 확인

## 핵심 규칙

### 환경변수 사용
- 모든 Secret은 `getRequiredEnv(name)` 패턴을 통해 가져온다. 직접 `process.env.X || 'fallback'` 금지.
- `GEMINI_API_KEY`, `DART_API_KEY`, `FMP_API_KEY`, `JWT_SECRET`, `KV_REST_API_TOKEN` 전부 해당.
- `.env.example`에는 키 이름만 남기고 실제 값을 절대 넣지 않는다.
- Vercel Dashboard의 Environment Variables에만 실제 값을 등록한다.

### Fintool형 재무 API 보호
- DART API Key 노출 시 실제 기업 재무 공시 무단 수집이 가능해진다. 서버 사이드에서만 호출.
- FMP API Key 노출 시 글로벌 재무 데이터 쿼터 소진 및 과금 발생. 클라이언트 번들에 포함 금지.
- 재무 데이터 API 응답을 클라이언트에 그대로 pass-through할 때 원본 키 포함 헤더 제거 확인.

### 결제 보안 (미래 Stripe 연동 대비)
- `STRIPE_SECRET_KEY`는 서버에서만, `STRIPE_PUBLISHABLE_KEY`만 클라이언트에 노출 허용.
- 현재 `PaymentModal.jsx`의 fake payment는 PG 연동 전까지 실 결제 불가 상태 유지. 연동 시 webhook secret 별도 관리 필요.

### 에러 응답 표준
- 환경변수 누락 시 에러 코드로 구분:
  - `SERVER_AUTH_MISCONFIGURED` (JWT_SECRET 없음)
  - `SERVER_STORAGE_MISCONFIGURED` (Redis 없음)
  - `DART_API_KEY_MISSING`
  - `GEMINI_API_KEY_MISSING`
- 사용자 응답 body에 실제 secret 값, stack trace, 내부 경로 포함 금지.

## 검증 방법
```bash
git grep -n "ei_mock_secret_key_123"
git grep -n "process.env.JWT_SECRET ||"
git grep -n "process.env.DART_API_KEY ||"
git grep -n "process.env.GEMINI_API_KEY ||"
git grep -n "API_KEY ||"
git grep -n "SECRET ||"
git grep -n "98c7f5"
npm run build
```
모든 결과가 `.agent/` 또는 `.claude/` 문서 파일에만 있어야 한다. 소스 코드에서 발견되면 P0 에스컬레이션.

## 흔한 실수
- 테스트용 임시 하드코딩 키를 커밋하는 경우
- `.env` 파일을 실수로 git add 하는 경우 (`.gitignore` 확인 필수)
- 에러 응답 JSON에 API 호출 결과 원문(키 포함)을 그대로 반환하는 경우
- `try/catch`에서 `console.error(err)`로 키 값이 로그에 출력되는 경우
- DART/FMP API를 클라이언트에서 직접 호출하는 코드를 src/ 아래에 작성하는 경우

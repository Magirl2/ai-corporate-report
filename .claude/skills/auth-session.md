---
name: auth-session
description: 로그인·회원가입·JWT 세션·플랜 타입(free/premium/enterprise) 인증 게이트 관리. 인증 로직, 사용량 제한, 결제 후 플랜 업그레이드 흐름 수정 시 호출한다.
type: skill
---

# Skill: auth-session

## 언제 사용하나
- 로그인·회원가입·로그아웃 로직 수정 시
- JWT 발급·검증·만료 처리 변경 시
- 플랜별(free/premium/enterprise) 기능 접근 게이트 추가 시
- 일일 사용량 제한(rate limit) 로직 수정 시
- 결제 성공 후 플랜 업그레이드 흐름 수정 시

## 관련 파일
- `api/auth/login.js` — 비밀번호 검증, JWT 발급, httpOnly 쿠키 설정
- `api/auth/signup.js` — 사용자 등록, bcrypt 해싱
- `api/auth/me.js` — 세션 검증 (JWT 쿠키 파싱)
- `api/auth/logout.js` — 쿠키 만료 처리
- `api/_lib/db.js` — Redis 사용자 저장소
- `api/_lib/handlers/user/usage.js` — 일일 사용량 카운터
- `src/contexts/AuthContext.jsx` — 프론트엔드 인증 상태 관리
- `src/pages/Login.jsx`, `Signup.jsx` — 폼 및 클라이언트 유효성 검사
- `src/pages/Pricing.jsx` — 플랜 업그레이드 UI
- `src/components/PaymentModal.jsx` — 결제 모달 (현재 fake payment)

## 핵심 규칙

### JWT 및 쿠키
- 비밀번호는 반드시 `bcrypt`로 해싱 후 저장 및 검증.
- JWT는 `httpOnly` 쿠키로 발급 — XSS로 탈취 불가.
- JWT payload에 `userId`, `email`, `planType` 포함 (확인 후 수정 시 일관성 유지).
- 쿠키 `secure: true`, `sameSite: strict` 프로덕션 설정 유지.
- 로그인 전 `/api/auth/me` → 401은 정상 동작, 500으로 처리 금지.

### 플랜 타입 인증 게이트
- `planType` 허용값: `'free'` | `'premium'` | `'enterprise'` — 이 외 값은 `'free'`로 정규화.
- 보고서 생성 API에서 플랜 검증 시 JWT claim의 `planType`을 Redis 저장값과 교차 확인.
- Free 플랜 일일 사용량 초과 시 `402 Payment Required` + `DAILY_LIMIT_EXCEEDED` 코드 반환.
- Premium/Enterprise 업그레이드 후 Redis의 사용자 레코드 `planType` 즉시 갱신.

### 결제 후 플랜 업그레이드 흐름
- 현재 `PaymentModal.jsx`의 `handleFakePayment()`는 실제 PG 미연동 상태.
- `upgradePlan(plan)` 함수(`AuthContext.jsx`)가 `/api/auth/upgrade` 또는 유사 엔드포인트 호출 구조.
- 업그레이드 성공 시 JWT 재발급 또는 Redis 플랜 필드 갱신 + 프론트 상태 동기화 필요.
- Stripe 연동 시: webhook으로 `checkout.session.completed` 이벤트 수신 → DB 갱신 패턴 사용.

### 에러 응답 구분
- `401 Unauthorized`: 미인증 또는 잘못된 비밀번호
- `403 Forbidden`: 인증됐으나 권한 없음 (플랜 부족)
- `402 Payment Required`: 사용량 초과
- `500 Internal Server Error`: JWT_SECRET 누락 등 서버 설정 오류

## 검증 방법
```bash
# 코드 레벨 확인
grep -n "planType" src/contexts/AuthContext.jsx
grep -n "DAILY_LIMIT_EXCEEDED\|402" api/
grep -n "httpOnly" api/auth/login.js
npm run build
```
기능 테스트:
1. 회원가입 성공 → Redis 저장 확인
2. 로그인 성공 → JWT 쿠키 발급 확인
3. 잘못된 비밀번호 → 401 확인
4. 로그인 전 `/api/auth/me` → 401 확인
5. 로그아웃 후 쿠키 만료 확인

## 흔한 실수
- 비밀번호를 평문으로 저장하거나 `===` 비교하는 경우
- 쿠키 만료 시 `maxAge: 0` 대신 `expires: new Date(0)` 혼용하여 브라우저별 동작 차이 발생
- `planType` 검증 없이 보고서 생성을 허용하여 Free 사용자가 제한 없이 이용하는 경우
- JWT 재발급 없이 Redis만 갱신하여 플랜 업그레이드가 현재 세션에 반영 안 되는 경우
- 로그인 실패 메시지에 "해당 이메일이 존재하지 않습니다" 식으로 계정 존재 여부를 노출하는 경우

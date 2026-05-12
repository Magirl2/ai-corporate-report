---
name: cors-api-security
description: Vercel 서버리스 환경에서 CORS 정책을 최소 권한 원칙으로 설정하는 실행 지침
type: skill
---

# Skill: cors-api-security

## 핵심 원칙
- 브라우저가 직접 호출하지 않는 내부 전용 엔드포인트에는 CORS 헤더가 필요 없다.
- `Access-Control-Allow-Origin: *`은 API Key를 프록시하는 엔드포인트에 절대 사용하지 않는다.
- OPTIONS preflight 핸들러는 브라우저 직접 호출 경로에만 둔다.

## Vercel 내부 호출 패턴
orchestrator.js의 `internalFetch()`는 서버→서버 HTTP 호출이므로 CORS와 무관하다.
브라우저 직접 호출이 없는 엔드포인트에서 CORS 헤더를 제거해도 동작에 영향이 없다.

## CORS 헤더 제거 체크리스트
1. 해당 엔드포인트가 브라우저 JS에서 직접 `fetch()`로 호출되는지 확인 (`src/` 검색)
2. 서버→서버 호출만 있다면 `Access-Control-Allow-Origin` 줄 제거
3. OPTIONS 핸들러도 함께 제거
4. `npm run build` 및 grep으로 잔존 여부 확인

## 주의
- auth 엔드포인트는 같은 도메인 프론트에서 직접 호출하므로 CORS 불필요 (same-origin)
- report 엔드포인트도 same-origin 호출이므로 CORS 불필요

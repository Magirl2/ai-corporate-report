---
name: redis-cache
description: Upstash Redis 기반 사용자 저장소·보고서 캐시·일일 사용량 카운터 관리. Redis 연결 오류, TTL 전략, 사용량 제한 로직 수정 시 호출한다.
type: skill
---

# Skill: redis-cache

## 언제 사용하나
- Redis 연결 오류 또는 콜드 스타트 장애 대응 시
- 보고서 캐시 TTL 전략 변경 시
- 사용자 일일 사용량(rate limit) 카운터 수정 시
- 플랜별(free/premium/enterprise) 사용량 정책 변경 시
- 캐시 Hit/Miss 모니터링 추가 시

## 관련 파일
- `api/_lib/db.js` — Redis 클라이언트 초기화 및 에러 핸들러
- `api/_lib/handlers/report/cache.js` — 보고서 캐시 읽기/쓰기
- `api/_lib/handlers/user/usage.js` — 일일 사용량 카운터
- `api/auth/signup.js` — 신규 사용자 Redis 저장
- `api/auth/login.js` — 사용자 조회
- `.gitignore` — `.users.json`, `.reports_cache.json` 제외 확인

## 핵심 규칙

### Redis 연결 안정성
- `enableOfflineQueue: false` 금지 — 콜드 스타트 시 401 유발 (이미 제거됨, 재추가 금지).
- Redis error event handler가 `db.js`에 등록된 상태 유지 — 미등록 시 프로세스 크래시.
- `connectTimeout`, `commandTimeout` 옵션 명시 설정.
- Redis 연결 실패 시 보고서 파이프라인이 `SERVER_STORAGE_MISCONFIGURED` 코드로 안전 실패.
- 단일 Redis 연산 실패가 전체 API를 중단시키면 안 됨 — 캐시 Miss로 처리.

### 보고서 캐시 TTL 전략
- 보고서 캐시 키: `report:{companyName}:{mode}` (예: `report:삼성전자:deep`)
- TTL 권장값: 1시간(3600s) — DART 공시 갱신 주기 고려.
- 캐시 HIT 시: 저장된 `finalReport` 객체 그대로 반환, 파이프라인 재실행 금지.
- 캐시 MISS 시: 파이프라인 실행 후 `composeFailed` 여부와 무관하게 결과 저장 (Partial Success도 캐싱).
- `cache.js`의 `catch (_err) {}` 빈 블록 — 캐시 장애가 보고서 생성을 막으면 안 되므로 의도적 처리. 단, 경고 로그 추가 권장.

### 사용자 일일 사용량 카운터
- 키 패턴: `usage:{userId}:{YYYY-MM-DD}` — 날짜별 초기화.
- Free 플랜 일일 한도: 코드 확인 후 정책 문서와 일치 여부 검증.
- Premium/Enterprise 플랜은 한도 검사 skip.
- Redis INCR + EXPIRE 원자적 연산으로 카운터 관리.
- 카운터 증가 실패 시 보고서 생성 허용 (Redis 장애로 정상 사용자 차단 방지).

### 데이터 구조 (사용자 레코드)
```json
{
  "userId": "uuid",
  "email": "...",
  "passwordHash": "bcrypt_hash",
  "planType": "free|premium|enterprise",
  "createdAt": "ISO8601"
}
```
- `planType` 업그레이드 시 Redis `HSET` or `SET` 으로 해당 필드만 갱신.
- 전체 사용자 객체 재직렬화 시 기존 필드 누락 없는지 확인.

### 로컬 캐시 파일 금지
- `.users.json`, `.reports_cache.json`은 로컬 개발 전용 — 절대 git commit 금지.
- `.gitignore`에 포함 여부 `git status`로 매번 확인.
- 서버리스 환경에서 `fs`로 영구 저장 시도 금지.

## 검증 방법
```bash
git status   # .users.json, .reports_cache.json 미포함 확인
grep -n "enableOfflineQueue" api/_lib/db.js  # false 없는지 확인
grep -n "error.*event\|on.*error" api/_lib/db.js  # 에러 핸들러 등록 확인
npm run build
```
기능 테스트:
1. 회원가입 후 Redis에 사용자 저장 확인
2. 보고서 생성 후 캐시 저장 확인
3. 동일 기업 재검색 시 캐시 HIT (응답 속도 차이) 확인
4. Free 사용자 한도 초과 시 `402 DAILY_LIMIT_EXCEEDED` 확인

## 흔한 실수
- TTL 없이 캐시 저장하여 Redis 메모리 무한 증가
- Redis 연결 실패 시 예외 처리 없어 보고서 생성 전체 중단
- 로컬 `.users.json`을 git commit하여 실제 사용자 정보 노출
- 플랜 업그레이드 시 Redis 갱신 후 JWT 재발급 없어 현재 세션에 미반영
- 카운터 증가 없이 사용량 체크만 하여 우회 가능한 상태 방치

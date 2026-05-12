---
name: backend-api
description: Vercel 서버리스 API 설계, 표준 응답 계약, 에러 코드, NDJSON 스트리밍 패턴. 새 엔드포인트 추가, 응답 형식 변경, 에러 핸들링 개선 시 호출한다.
type: skill
---

# Skill: backend-api

## 언제 사용하나
- 새 API 엔드포인트 추가 시
- 기존 API 응답 형식 또는 에러 코드 변경 시
- DART/FMP/Gemini 호출 핸들러 수정 시
- 보고서 생성 API의 스트리밍 응답 구조 수정 시

## 관련 파일
- `api/_lib/handlers/` — 전체 핸들러 디렉토리
- `api/_lib/handlers/report/search.js` — Stage 1 NDJSON 스트리밍
- `api/_lib/handlers/report/output.js` — Stage 2 분석
- `api/_lib/handlers/report/compose.js` — Stage 3 composer
- `api/_lib/handlers/data/dart.js`, `dart-finance.js` — DART 프록시
- `api/_lib/handlers/data/fmp-finance.js` — FMP 프록시
- `api/_lib/logger.js` — 구조화 로그
- `api/_lib/errors.js` — 에러 코드 정의
- `api/_lib/orchestrator.js` — 파이프라인 전체 오케스트레이터

## 핵심 규칙

### 응답 계약 (Response Contract)
모든 API 응답은 아래 형식을 유지한다:
```json
// 성공
{ "data": {...}, "metadata": {...} }

// 에러
{ "error": { "code": "SNAKE_CASE_CODE", "message": "사용자 친화적 메시지" } }
```
- HTTP 상태 코드를 표준에 맞게 사용: 200·201·400·401·403·402·404·500.
- 에러 응답에 내부 stack trace, 파일 경로, secret 값 포함 금지.
- 서버 내부 기술적 메시지와 사용자 노출 메시지를 반드시 분리.

### NDJSON 스트리밍 (AlphaSense형 검색 결과)
- 보고서 생성 API(`/api/report/search`)는 NDJSON 청크로 실시간 진행 상태 전송.
- 각 청크 형식: `{"type":"progress"|"result"|"error", "stage":1|2|3, ...}\n`
- 클라이언트(`companyService.js`)는 청크 파싱 실패 시 해당 청크만 skip, 전체 중단 금지.
- 스트리밍 중 `composeFailed` 발생 시에도 `stage2` 데이터 청크는 반드시 전송.

### Hebbia형 출처 기반 응답 구조
- 보고서 최종 응답에 `sources` 배열 필수 포함:
  ```json
  { "url": "...", "title": "...", "qualityTier": "high|medium|low|blocked", "qualityScore": 0.0~1.0, "type": "dart|fmp|news|web" }
  ```
- DART 공시 데이터 사용 시 `sources`에 `'DART 전자공시시스템'` 엔트리 추가 (실제 데이터 수집됐을 때만).
- FMP 데이터 사용 시 동일하게 FMP 출처 추가.
- 소스 없이 분석 결과만 반환 금지 — 출처 추적 가능성 유지.

### S&P Capital IQ형 재무 비교 응답
- 재무 데이터 API(`/api/data/dart-finance`, `/api/data/fmp-finance`)는 연도별 배열 구조로 반환:
  ```json
  { "years": [2022, 2023, 2024], "revenue": [...], "operatingIncome": [...], "unit": "KRW_억원" }
  ```
- 원화 단위는 `unit` 필드로 명시 (`KRW_억원`, `KRW_백만원`, `USD_million`).
- 0으로 나누기 방지 — 계산 전 분모 0 체크.
- 누락 연도는 `null`로 표시, 빈 배열 금지.

### 에러 코드 표준
```
SERVER_AUTH_MISCONFIGURED   JWT_SECRET 없음
SERVER_STORAGE_MISCONFIGURED Redis 연결 불가
DART_API_KEY_MISSING        DART API 키 누락
DART_CORP_NOT_FOUND         corp_code 매칭 실패
GEMINI_API_KEY_MISSING      Gemini API 키 누락
DAILY_LIMIT_EXCEEDED        Free 플랜 일일 한도 초과
REPORT_GENERATION_FAILED    파이프라인 전체 실패
```

### 404 응답 표준
- 존재하지 않는 라우트는 `{ "error": { "code": "NOT_FOUND", "message": "..." } }` + 404 반환.
- 빈 body 또는 HTML 반환 금지 (프론트 파싱 오류 방지).

## 검증 방법
```bash
npm run build
grep -n "res.status(200)" api/_lib/handlers/  # 에러를 200으로 반환하는지 확인
grep -rn "console.error" api/_lib/handlers/   # 구조화 logger 사용 확인
```
API 직접 테스트:
- `GET /api/auth/me` → 401 (미인증)
- `GET /api/data/dart?corp_code=00126380` → DART 응답
- `POST /api/report/search` → NDJSON 스트리밍 시작 확인

## 흔한 실수
- 에러를 `200 OK` + body 내 `success: false` 패턴으로 반환하여 HTTP 표준 위반
- 비동기 `await` 누락으로 응답 완료 전 함수 종료
- DART 응답을 받지 못해도 FMP 폴백 없이 에러 반환
- 스트리밍 중 에러 발생 시 헤더 재전송 시도로 크래시
- `empty catch (_) {}` 블록으로 에러를 조용히 삼켜 디버깅 불가

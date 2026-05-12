---
name: vercel-deployment
description: Vercel 서버리스 환경 배포·타임아웃·환경변수·함수 예산 관리. 새 기능 배포, 타임아웃 오류, 빌드 설정 변경 시 호출한다.
type: skill
---

# Skill: vercel-deployment

## 언제 사용하나
- 새 기능을 Vercel에 배포하거나 배포 설정 변경 시
- 서버리스 함수 타임아웃·메모리 부족 오류 발생 시
- Vercel 로그를 통해 프로덕션 에러 디버깅 시
- 환경변수 추가 후 Redeploy 필요 시

## 관련 파일
- `vercel.json` — 함수 타임아웃, maxDuration 설정
- `api/*` — 모든 API 엔드포인트 (Vercel Serverless Functions)
- `api/_lib/env.js` — 환경변수 검증
- `api/_lib/db.js` — Upstash Redis 연결 (콜드 스타트 대응)
- `api/_lib/orchestrator.js` — 보고서 파이프라인 (가장 긴 실행 경로)
- `package.json` — 빌드 스크립트

## 핵심 규칙

### 타임아웃 예산
- Vercel 기본 타임아웃: 300s (Fluid Compute 기준). `vercel.json`의 `maxDuration`으로 조정.
- 보고서 생성 파이프라인(Stage 1+2+3)의 총 실행 시간이 예산 안에 들어오도록 설계.
- 각 Stage별 내부 타임아웃을 명시적으로 설정하여 단계 초과 시 Partial Success 처리.
- Gemini Phase A(grounding) + Phase B(JSON briefing) 2단계 구조는 합산 시간 고려.

### 콜드 스타트 대응
- `enableOfflineQueue: false` 금지 — Redis 콜드 스타트 시 401 유발 (이미 제거됨, 재추가 금지).
- Redis 연결에 `connectTimeout`, `commandTimeout` 옵션 명시적 설정.
- `api/_lib/db.js`의 Redis error event handler가 연결된 상태 유지.

### 환경변수 관리
- Vercel Dashboard → Settings → Environment Variables에서 직접 등록.
- Production / Preview / Development 환경별 차이 인지.
- **환경변수 변경 후 반드시 Redeploy 필요** — 자동 반영 안 됨.
- 로컬 개발 시 `.env.local` 사용, `.env`는 `.gitignore`에 포함.

### 빌드 아티팩트
- `dist/` 폴더가 빌드 산출물. Git 추적 대상 아님.
- `npm run build` 성공 기준: 에러 없이 종료, 번들 파일 생성 확인.
- 현재 번들 크기 기준: `index.js` ~302KB, `SingleReportView.js` ~197KB (gzip 각 83KB/57KB).
- lazy-load 적용 파일(`SingleReportView`, `CompareFinancials`) 유지 — 제거 금지.

### AlphaSense형 검색 결과 API
- 검색 API(`/api/report/search`)의 NDJSON 스트리밍 응답 구조 유지.
- 스트리밍 중 연결 끊김 시 클라이언트(`companyService.js`)에서 이미 수신한 청크 보존.
- 검색 결과의 구조화 필드(`stage1Id`, `stage2Id`, `sources`, `metadata`) 계약 유지.

## 검증 방법
```bash
npm run build
git diff --stat
git status
```
배포 후:
- `/api/auth/me` → 401 (미인증), 200 (인증) 확인
- `/api/data/dart?corp_code=00126380` → DART 응답 확인
- Vercel 배포 로그에서 함수 실행 시간 확인

## 흔한 실수
- 환경변수 변경 후 Redeploy 누락
- `fs` 모듈로 로컬 파일에 영구 저장 시도 (서버리스는 읽기 전용)
- 보고서 파이프라인 전체를 단일 함수에 넣어 타임아웃 초과
- lazy-load 청크 파일의 import 경로를 상대경로로 하드코딩하여 빌드 깨짐
- `maxDuration`을 올리지 않고 타임아웃을 내부 로직으로만 해결하려는 경우

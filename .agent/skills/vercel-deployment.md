# Vercel 배포 및 서버리스 관리 (Vercel Deployment)

## 목적
Vercel 환경에서의 안정적인 서비스 배포와 서버리스 함수의 동작 특성을 이해하고 관리하기 위함입니다.

## 언제 사용하나
- 새로운 기능을 배포하거나 배포 설정을 변경할 때
- 서버리스 함수 타임아웃이나 리소스 부족 문제가 발생할 때
- Vercel 로그를 통해 프로덕션 환경의 오류를 디버깅할 때

## 관련 파일
- `vercel.json`
- `api/*` (모든 API 엔드포인트)
- `api/_lib/env.js`
- `api/_lib/db.js`
- `package.json`

## 핵심 규칙
- Vercel 대시보드에서 Environment Variables가 올바르게 설정되었는지 확인한다.
- Production, Preview, Development 환경별 환경변수 차이를 인지한다.
- 환경변수 변경 후에는 반드시 Redeploy를 실행해야 반영됨을 명심한다.
- Serverless Function의 기본 타임아웃 제한을 고려하여 긴 작업을 설계한다.
- Vercel 런타임 로그를 주기적으로 점검하여 API 오류를 모니터링한다.
- 배포 후 `/api/auth/me`의 401(미인증)과 500(서버 오류)을 명확히 구분한다.
- Upstash Redis 등 외부 KV 저장소의 연결 상태를 점검한다.

## 검증 방법
- `npm run build` 성공 확인
- 배포 URL에서 `/api/auth/me`, `/api/data/dart?corp_code=00126380` 등 주요 API 직접 호출 테스트
- Vercel Deployment 로그 확인

## 흔한 실수
- 환경변수만 바꾸고 Redeploy를 하지 않아 이전 설정이 유지되는 경우
- 로컬 파일 시스템(`fs`)을 서버리스 환경에서 영구 저장소로 오해하는 경우
- 타임아웃이 긴 작업을 일반 API 요청으로 처리하여 요청이 끊기는 경우

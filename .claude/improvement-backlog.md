---
name: improvement-backlog
description: 제품 개선 백로그. P0→P1→P2 순서로 작업한다. 코드 감사 후 완료 항목은 ✅로 표시한다.
type: backlog
updated: 2026-05-12
---

# 개선 백로그

> 이 문서는 코드 감사(2026-05-12) 결과를 반영합니다.
> ✅ = 코드 확인 완료 / ⚠️ = 부분 구현 / ❌ = 미구현

---

## P0

### A. 보안/환경변수 Fallback 제거 ✅ (감사 결과: 이미 해결됨)

**목표**: JWT_SECRET, DART_API_KEY, FMP_API_KEY, Redis, Stripe 관련 민감값 하드코딩 제거.

**감사 결과**: 소스 코드에 `process.env.JWT_SECRET ||`, `process.env.DART_API_KEY ||` 등 Fallback 패턴 없음. `getRequiredEnv()` 패턴 적용 완료.

**잔여 검증** (배포 전 반드시 재실행):
```bash
git grep -n "ei_mock_secret_key_123"
git grep -n "process.env.JWT_SECRET ||"
git grep -n "process.env.DART_API_KEY ||"
git grep -n "sk_live" ; git grep -n "sk_test"
git grep -n "98c7f5"
```

**담당**: `backend-security`, `pm-release-qa`
**스킬**: `.claude/skills/security-env.md`, `.agent/skills/qa-build-grep.md`

---

## P1

### B. 출처 탭 UI 전문화 ⚠️ (부분 구현)

**목표**: sourceQualitySummary 요약 카드, dartStatus 카드, 출처별 품질 배지 완성.

**감사 결과**:
- ✅ `sourceQualitySummary` 카드 (total/high/medium/low/blocked 5개 수치) — 구현됨
- ✅ `dartStatus` 카드 (corp_code, 공시 건수, 재무 연도) — 구현됨
- ✅ 출처 카드에 `qualityTier`, `qualityScore` 표시 — 구현됨
- ❌ 보고서 Markdown 본문 내 `[DART-1]`, `[NEWS-1]`, `[SRC-1]` 출처 배지 — **미구현**
- ❌ FMP Fallback 여부 UI 표시 — **미구현**
- ❌ 출처별 `reliability` 점수 텍스트 — **미구현**

**남은 작업**:
1. `displayHelpers.jsx`의 Markdown 렌더러에서 `[SOURCE_ID]` 패턴을 배지로 변환
2. FMP fallback 시 `dartStatus` 카드에 "FMP 대체 사용" 표시
3. 출처 카드 하단에 reliability 레이블 추가

**담당**: `frontend-source-ui`, `frontend-markdown`
**스킬**: `.claude/skills/source-quality-display.md`, `.agent/skills/source-quality.md`, `.agent/skills/report-ui.md`
**검증**: `npm run build`, `grep -n "qualityBadge\|sourceId" src/`

---

### C. 실제 Composer 모델명 표시 ✅ (감사 결과: 이미 해결됨)

**목표**: 하드코딩된 "Composed by Gemini 2.5 Pro" 제거, 실제 `metadata.composerModel` 사용.

**감사 결과**:
- `orchestrator.js:1141`: `this.metadata.composerModel = currentModel` — 실제 모델명 기록
- `orchestrator.js:1139`: `this.metadata.composerFallbackUsed = true` — 폴백 여부 기록
- `SingleReportView.jsx:711,753`: `formatComposerModel(singleData.metadata?.composerModel)` — UI 표시
- `SingleReportView.jsx:712,754`: fallback 시 `↓` 아이콘 — 구현됨

**잔여 확인**: `git grep -n "Composed by Gemini 2.5 Pro"` 결과 없음 (✅)

---

### D. Markdown 렌더링 개선 ⚠️ (부분 구현)

**목표**: 표/링크/목록/blockquote/inline code 렌더링 + 출처 배지화 + 외부 링크 처리.

**감사 결과**:
- ✅ `react-markdown` + `remark-gfm` — `displayHelpers.jsx`에 적용됨
- ✅ 외부 링크 `target="_blank" rel="noopener noreferrer"` — `displayHelpers.jsx:37`, `SingleReportView.jsx:134,275`
- ❌ `[DART-1]`, `[NEWS-1]`, `[AI-1]`, `[SRC-1]` 출처 배지 변환 — **미구현** (B항목과 동일)
- ❌ `blockquote`, `code` 블록 스타일 커스텀 — 확인 필요

**남은 작업**:
1. `displayHelpers.jsx`의 `ReactMarkdown` components에 sourceId 패턴 매처 추가
2. `blockquote`, `code` 컴포넌트 커스텀 렌더러 추가

**담당**: `frontend-markdown`, `frontend-source-ui`
**스킬**: `.agent/skills/report-ui.md`, `.agent/skills/frontend-react-ui.md`
**검증**: `npm run build`, 실제 보고서 화면에서 표/링크/배지 확인

---

### E. DART/FMP 재무 지표 카드 강화 ⚠️ (부분 구현)

**목표**: 매출/영업이익/순이익/부채비율 구조화, 2022~2024 연도별 표, 원화 표시, 데이터 없으면 임의 생성 금지.

**감사 결과**:
- ✅ `financialAnalysis.keyMetrics` 카드 — `SingleReportView.jsx:609,650` 구현됨
- ✅ `financialAnalysis.overview` 요약 — `SingleReportView.jsx:604` 구현됨
- ❌ 연도별(2022/2023/2024) 매출액·영업이익 **비교 표** — **미구현**
- ❌ 원화 단위(`억원`, `백만원`) 명시 표시 — 확인 필요
- ❌ FMP 글로벌 기업 USD↔KRW 단위 변환 표시 — **미구현**

**남은 작업**:
1. `dart-finance.js`의 응답에 `years[]` 배열 + 연도별 수치 구조 추가
2. `SingleReportView.jsx`에 재무 연도별 비교 표 컴포넌트 추가
3. 단위 필드(`unit: "KRW_억원"`) 표시 로직 추가

**담당**: `engineer-financial-data`, `developer-frontend`, `product-designer`
**스킬**: `.agent/skills/dart-fmp-data.md`, `.claude/skills/backend-api.md`
**검증**: `/api/data/dart-finance?corp_code=00126380` 응답 확인, 보고서 재무 탭 확인

---

### F. CSV 내보내기 기반 추가 ❌ (미구현)

**목표**: 재무 비교 표 또는 보고서 요약 CSV 다운로드. 개인정보·API Key·내부 캐시 제외.

**감사 결과**: 관련 코드 없음. 완전 신규 기능.

**구현 범위**:
1. 재무 데이터(`financialAnalysis.keyMetrics`, 연도별 표) → CSV 변환 유틸
2. 다운로드 버튼 `SingleReportView.jsx`에 추가 (재무 탭 또는 종합 탭)
3. 파일명: `{회사명}_재무분석_{날짜}.csv`
4. 포함 금지: userId, email, API 응답 원문, 캐시 키

**담당**: `developer-frontend`, `engineer-financial-data`
**스킬**: `.agent/skills/frontend-react-ui.md`, `.claude/skills/backend-api.md`
**검증**: `npm run build`, 다운로드 파일 내용 확인

---

### G. report-agents 프롬프트 품질 개선 ⚠️ (부분 구현)

**목표**: DART/FMP 데이터 우선 사용, high/medium 출처만 핵심 주장 근거로 사용, 투자 권유 금지, 수치 없으면 추정 금지, 모든 중요한 주장에 sourceId.

**감사 결과**:
- ✅ `composer.md`: `sourceQualitySummary` 활용 규칙 포함 — 구현됨
- ✅ `composer.md`: 투자 권유 아님 고지 — 구현됨
- ⚠️ `analyst-financial.md`, `analyst-news.md`: sourceId 병기 규칙 — 확인 필요
- ❌ low/unverified 출처를 핵심 주장 근거로 쓰지 않도록 `critic.md` 강제 — **강화 필요**
- ❌ 수치 미존재 시 추정값 생성 명시적 금지 — **확인·강화 필요**

**남은 작업**:
1. `analyst-financial.md`: 재무 수치 미존재 시 "데이터 없음" 명시 지시 강화
2. `critic.md`: low/unverified 출처가 핵심 주장에 사용된 경우 거부 지시 추가
3. `analyst-news.md`: 뉴스 출처 qualityTier 기준 사용 지시 추가

**담당**: `engineer-ai-prompt`, `ai-prompt-reporter`
**스킬**: `.agent/skills/prompt-llm.md`, `.agent/skills/source-quality.md`
**검증**: 실제 보고서 생성 후 출처 없는 단정적 표현 수동 확인

---

### H. 종합 보고서 실패 시 부분 결과 표시 보장 ✅ (감사 결과: 이미 해결됨)

**목표**: composeFailed 시에도 재무 분석, 뉴스 분석, 전략 분석, 출처 목록, dartStatus, sourceQualitySummary 표시.

**감사 결과**:
- ✅ `compose.js:95`: `composeFailed = true` 설정
- ✅ `orchestrator.js:540`: `composeFailed` 설정
- ✅ `companyService.js:149,157`: composeFailed여도 `singleData`로 반환
- ✅ `useSingleReport.js:70`: composeFailed 플래그 처리
- ✅ `SingleReportView.jsx:450,724,732,765,782`: composeFailed UI 분기 처리

**잔여 확인**: 의도적으로 Stage 3 실패 유도 후 상세 분석 탭 표시 여부 수동 테스트 권장.

---

### I. 결제/요금제 구조 점검 ❌ (미구현 — 주의 필요)

**목표**: Pricing, PaymentModal, planType, 사용량 제한 연결 확인. Stripe 연동.

**감사 결과**:
- ❌ `PaymentModal.jsx:22`: `handleFakePayment()` — 실제 PG 미연동. 테스트 카드(`4242 4242 4242 4242`)로만 동작.
- ❌ Stripe webhook 없음 — 클라이언트 응답만으로 플랜 업그레이드 처리 중 (보안 취약).
- ⚠️ `Pricing.jsx:31`: `onPaymentSuccess → upgradePlan(plan)` 흐름은 있으나 실제 결제 검증 없음.
- ⚠️ 실 요금 표시(₩19,000 / ₩99,000)와 fake 결제 불일치 — 사용자 혼란 위험.

**주의**: Stripe 실제 연동은 외부 계정 설정이 필요하므로 **멈추고 보고** 후 진행.

**남은 작업 (코드 범위)**:
1. Stripe publishable key 프론트 주입 (`VITE_STRIPE_PUBLISHABLE_KEY`)
2. `PaymentModal.jsx` → Stripe Elements 또는 Payment Link 교체
3. `/api/payment/webhook` 엔드포인트 신규 생성 (Stripe → DB planType 갱신)
4. Free 플랜 일일 사용량 초과 시 Pricing 탭 유도 UX

**담당**: `developer-backend`, `developer-frontend`, `pm-risk-manager`
**스킬**: `.claude/skills/auth-session.md`, `.claude/skills/backend-api.md`, `.agent/skills/legal-trust.md`
**차단 조건**: Stripe Secret Key, Webhook Secret — 외부 설정 필요 시 즉시 멈춤

---

## P2

### J. 경쟁사 비교 보고서 기능 ❌ (미구현)

**목표**: 경쟁사명·경쟁 포인트·강점·약점·가격/비즈니스 모델·최근 뉴스·출처 구조화.

**구현 방향**:
- `CompareFinancials.jsx` (이미 lazy-load 분리됨)에 경쟁사 AI 분석 섹션 추가
- orchestrator에 `engineCompetitor` 단계 추가 (Klue/Competely형)
- `analyst-strategy.md` 프롬프트에 경쟁사 비교 섹션 추가

**담당**: `pm-competitive-strategy`, `engineer-ai-prompt`, `developer-frontend`
**스킬**: `.agent/skills/competitor-analysis/SKILL.md`, `.agent/skills/report-pipeline.md`

---

### K. 공시/뉴스 변화 감지 기반 설계 ❌ (미구현)

**목표**: 외부 크론/알림은 즉시 구현하지 않음. 향후 알림 기능을 위한 내부 설계 문서만 작성.

**구현 방향**:
- Redis에 `lastSeen:{companyId}:{sourceType}` 키로 마지막 확인 시점 저장 설계
- DART 공시 변화 감지 diff 로직 설계 문서 작성
- Vercel Cron 연동 가능성 검토 (현재 미사용)

**담당**: `engineer-financial-data`, `developer-backend`

---

### L. 한국어/영어 현지화 개선 ⚠️ (부분 구현)

**목표**: 금액 단위·원화 표시·날짜 표시 정리, 투자 권유 아님 고지 문구 개선.

**감사 결과**:
- ✅ 투자 권유 아님 고지 — `composer.md`, Footer 포함됨
- ❌ 재무 수치 원화 단위 (`억원` / `백만원`) UI 명시 — 일관성 부족
- ❌ 날짜 표시 (`generatedAt`) 한국 시간대(KST) 변환 — 현재 UTC ISO8601 그대로 표시
- ❌ 영어 기업명 검색 시 한국어 보고서 출력 일관성 — 확인 필요

**남은 작업**:
1. `displayHelpers.jsx`에 `formatKRW(value, unit)` 유틸 추가
2. `generatedAt` → KST 변환 표시 (`Intl.DateTimeFormat` 사용)
3. 데이터 지연 가능성 고지 문구 표준화

**담당**: `developer-frontend`, `product-designer`
**스킬**: `.agent/skills/legal-trust.md`, `.agent/skills/frontend-react-ui.md`

---

### M. 로컬 캐시 파일 Git 추적 제거 ✅ (감사 결과: 이미 해결됨)

**목표**: `.reports_cache.json`, `.users.json` Git 추적 제거.

**감사 결과**:
- ✅ `.gitignore:29`: `.users.json` 포함
- ✅ `.gitignore:30`: `.reports_cache.json` 포함
- ✅ `git ls-files` 결과 두 파일 모두 추적되지 않음

**잔여 확인**: `git status` 에 해당 파일이 미포함인지 배포 전 재확인.

---

## 백로그 요약

| 항목 | 상태 | 우선순위 |
|------|------|----------|
| A. 보안/환경변수 Fallback | ✅ 완료 | P0 |
| B. 출처 탭 UI 전문화 | ⚠️ 부분 | P1 |
| C. Composer 모델명 표시 | ✅ 완료 | P1 |
| D. Markdown 렌더링 개선 | ⚠️ 부분 | P1 |
| E. DART/FMP 재무 지표 카드 | ⚠️ 부분 | P1 |
| F. CSV 내보내기 | ❌ 미구현 | P1 |
| G. 프롬프트 품질 개선 | ⚠️ 부분 | P1 |
| H. Partial Success 보장 | ✅ 완료 | P1 |
| I. 결제/Stripe 연동 | ❌ 미구현 (외부 설정 필요) | P1 |
| J. 경쟁사 비교 보고서 | ❌ 미구현 | P2 |
| K. 공시 변화 감지 설계 | ❌ 미구현 | P2 |
| L. 현지화 개선 | ⚠️ 부분 | P2 |
| M. 로컬 캐시 Git 제거 | ✅ 완료 | P2 |

**즉시 착수 가능**: B, D, E, G, L (코드만으로 완료 가능)
**외부 설정 필요**: I (Stripe 계정), K (Vercel Cron 설정)
**신규 기능**: F, J

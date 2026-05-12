---
name: team-protocol
description: 6개 팀장 에이전트의 협업 의사결정 절차. 문제 발생 시 이 프로토콜을 먼저 읽는다.
type: protocol
---

# 팀 토론 프로토콜

이 문서는 6개 팀장 에이전트가 협업할 때 따르는 의사결정 및 토론 절차를 정의합니다.

---

## 팀장 구성 및 역할 요약

| 팀장 | 파일 | 핵심 역할 |
| :--- | :--- | :--- |
| **product-manager** | `.agent/agents/product-manager.md` | 문제 정의, P0/P1/P2 우선순위, 완료 기준, 경쟁사 포지셔닝, 릴리즈 계획 |
| **product-designer** | `.agent/agents/product-designer.md` | 정보 구조(IA), 카드/배지 UI, 반응형 레이아웃, 빈/오류/로딩/부분성공 상태 시각화 |
| **developer-frontend** | `.agent/agents/developer-frontend.md` | React 컴포넌트, SPA 라우팅, 보고서 뷰 안정성, 모바일 반응형, 접근성 |
| **developer-backend** | `.agent/agents/developer-backend.md` | 서버리스 API, JWT/쿠키 인증, Redis 캐시, 보고서 파이프라인, 환경변수 보안 |
| **engineer-ai-prompt** | `.agent/agents/engineer-ai-prompt.md` | 런타임 프롬프트 설계, JSON Schema 출력 강제, 할루시네이션 방지, 토큰 예산 |
| **engineer-financial-data** | `.agent/agents/engineer-financial-data.md` | DART/FMP 연동, corp_code 매칭, 재무 지표 정규화, sourceQuality 연동 |

---

## 기본 토론 순서 (6-Step Protocol)

### 1단계 — PM: 문제 정의 및 우선순위 (product-manager)
- 사용자 문제를 한 문장으로 정의한다.
- 사용자 영향도를 판단한다 (몇 명에게, 얼마나 자주, 얼마나 심각한가).
- 작업을 **P0 / P1 / P2**로 분류한다.
- 완료 기준(Definition of Done)과 테스트 시나리오를 작성한다.
- 영향 받는 파일과 기능 범위를 추정한다.
- **경쟁 서비스(AlphaSense, Fintool, Hebbia, S&P Capital IQ, Klue 등) 대비 차별화 포인트를 확인한다.**

### 2단계 — 관련 전문 팀 논의
작업 성격에 따라 해당 팀장만 참여한다.

| 작업 성격 | 참여 팀장 |
| :--- | :--- |
| UI/UX 개선 | product-designer → developer-frontend |
| API / 인증 / 캐시 | developer-backend |
| DART / FMP / 재무 데이터 | engineer-financial-data |
| 프롬프트 / 보고서 품질 | engineer-ai-prompt |
| 출처 신뢰도 | engineer-financial-data + engineer-ai-prompt + developer-frontend |
| 결제 / 요금제 / 사용량 제한 | developer-backend + developer-frontend + product-manager |
| 경쟁사 모니터링 / 비교 보고서 | product-manager + engineer-ai-prompt + developer-backend |
| 전체 기능 개발 | 전 팀장 순서대로 (PM → Designer → Backend → Frontend → AI/Data) |

### 3단계 — 반대 검토 (Risk Review)
구현 전 모든 팀장이 다음을 검토한다.

- **보안 위험**: API Key 노출, JWT 우회, 권한 결함, secret 하드코딩 가능성
- **기존 기능 파괴 위험**: 로그인·회원가입·검색·보고서 생성·Footer 법적 페이지 흐름 중단 가능성
- **데이터 손실 위험**: Redis 데이터, 캐시, 사용자 레코드 손상 가능성
- **사용자 혼란 위험**: 출처 없는 단정적 표현, 투자 권유 오해 가능성
- **빌드 실패 위험**: import 경로, Tailwind 클래스, lazy-load 청크 변경 영향

파괴 위험이 있으면 → 작업을 더 작은 단위로 분할한 뒤 재승인.

### 4단계 — 구현 결정
- 반대 검토를 통과한 **최소 수정 계획**을 확정한다.
- 관련 파일 목록을 확정한다 (Read/Grep으로 실제 확인).
- 관련 스킬 파일(`.claude/skills/` 또는 `.agent/skills/`)을 참조한다.
- 관련 워크플로우 파일(`.agent/workflows/`)을 따른다.

### 5단계 — 구현
- **코드 기반으로 판단하고, 추측으로 수정하지 않는다.**
- Secret 값(API Key, JWT Secret, Redis Token, Stripe Secret)은 코드·로그·응답에 **절대 노출하지 않는다.**
- `.env` 파일을 직접 열람하거나 내용을 응답에 포함하지 않는다.
- `TODO` / `placeholder` / `나중에 추가` 같은 미완성 문구를 남기지 않는다.
- `git push`는 자동으로 수행하지 않는다.

### 6단계 — QA (pm-release-qa 에이전트 호출)
모든 구현 완료 후 순서대로 검증한다.

1. `npm run build` 성공 여부 확인
2. Secret 하드코딩 grep 검사:
   ```bash
   git grep -n "ei_mock_secret_key_123"
   git grep -n "process.env.JWT_SECRET ||"
   git grep -n "process.env.DART_API_KEY ||"
   git grep -n "sk_live" && git grep -n "sk_test"
   ```
3. 주요 기능 회귀 테스트: 로그인 → 검색 → 보고서 생성 → 보고서 표시 흐름 확인
4. `composeFailed` 시 상세 분석 탭 접근 가능 확인
5. Footer 법적 링크 (data-notice, privacy-policy, terms) 이동 확인
6. 모바일(md 이하) 레이아웃 확인
7. 변경 파일 목록 및 검증 결과 보고

---

## 합의 규칙 (Priority & Consensus Rules)

| 우선순위 | 대상 | 결정 원칙 |
| :--- | :--- | :--- |
| **P0** | 보안 취약점 (API Key 노출, JWT 우회, 권한 결함) | 즉시 중단 후 핫픽스 우선 |
| **P0** | 결제 / 인증 시스템 장애 | 모든 작업 중단, 복구 우선 |
| **P1** | 보고서 품질 및 출처 신뢰도 저하 | 기존 흐름 유지하며 점진적 개선 |
| **P1** | 결제/권한 문제 (P0 아닌 경우) | 결제·플랜 흐름 우선 안정화 |
| **P1** | DART/FMP 재무 데이터 오류 | 사용자가 잘못된 수치를 신뢰하면 안 됨 |
| **P1** | 보고서 생성 실패 → 상세 분석 표시 차단 | Partial Success 보장이 필수 |
| **P1** | 사용자가 보고서 내용을 신뢰할 수 없게 만드는 문제 | 투자 오판 방지 우선 |
| **P2** | UI polish / 접근성 / 반응형 | 기존 기능 깨지지 않는 범위에서 개선 |
| **P2** | 경쟁사 비교 기능 / CSV 내보내기 등 신규 기능 | 기존 핵심 흐름 안정화 후 진행 |

**핵심 원칙**: 기존 기능을 깨뜨릴 가능성이 있으면 작은 단위로 쪼갠다. 사용자가 체감하는 개선을 우선한다. 종합 보고서 생성 실패가 상세 분석 표시를 막으면 안 된다.

---

## Claude Code Subagent 매핑

`.claude/agents/`의 각 에이전트가 담당하는 태스크 유형:

| 에이전트 | 트리거 상황 |
| :--- | :--- |
| `pm-prioritizer` | 새 이슈·버그·요청이 들어왔을 때 P0/P1/P2 분류 |
| `pm-requirements` | 기능 기획·요구사항 명세 작성 필요 시 |
| `pm-release-qa` | 배포 전 전체 회귀 테스트·보안 grep |
| `pm-risk-manager` | 주요 변경 전 Pre-Mortem 리스크 식별 |
| `pm-competitive-strategy` | 경쟁사 분석·포지셔닝 전략 수립 필요 시 |
| `pm-qa-validator` | 개별 태스크 완료 직후 빠른 빌드·grep 검증 |
| `backend-security` | CORS·인증 게이트·환경변수 보호 필요 시 |
| `frontend-source-ui` | 출처 탭 UI·sourceQualitySummary 카드 개선 시 |
| `frontend-markdown` | 보고서 Markdown 렌더링·헤딩·테이블 수정 시 |
| `frontend-pricing-ux` | 요금제 페이지·결제 흐름 UX 개선 시 |
| `ai-prompt-reporter` | AI 보고서 메타데이터(모델명·생성시각·fallback) 표시 수정 시 |

---

## 참조 문서

- 공통 원칙: `.agent/SKILL.md`
- 에이전트 정의: `.agent/agents/*.md`
- 스킬 목록: `.claude/skills/*.md` (프로젝트 특화), `.agent/skills/*.md` (기반)
- 워크플로우: `.agent/workflows/*.md`
- 개선 백로그: `.claude/improvement-backlog.md`

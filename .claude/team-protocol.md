# 팀 토론 프로토콜 (Team Discussion Protocol)

이 문서는 6개 팀장 에이전트가 협업할 때 따르는 의사결정 및 토론 절차를 정의합니다.

---

## 팀장 구성 및 역할 요약

| 팀장 | 파일 | 핵심 역할 |
| :--- | :--- | :--- |
| **product-manager** | `.agent/agents/product-manager.md` | 문제 정의, 우선순위(P0/P1/P2), 완료 기준, 법적 요구사항, 릴리즈 계획 |
| **product-designer** | `.agent/agents/product-designer.md` | 정보 구조(IA), 카드/배지 UI, 반응형 레이아웃, 빈/오류/로딩 상태 시각화 |
| **developer-frontend** | `.agent/agents/developer-frontend.md` | React 컴포넌트, SPA 라우팅, 보고서 뷰 안정성, 모바일 반응형, 접근성 |
| **developer-backend** | `.agent/agents/developer-backend.md` | 서버리스 API, JWT/쿠키 인증, Redis 캐시, 보고서 파이프라인, 환경변수 보안 |
| **engineer-ai-prompt** | `.agent/agents/engineer-ai-prompt.md` | 런타임 프롬프트 설계, JSON Schema 출력 강제, 할루시네이션 방지, 토큰 예산 |
| **engineer-financial-data** | `.agent/agents/engineer-financial-data.md` | DART/FMP 연동, corp_code 매칭, 재무 지표 정규화, sourceQuality 연동 |

---

## 기본 토론 순서 (6-Step Protocol)

### 1단계 — PM: 문제 정의 및 우선순위 (product-manager)
- 사용자 문제를 한 문장으로 정의한다.
- 작업을 P0 / P1 / P2로 분류한다.
- 완료 기준(Definition of Done)과 테스트 시나리오를 작성한다.
- 영향 받는 파일과 기능 범위를 추정한다.

### 2단계 — 관련 전문팀 논의
작업 성격에 따라 해당 팀장만 참여한다.

| 작업 성격 | 참여 팀장 |
| :--- | :--- |
| UI/UX 개선 | product-designer → developer-frontend |
| API / 인증 / 캐시 | developer-backend |
| 보고서 품질 / 프롬프트 | engineer-ai-prompt |
| DART / 재무 데이터 | engineer-financial-data |
| 전체 기능 개발 | 전 팀장 순서대로 (PM → Designer → Backend → Frontend → AI/Data) |

### 3단계 — 반대 검토 (Risk Review)
구현 전 모든 팀장이 다음 두 가지를 검토한다.
- **보안 위험**: API Key 노출, JWT 우회, 권한 누락 가능성
- **기존 기능 파괴 위험**: 로그인·회원가입·검색·보고서 생성 흐름 중단 가능성

파괴 위험이 있으면 → 작업을 더 작은 단위로 분할한 뒤 재승인.

### 4단계 — 구현 결정
- 반대 검토를 통과한 최소 수정 계획을 확정한다.
- 관련 스킬 파일(`.agent/skills/`)을 참조한다.
- 관련 워크플로우 파일(`.agent/workflows/`)을 따른다.

### 5단계 — 구현
- 코드 기반으로 판단하고, 추측으로 수정하지 않는다.
- Secret 값(API Key, JWT Secret, Redis Token, Stripe Secret)은 코드·로그·응답에 절대 노출하지 않는다.
- `.env` 파일을 직접 열람하거나 내용을 응답에 포함하지 않는다.
- `TODO` / `placeholder` 같은 미완성 문구를 남기지 않는다.
- `git push`는 자동으로 수행하지 않는다.

### 6단계 — QA (quality-assurance)
모든 구현 완료 후 순서대로 검증한다.
1. `npm run build` 성공 여부 확인
2. `grep` / `Select-String`으로 제거된 코드·문구 잔존 여부 확인
3. 주요 기능 회귀 테스트: 로그인 → 검색 → 보고서 생성 → 보고서 표시 흐름 확인
4. 모바일 반응형 레이아웃 확인
5. 변경 파일 목록 및 검증 결과 보고

---

## 합의 규칙 (Priority & Consensus Rules)

| 우선순위 | 대상 | 결정 원칙 |
| :--- | :--- | :--- |
| **P0** | 보안 취약점 (API Key 노출, JWT 우회, 권한 결함) | 즉시 중단 후 핫픽스 우선 |
| **P0** | 결제 / 인증 시스템 장애 | 모든 작업 중단, 복구 우선 |
| **P1** | 보고서 품질 및 출처 신뢰도 | 기존 흐름 유지하며 점진적 개선 |
| **P1** | 보고서 생성 실패 → 상세 분석 표시 차단 | Partial Success 보장이 필수 |
| **P2** | UI 개선 / 접근성 / 반응형 | 기존 기능 깨지지 않는 범위에서 개선 |

**핵심 원칙**: 기존 기능을 깨뜨릴 가능성이 있으면 작은 단위로 쪼갠다. 종합 보고서 생성 실패가 상세 분석 표시를 막으면 안 된다.

---

## 참조 문서

- 공통 원칙: `.agent/SKILL.md`
- 에이전트 정의: `.agent/agents/*.md`
- 스킬 목록: `.agent/skills/*.md`
- 워크플로우: `.agent/workflows/*.md`

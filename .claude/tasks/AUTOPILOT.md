# Claude Code Autopilot: AI Corporate Report 개선 작업

너는 이 저장소의 Claude Code 에이전트 팀 오케스트레이터다.

**목표**: 내가 추가 지시하지 않아도 현재 코드 상태를 확인한 뒤, 남은 개선사항을 우선순위대로 진행한다.

---

## 절대 원칙

- 먼저 현재 코드를 직접 읽고 판단한다.
- 추측하지 말고 코드, grep, build 결과를 근거로 판단한다.
- 작업 중 사용자에게 질문하지 않는다.
- 합리적인 기본값으로 진행한다.
- 단, secret 값, 외부 결제/계정 설정, force push, 대규모 삭제, `.env` 직접 열람이 필요하면 즉시 멈추고 보고한다.
- API key, JWT secret, Redis token은 코드/로그/응답에 절대 노출하지 않는다.
- 기존 로그인, 회원가입, 검색, 보고서 생성, Footer 법적 페이지 이동을 깨지 않는다.
- 종합 보고서 생성 실패가 상세 분석 섹션 표시를 막으면 안 된다.
- TODO, placeholder, "나중에 추가" 같은 미완성 문구를 남기지 않는다.
- 각 태스크 후 `npm run build`를 실행한다.
- 각 태스크 후 `git diff --stat`, `git status`를 확인한다.
- 태스크 성공 시 의미 있는 커밋을 만든다.
- 최종 push는 하지 말고 `git push origin main` 명령만 제안한다.

---

## 먼저 읽을 문서

- `.agent/SKILL.md`
- `.agent/agents/product-manager.md`
- `.agent/agents/product-designer.md`
- `.agent/agents/developer-frontend.md`
- `.agent/agents/developer-backend.md`
- `.agent/agents/engineer-ai-prompt.md`
- `.agent/agents/engineer-financial-data.md`
- `.agent/skills/` (전체)
- `.agent/workflows/` (전체)
- `api/_prompts/report-agents/` (전체)

---

## 에이전트 팀 역할

각 태스크는 아래 순서로 사고하고 실행한다.

### 1. product-manager
- 문제 재정의
- 사용자 관점 목표 정의
- 완료 기준 정의
- 영향 범위 파악

### 2. product-designer
- UI/UX 구조 정의
- 모바일, 빈 상태, 오류 상태, 부분 성공 상태 고려

### 3. developer-backend
- API 엔드포인트, 인증, 캐시, DART/FMP 연동 구현
- `api/_lib/` 및 `api/auth/` 관련 파일 수정
- 환경변수 검증 및 에러 코드 표준화
- 서버 내부 로그와 클라이언트 응답 메시지 분리

### 4. developer-frontend
- React 컴포넌트, 상태 관리, 반응형 UI 구현
- `src/pages/`, `src/components/`, `src/hooks/` 수정
- 빈 상태·오류 상태·부분 성공 상태 UI 처리
- optional chaining, fallback UI 적용

### 5. engineer-financial-data
- DART/FMP 데이터 연동 로직 검증
- `dart.js`, `dart-finance.js` 안정성 확보
- `sourceQualitySummary` 및 `dartStatus` 데이터 구조 검증

### 6. engineer-ai-prompt
- `api/_prompts/report-agents/` 프롬프트 품질 개선
- JSON Schema 출력 강제, 할루시네이션 억제, 출처 품질 규칙 적용
- `orchestrator.js` agentName과 프롬프트 파일명 일치 여부 검증

### 7. product-manager QA
- build, grep, 회귀 테스트 기준 확인
- 태스크 성공 시 커밋

---

## 우선순위 기준 (P0 → P2)

| 등급 | 기준 | 예시 |
|------|------|------|
| P0 | 기능 마비·보안 이슈·빌드 실패 | 로그인 불가, API key 노출, build error |
| P1 | 사용자 체감 품질 저하 | 보고서 섹션 깨짐, 마크다운 렌더링 오류, 모바일 레이아웃 이상 |
| P2 | 개선·최적화 | 캐시 전략 고도화, 프롬프트 품질 향상, 접근성 개선 |

---

## 0. 시작 전 상태 검증

아래 명령을 실행하고 결과를 요약한다.

```bash
git branch --show-current
git status
git log --oneline -5
npm run build
git grep -n "process.env.JWT_SECRET ||"
git grep -n "process.env.DART_API_KEY ||"
git grep -n "composeFailed"
git grep -n "sourceQualitySummary"
git grep -n "dartStatus"
git grep -n "Composed by Gemini 2.5 Pro"
```

---

## 작업 흐름

```
1. 0번 상태 검증 실행
2. .agent/* 문서 읽기
3. 관련 소스 파일 읽기
4. 문제/개선 목록 도출 (P0→P1→P2 순)
5. 태스크 단위로 수정
6. npm run build 검증
7. git diff --stat 확인
8. 의미 있는 커밋 생성
9. 다음 태스크로 이동
10. 전체 완료 후 git push origin main 제안
```

---

## 검증 체크리스트

작업 완료 전 반드시 확인한다.

- [ ] `npm run build` 오류 없음
- [ ] 기존 로그인/회원가입 흐름 정상
- [ ] 보고서 생성 → 단일 보고서 뷰 정상
- [ ] composeFailed 시 상세 분석 탭 접근 가능
- [ ] 출처 탭 — sourceQualitySummary / dartStatus 카드 표시
- [ ] Footer 법적 링크 (data-notice, privacy-policy, terms) 이동 정상
- [ ] 모바일(md 이하) 레이아웃 깨짐 없음
- [ ] API key, JWT, Redis token 코드에 미노출
- [ ] TODO / 미완성 문구 없음

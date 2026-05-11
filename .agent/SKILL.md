# 공통 개발 원칙 및 스킬 인덱스

이 문서는 프로젝트의 모든 개발용 에이전트가 공통으로 준수해야 할 원칙과 사용 가능한 스킬 목록을 관리합니다.

## 공통 개발 원칙

- **코드 기반 판단**: 관련 파일을 먼저 읽고 현재 구현된 코드와 실행 결과를 근거로 작업한다.
- **최소 변경 원칙**: 기능을 깨지 않는 범위 내에서 가장 명확하고 간결한 수정을 우선한다.
- **보안 및 환경변수**: API Key, JWT Secret 등 민감 정보는 절대 코드나 로그에 노출하지 않는다.
- **부분 성공(Partial Success)**: 보고서 생성 등 다단계 작업 시 일부 실패가 전체 기능 마비로 이어지지 않게 설계한다.
- **품질 검증**: 모든 작업 완료 후 `npm run build`와 주요 기능 회귀 테스트를 수행한다.
- **사용자 경험**: 모바일 반응형, 웹 접근성, 오류 상황에 대한 친절한 UI 안내를 필수적으로 고려한다.

## 전체 스킬 목록 (Skills Index)

| 스킬명 | 설명 | 관련 에이전트 |
| :--- | :--- | :--- |
| [security-env](skills/security-env.md) | 보안, 환경변수, Secret 관리 | Backend, Data |
| [vercel-deployment](skills/vercel-deployment.md) | Vercel 배포 및 서버리스 최적화 | Backend |
| [auth-session](skills/auth-session.md) | JWT, 쿠키, 로그인/회원가입 세션 관리 | Backend |
| [backend-api](skills/backend-api.md) | API 설계, 표준 응답 및 에러 핸들링 | Backend |
| [redis-cache](skills/redis-cache.md) | Redis/Upstash 캐싱 및 데이터 저장 | Backend |
| [report-pipeline](skills/report-pipeline.md) | 보고서 생성 다단계 파이프라인 관리 | Backend, AI, PM |
| [dart-fmp-data](skills/dart-fmp-data.md) | DART/FMP 데이터 연동 및 정제 | Data |
| [source-quality](skills/source-quality.md) | 데이터 출처 신뢰도 평가 및 필터링 | AI, Data, PM |
| [frontend-react-ui](skills/frontend-react-ui.md) | React 컴포넌트 및 UI 상태 구현 | Frontend, Designer |
| [report-ui](skills/report-ui.md) | 보고서 상세 화면 및 시각화 UI | Frontend, Designer |
| [prompt-llm](skills/prompt-llm.md) | LLM 프롬프트 설계 및 분석 품질 최적화 | AI |
| [qa-build-grep](skills/qa-build-grep.md) | 빌드 테스트 및 코드 검색 검증 | 공통 |
| [product-planning](skills/product-planning.md) | 요구사항 정의 및 우선순위 관리 | PM, Designer |
| [legal-trust](skills/legal-trust.md) | 법적 고지, 약관 및 사용자 신뢰 관리 | PM, Frontend, Designer |

## 디렉토리 구조 및 규칙

- **`.agent/agents/`**: 실제 작업을 수행하는 **개발 전용 에이전트** 정의 (페르소나).
- **`.agent/skills/`**: 에이전트들이 공통으로 참조하는 **실행 지침 및 규칙**(Skill).
- **`api/_prompts/report-agents/`**: 실제 서비스 가동 중 보고서 생성 시에만 사용되는 **런타임 프롬프트**.
- **주의**: 개발용 에이전트 지침과 런타임 보고서 프롬프트를 혼동하여 수정하지 않도록 주의한다.

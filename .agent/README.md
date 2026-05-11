# Agent Directory Structure

이 프로젝트는 에이전트 파일을 용도에 따라 두 개의 디렉토리로 분리하여 관리합니다.

## 1. `.agent/agents/` (개발 전용)
- **용도**: 프로젝트 개발, 아키텍처 설계, 코드 리뷰 등 개발 단계에서 AI 어시스턴트(페르소나)로 사용되는 에이전트 정의 파일입니다.
- **주요 파일**:
  - `developer-backend.md`
  - `developer-frontend.md`
  - `engineer-ai-prompt.md`
  - `engineer-financial-data.md`
  - `product-designer.md`
  - `product-manager.md`

## 2. `api/_prompts/report-agents/` (보고서 생성 전용)
- **용도**: 웹사이트 서비스에서 실제 기업 분석 보고서를 생성할 때 파이프라인(Stage 1~3)에서 호출되는 실행용 에이전트 프롬프트입니다.
- **필수 에이전트**: `resolver`, `analyst-financial`, `analyst-strategy`, `analyst-news`, `critic`, `composer`
- **로직**: `api/_lib/prompts.js`에서 이 폴더의 파일들을 읽어와 검증 후 사용합니다.

---

### 주의사항
- 보고서 생성용 에이전트를 수정할 경우 반드시 `api/_prompts/report-agents/` 내의 파일을 수정해야 서비스에 반영됩니다.
- 필수 에이전트가 누락될 경우 서비스 구동 시 에러가 발생합니다.

# 품질 보증 및 코드 검증 (QA & Build & Grep)

## 목적
코드의 변경 사항이 시스템 전체에 미치는 영향을 파악하고, 실수를 사전에 방지하여 고품질의 결과물을 유지하기 위함입니다.

## 언제 사용하나
- 코드를 수정하고 커밋하기 전
- 새로운 에이전트 지침을 적용하거나 대규모 리팩토링을 수행한 후
- 민감한 정보의 노출 여부를 확인해야 할 때

## 관련 파일
- `package.json`
- 전체 코드베이스
- `.gitignore`
- `.env.example`

## 핵심 규칙
- 작업 완료 후 반드시 `npm run build`를 실행하여 빌드 오류를 확인한다.
- `git status`와 `git diff --stat`을 통해 의도하지 않은 파일 변경을 방지한다.
- `grep` 또는 `Select-String`을 사용하여 하드코딩된 Secret이나 특정 키워드를 검색한다.
- 윈도우 환경에서는 `findstr`의 동작 특성을 고려하여 `git grep` 사용을 권장한다.
- 주요 기능(로그인, 검색, 보고서 생성)의 회귀 테스트를 수행한다.
- 환경변수 예시 파일(`.env.example`)이 실제 코드와 동기화되어 있는지 확인한다.

## 검증 방법
- `npm run build`
- `git status`
- `git grep -n "process.env.JWT_SECRET ||"`
- `git grep -n "composeFailed"`
- `git grep -n "sourceQualitySummary"`

## 흔한 실수
- 빌드 테스트 없이 커밋하여 CI/CD 파이프라인을 깨뜨리는 경우
- 디버깅용으로 작성한 `console.log`나 테스트용 코드를 삭제하지 않는 경우
- 변경된 파일 목록을 정확히 파악하지 못해 관련 기능을 누락시키는 경우

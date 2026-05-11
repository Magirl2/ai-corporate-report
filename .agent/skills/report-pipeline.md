# 보고서 생성 파이프라인 관리 (Report Pipeline)

## 목적
다단계(Stage 1/2/3)로 구성된 복잡한 보고서 생성 과정을 안정적으로 제어하고, 일부 실패 시에도 사용자에게 가치 있는 정보를 전달하기 위함입니다.

## 언제 사용하나
- 보고서 생성 로직을 수정하거나 파이프라인 단계를 추가할 때
- 생성 과정 중의 타임아웃이나 모델 에러를 처리할 때
- 부분 성공(Partial Success) UI를 구현하거나 수정할 때

## 관련 파일
- `api/_lib/orchestrator.js`
- `api/_lib/handlers/report/search.js`, `output.js`, `compose.js`
- `src/api/companyService.js`
- `src/hooks/useSingleReport.js`
- `src/pages/SingleReportView.jsx`

## 핵심 규칙
- Stage 1(Search), Stage 2(Analyze), Stage 3(Compose)의 순차적 흐름을 유지한다.
- 각 단계의 결과물은 독립적으로 식별 가능해야 한다 (`stage1Id`, `stage2Id`).
- 최종 `compose` 단계가 실패하더라도 이전 단계의 분석 데이터는 조회 가능해야 한다 (Partial Success).
- `metadata.composeFailed`와 `debug.isPartialResult` 값을 정확히 설정한다.
- 에이전트별 발생 에러를 `agentErrors` 객체로 통합 관리한다.
- 보고서 본문이 비어 있을 경우 적절한 폴백 문구를 표시한다.

## 검증 방법
- 의도적으로 Stage 3를 실패시킨 후 `SingleReportView`에서 상세 분석 탭이 표시되는지 확인
- 종합 보고서 탭에서 실패 안내 메시지가 정상적으로 노출되는지 확인
- `npm run build` 성공 확인

## 흔한 실수
- 한 단계만 실패해도 전체 보고서가 '실패' 처리되어 데이터를 아예 보지 못하게 만드는 경우
- 이전 단계의 데이터를 다음 단계로 넘길 때 데이터 형식이 깨지는 경우
- 타임아웃 처리가 누락되어 무한 대기에 빠지는 경우

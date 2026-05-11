# 보고서 상세 화면 UI 구현 (Report UI)

## 목적
복잡한 분석 결과를 사용자가 이해하기 쉬운 형태로 시각화하고, 고도화된 보고서 열람 경험을 제공하기 위함입니다.

## 언제 사용하나
- `SingleReportView` 화면의 레이아웃이나 탭 구성을 수정할 때
- 분석 데이터 시각화 컴포넌트나 배지 시스템을 추가할 때
- 부분 성공(Partial Success) 상태의 UI 안내를 강화할 때

## 관련 파일
- `src/pages/SingleReportView.jsx`
- `src/utils/displayHelpers.jsx`
- `src/api/companyService.js`
- `src/hooks/useSingleReport.js`

## 핵심 규칙
- 종합 보고서, 상세 분석, 출처 탭의 데이터 분리 및 렌더링 로직을 유지한다.
- `composeFailed` 상황에서도 상세 분석 데이터를 볼 수 있도록 UI를 구성한다.
- DART 수집 상태와 `sourceQualitySummary`를 전용 카드로 시각화한다.
- 신뢰 등급별 배지(`high`, `medium`, `low`, `unverified`)를 일관되게 사용한다.
- 분석 근거가 되는 출처를 그룹화하여 가독성을 높인다.
- Markdown 렌더링 품질을 관리하고 표, 링크, 출처 ID가 깨지지 않게 한다.
- 외부 링크 클릭 시 반드시 새 탭으로 열리도록 설정한다.

## 검증 방법
- 종합 보고서 데이터가 없을 때 상세 분석 탭으로 자동 이동하거나 안내가 뜨는지 확인
- 출처가 없는 경우의 폴백 UI 확인
- 모바일 환경에서의 카드 레이아웃 정렬 확인

## 흔한 실수
- 긴 Markdown 리포트가 컨테이너를 벗어나거나 가독성이 떨어지는 경우
- 출처 링크 클릭 시 현재 페이지가 바뀌어 분석 흐름이 끊기는 경우
- 배지 색상만으로 신뢰도를 표현하여 색약 사용자가 구분하기 어려운 경우

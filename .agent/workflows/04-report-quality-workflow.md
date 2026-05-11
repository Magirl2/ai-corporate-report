# 보고서 품질 개선 워크플로우

## 목적
종합 보고서와 개별 섹션 보고서의 품질, 출처, 구조, 신뢰도를 개선한다.

## 참여 순서
1. product-manager
2. engineer-ai-prompt
3. engineer-financial-data
4. developer-backend
5. developer-frontend
6. product-designer

## 단계별 역할

### product-manager
- 개선 목표를 정의한다.
- 예: 종합 보고서 품질, 출처 신뢰도, 개별 섹션 미표시 문제
- 완료 기준을 정한다.

### engineer-ai-prompt
- report-agents 프롬프트를 점검한다.
- composer 구조를 개선한다.
- sourceId, sourceQualitySummary, DART/FMP 근거 사용 규칙을 강화한다.
- 출처 없는 단정과 투자 권유 표현을 막는다.

### engineer-financial-data
- DART/FMP 데이터가 실제 입력에 포함되는지 확인한다.
- corp_code 매칭과 재무 지표를 검증한다.
- metadata.dartStatus를 확인한다.

### developer-backend
- Stage 1/2/3 파이프라인을 점검한다.
- composeFailed partial success를 유지한다.
- finalData.metadata와 sources 구조를 안정화한다.

### developer-frontend
- SingleReportView에서 종합/상세/출처 탭을 안정적으로 표시한다.
- markdown empty일 때도 상세 분석 탭을 보여준다.

### product-designer
- 보고서가 전문 문서처럼 보이도록 정보 구조와 UI를 개선한다.

## 중요 원칙
- 종합 보고서 실패가 개별 섹션 표시를 막으면 안 된다.
- 고품질 출처를 우선 사용한다.
- DART/FMP/공식 IR을 재무 근거로 우선한다.
- low/unverified 출처는 핵심 주장에 사용하지 않는다.

## 완료 기준
- 종합 보고서 구조가 일관된다.
- 상세 분석 탭이 안정적으로 표시된다.
- 출처와 한계가 명확히 표시된다.
- npm run build 성공

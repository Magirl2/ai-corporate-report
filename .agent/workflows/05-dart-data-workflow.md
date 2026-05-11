# DART/FMP 데이터 워크플로우

## 목적
DART/FMP 데이터가 수집, 정제, 보고서 반영, UI 표시까지 이어지도록 관리한다.

## 주 담당
- engineer-financial-data

## 보조 담당
- developer-backend
- developer-frontend
- engineer-ai-prompt

## 처리 순서
1. DART_API_KEY 환경변수 확인
2. 직접 API 호출 테스트
3. corp_code 매칭 확인
4. disclosures 조회 확인
5. finance 조회 확인
6. orchestrator engineResolve / engineData 반영 확인
7. finalData.metadata.dartStatus 확인
8. SingleReportView 표시 확인
9. composer가 DART 데이터를 실제 근거로 쓰는지 확인

## 직접 테스트 API
- /api/data/dart?corp_code=00126380
- /api/data/dart-finance?corp_code=00126380

## 테스트 기업
- 삼성전자
- 005930
- 대덕전자
- 두산로보틱스
- 존재하지 않는 회사명

## metadata.dartStatus 확인 항목
- attempted
- apiKeyPresent
- inputCompanyName
- resolvedCorpCode
- resolvedCorpName
- stockCode
- corpCodeResolved
- disclosuresCount
- financeAvailable
- financeYears
- warnings
- errors

## 실패 원인 분류
- DART_API_KEY 없음
- corp_code 매칭 실패
- disclosures 빈 배열
- finance 데이터 없음
- 외부 API 오류
- 보고서에는 들어갔지만 UI에 표시 안 됨
- composer가 근거로 사용하지 않음

## 완료 기준
- DART 직접 API 정상
- 보고서 metadata에 dartStatus 존재
- DART 사용/미사용 사유가 UI에 표시
- 재무 분석에 DART/FMP 데이터 반영
- npm run build 성공

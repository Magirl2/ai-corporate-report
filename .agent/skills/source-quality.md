# 출처 신뢰도 평가 및 관리 (Source Quality)

## 목적
다양한 데이터 출처의 신뢰도를 평가하여 분석 결과의 정확성을 높이고 사용자에게 투명한 정보를 제공하기 위함입니다.

## 언제 사용하나
- 새로운 뉴스나 데이터 소스를 추가할 때
- 보고서 생성 프롬프트에서 출처 사용 정책을 정의할 때
- 출처별 신뢰 등급(Tier)을 조정해야 할 때

## 관련 파일
- `api/_lib/sourceQuality.js`
- `api/_lib/orchestrator.js`
- `composer.md` (보고서 생성 에이전트)
- `src/pages/SingleReportView.jsx`

## 핵심 규칙
- `sourceQuality.js`의 평가 로직에 따라 모든 소스에 점수를 부여한다.
- 공식 공시(DART, SEC, KRX) 및 공식 IR 사이트를 최우선 소스로 취급한다.
- 주요 글로벌 경제 매체(Bloomberg, Reuters, FT 등)를 전문 소스로 우대한다.
- 블로그, 커뮤니티, SNS, 위키 등 검증되지 않은 소스는 핵심 근거에서 배제한다.
- `qualityScore`와 `qualityTier`를 기반으로 소스의 신뢰성을 분류한다.
- `sourceQualitySummary`를 생성하여 사용자에게 전체적인 데이터 품질을 보고한다.
- 신뢰도가 낮은 출처는 사실 단정의 근거로 사용하지 않도록 프롬프트로 제어한다.

## 검증 방법
- `finalData.sources` 내에 `qualityScore`, `qualityTier`, `reliability` 값이 포함되었는지 확인
- `sourceQualitySummary`가 보고서 데이터에 포함되어 있는지 확인
- 신뢰도 낮은 출처가 핵심 주장의 유일한 근거가 아닌지 검토

## 흔한 실수
- 단순 뉴스 어그리게이터나 자극적인 찌라시 사이트를 전문 매체와 동일하게 취급하는 경우
- 출처 점수 계산 로직에서 특정 도메인을 누락하여 점수가 0점으로 나오는 경우
- 출처의 신뢰도가 낮음에도 불구하고 "확실하다"는 표현을 사용하는 경우

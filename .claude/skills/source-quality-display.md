---
name: source-quality-display
description: 출처 품질 등급(high/medium/low/blocked)을 사용자에게 시각적으로 표시하는 UI 패턴
type: skill
---

# Skill: source-quality-display

## 핵심 원칙
- 백엔드가 설정한 `type`, `qualityTier`, `qualityScore`를 항상 우선 사용한다 (nullish coalescing `??` 패턴)
- 프론트 자체 분류는 백엔드 값이 없는 경우에만 폴백으로 사용한다
- 5개 tier를 모두 표시한다: high, medium, low, blocked, total

## 도메인 목록 관리
- `DOMAIN_TIERS` 단일 객체로 관리 (5개 별도 배열 금지)
- 백엔드 `api/_lib/sourceQuality.js`의 `DOMAIN_TIERS`와 동일한 키/값을 유지한다

## 시각적 기준
- high: 에메랄드 (#10b981) — 공식 공시, 글로벌 금융
- medium: 블루 (#3b82f6) — 국내 금융, 전문 데이터
- low: 앰버 (#f59e0b) — 일반 검색
- blocked: 레드 (#ef4444) — SNS, 블로그, 위키 등

## 품질 요약 카드 (SourceQualitySummaryCard)
- total / high / medium / low / blocked 5개 수치를 모두 표시
- preferredRatio 진행 막대: ≥80% 에메랄드, ≥50% 블루, <50% 앰버
- warning이 있을 때 앰버 배너 최상단 표시

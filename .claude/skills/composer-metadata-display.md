---
name: composer-metadata-display
description: AI composer 모델명 및 생성 메타데이터를 사용자 친화적으로 표시하는 패턴
type: skill
---

# Skill: composer-metadata-display

## 모델명 포맷 규칙
| API 모델 ID              | 표시 이름             |
|--------------------------|----------------------|
| gemini-2.5-pro           | Gemini 2.5 Pro       |
| gemini-2.5-flash         | Gemini 2.5 Flash     |
| gemini-2.5-flash-lite    | Gemini 2.5 Flash Lite|
| 기타 / 미설정            | AI 분석 모델         |

## generatedAt 설정 위치
- orchestrator의 `assembleFinalReport()` 내에서 `metadata.generatedAt = new Date().toISOString()`으로 설정
- 기존 `createdAt` (top-level)과 중복되나 metadata에서도 직접 접근 가능하도록 추가

## fallback 표시 규칙
- `composerFallbackUsed === true` 시: 모델명 옆에 `(폴백)` 표시 또는 아이콘으로 표시
- 사용자가 불안해하지 않도록 neutral 톤 유지

## 표시 위치 (SingleReportView.jsx)
- 상세분석 탭 내 AI 종합 보고서 헤더 (line ~701)
- 종합 보고서 탭 헤더 (line ~742)

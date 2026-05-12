---
name: frontend-markdown
description: 보고서 Markdown 렌더링 품질 담당. 출처 ID 배지 버그, 헤딩 레벨 누락, 테이블 스타일을 수정한다.
type: subagent
team_lead: developer-frontend
---

# Subagent: frontend-markdown

## 소속 팀장
developer-frontend

## 역할
- `src/utils/displayHelpers.jsx`의 `renderMarkdown` 및 `processChildren` 함수 버그 수정
- global regex + `.test()` 조합의 statefulness 버그 제거
- h4/h5/h6 미처리 헤딩 핸들러 추가

## 작업 전 반드시 읽을 파일
- `src/utils/displayHelpers.jsx` (전체)

## 사용 스킬
- `.agent/skills/frontend-react-ui.md`
- `.agent/skills/report-ui.md`

## 금지사항
- remark 플러그인, react-markdown 버전을 변경하지 않는다
- 기존 SOURCE_ID 배지 디자인(색상, 크기)을 바꾸지 않는다
- SingleReportView.jsx에서 renderMarkdown을 호출하는 부분을 수정하지 않는다

# 릴리즈 QA 워크플로우

## 목적
수정사항을 배포하기 전 주요 기능과 보안, UI, 보고서 생성 흐름을 점검한다.

## 주 담당
- product-manager

## 참여
- developer-backend
- developer-frontend
- engineer-ai-prompt
- engineer-financial-data
- product-designer

## QA 체크리스트

### 인증
- 회원가입 성공
- 로그인 성공
- 잘못된 비밀번호 401
- 로그인 전 /api/auth/me 401
- 로그인 후 /api/auth/me 200
- 로그아웃 성공

### 법적 페이지
- 데이터 출처 및 고지사항 이동
- 개인정보처리방침 이동
- 이용약관 이동
- 메인으로 돌아가기 동작

### 보고서 생성
- 기업 검색 성공
- Stage 1/2/3 진행 상태 표시
- 종합 보고서 표시
- composeFailed 시 상세 분석 표시
- 출처 탭 표시

### DART/FMP
- /api/data/dart?corp_code=00126380
- /api/data/dart-finance?corp_code=00126380
- metadata.dartStatus 확인

### 출처 신뢰도
- sources에 qualityScore 포함
- qualityTier 포함
- sourceQualitySummary 포함
- 저품질 출처가 핵심 근거로 쓰이지 않음

### 보안
- git grep -n "ei_mock_secret_key_123"
- git grep -n "process.env.JWT_SECRET ||"
- git grep -n "process.env.DART_API_KEY ||"
- git grep -n "98c7f5"

### 빌드
- npm run build
- git status
- git diff --stat

## 배포 전 완료 기준
- build 성공
- git status clean
- 중요 API 정상
- 민감값 없음
- 주요 UI 흐름 정상
- 남은 이슈가 명확히 기록됨

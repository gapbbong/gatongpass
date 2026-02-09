# Google Apps Script 배포 가이드

## 1단계: Google Sheets 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성
3. 이름: "가통패스 마스터 데이터베이스"

## 2단계: Apps Script 설정

1. 메뉴: **확장 프로그램** > **Apps Script**
2. 기본 코드 삭제
3. `d:\App\gatongpass\gas\Code.gs` 파일 내용 전체 복사
4. Apps Script 에디터에 붙여넣기
5. 저장 (Ctrl+S)

## 3단계: 스크립트 속성 설정

1. Apps Script 에디터에서: **프로젝트 설정** (톱니바퀴 아이콘)
2. **스크립트 속성** 섹션으로 스크롤
3. **스크립트 속성 추가** 클릭
4. 속성 추가:
   - 속성: `API_KEY`
   - 값: `gatong_api_key_2025` (원하는 키로 변경 가능)

## 4단계: 웹 앱 배포

1. Apps Script 에디터 우측 상단: **배포** > **새 배포**
2. 설정:
   - **유형 선택**: 웹 앱
   - **설명**: "가통패스 API v1"
   - **다음 계정으로 실행**: 나
   - **액세스 권한**: **모든 사용자** (중요!)
3. **배포** 클릭
4. 권한 승인:
   - Google 계정 선택
   - "고급" 클릭
   - "가통패스 API(안전하지 않음)로 이동" 클릭
   - "허용" 클릭
5. **웹 앱 URL** 복사 (예: `https://script.google.com/macros/s/AKfycbz.../exec`)

## 5단계: 프론트엔드 설정

1. `d:\App\gatongpass\.env.local` 파일 열기
2. `NEXT_PUBLIC_GAS_API_URL` 값을 복사한 URL로 교체
3. 필요시 `NEXT_PUBLIC_GAS_API_KEY`와 `NEXT_PUBLIC_SCHOOL_SECRET` 변경
4. 저장

## 6단계: 테스트

1. 개발 서버 재시작: `npm run dev`
2. 브라우저에서 제출 테스트
3. Google Sheets로 돌아가서 데이터 확인

## 문제 해결

### "Unauthorized" 오류
- `.env.local`의 API 키가 GAS 스크립트 속성의 API_KEY와 일치하는지 확인

### "Too many requests" 오류
- Rate Limiting 작동 중 (정상)
- 1분 후 다시 시도

### 데이터가 시트에 기록되지 않음
- Apps Script 로그 확인: **실행** > **실행 로그**
- 권한 문제일 수 있음: 재배포 시도

### CORS 오류
- GAS 배포 시 "액세스 권한"을 "모든 사용자"로 설정했는지 확인

## 보안 강화 (선택사항)

### API 키 변경
1. Apps Script 스크립트 속성에서 `API_KEY` 값 변경
2. `.env.local`에서 `NEXT_PUBLIC_GAS_API_KEY` 값도 동일하게 변경

### School Secret 변경
1. `.env.local`에서 `NEXT_PUBLIC_SCHOOL_SECRET` 값을 복잡한 문자열로 변경
2. 이 값은 학교별 토큰 생성에 사용됨

## 다음 단계

GAS 배포가 완료되면:
1. ✅ 학생 제출 페이지에서 GAS 연동 테스트
2. ✅ 관리자 대시보드에서 제출 현황 조회
3. ✅ 선생님 수정 기능 테스트
4. ✅ 재제출 링크 생성 테스트

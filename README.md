# GatongPass (가통패스) - 학교 가정통신문 온라인 제출 및 관리 서비스

## 1. 개요
- **목적:** 학교 가정통신문을 온라인으로 배포하고, 학문모/학생의 응답(참석 여부 등)을 수집 및 관리하는 웹 서비스
- **타겟 유저:** (PC 위주) 교사 / (모바일 위주) 학생 및 학부모
- **확장 계획:** 추후 유료 판매(SaaS) 예정, 결제 기능은 추후 구현

## 2. 핵심 기능

### 선생님용 대시보드 (PC/반응형)
- **UI 레이아웃:** 3단~4단 분할 구조 (목록, 뷰어, 설정/현황)
- **PDF 미리보기:** 등록된 가정통신문의 PDF 미리보기 지원
- **실시간 통계:** 응답 결과(참석/불참 등) 실시간 집계 및 시각화
- **조작 편의성:** 키보드 단축키 지원 (Enter, Space, ESC 등)
- **데이터 연동:** 수집된 결과는 구글 스프레드시트(Google Sheets)로 내보내기/열람 가능
- **공유 권한:** 교무실 내 통합 조회 권한 제공

### 관리자/초기 세팅
- **학교 등록:** 지역/학교급/학교명 검색 및 입력
- **학급 구성:** 학년별 반 개수 일괄 설정 가능

### 학생/학부모용 페이지 (모바일 최적화)
- **접속:** 고유 링크(카카오톡, 밴드 등)를 통한 간편 접속
- **입력:** 학년/반/이름 선택 (오입력 방지 UX 적용)
- **수정:** 기 제출된 내용 수정 가능

## 3. 기술 스택
- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** Supabase
- **Styling:** Tailwind CSS / Framer Motion
- **Language:** TypeScript

## 4. 시작하기

### 환경 변수 설정
`.env.local` 파일을 생성하고 다음 정보를 입력하세요:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 개발 서버 실행
```bash
npm install
npm run dev
```
 http://localhost:3000 에서 결과를 확인하실 수 있습니다.

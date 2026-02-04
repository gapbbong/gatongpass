# Supabase 데이터베이스 스키마 설계

내일 학교에서 Supabase SQL Editor에 복사하여 붙여넣으시면 됩니다.

```sql
-- 1. 학생(Students) 테이블 생성
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade INTEGER NOT NULL,
    class_num INTEGER NOT NULL,
    student_num INTEGER NOT NULL,
    name TEXT NOT NULL,
    passcode TEXT NOT NULL, -- 담임 선생님이 설정할 4자리 비밀번호 등
    dept TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(grade, class_num, student_num) -- 중복 등록 방지
);

-- 2. 서명(Signatures) 테이블 고도화
CREATE TABLE IF NOT EXISTS signatures (
    id BIGSERIAL PRIMARY KEY,
    doc_name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    class_num INTEGER NOT NULL,
    student_num INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    parent_name TEXT,
    signature_data TEXT NOT NULL, -- Base64 PNG 이미지
    survey_response JSONB, -- 항목별 설문 결과 (참석/불참 등)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doc_name, grade, class_num, student_num)
);

-- 3. 보안 정책 (RLS) 설정
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert signatures" ON signatures FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read signatures" ON signatures FOR SELECT USING (true);
```

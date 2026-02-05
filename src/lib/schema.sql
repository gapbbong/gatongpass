-- documents 테이블 생성 (가정통신문 관리용)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'action', -- 'action' (서명), 'notice' (안내)
    path TEXT NOT NULL, -- Storage public URL
    status TEXT NOT NULL DEFAULT 'ongoing',
    deadline TIMESTAMP WITH TIME ZONE,
    form_schema JSONB DEFAULT '[]', -- [ { id, type, label, options, required } ]
    total_count INTEGER DEFAULT 30,
    submitted_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 정책 (선생님/학생 공통)
CREATE POLICY "Allow public read documents" ON documents FOR SELECT USING (true);

-- 누구나 삽입 가능 정책 (실제 서비스에서는 인증된 선생님만 가능하도록 수정 필요)
CREATE POLICY "Allow public insert documents" ON documents FOR INSERT WITH CHECK (true);

-- 누구나 수정 가능 정책 (제출 수 증가 등)
CREATE POLICY "Allow public update documents" ON documents FOR UPDATE USING (true);

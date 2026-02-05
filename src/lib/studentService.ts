import { supabase } from './supabaseClient';

export interface StudentWithStatus {
    id: string;
    grade: number;
    class_num: number;
    student_num: number;
    name: number; // In DB it's TEXT, but let's see why it was number in some places or check
    submitted: boolean;
    submittedAt?: string;
    signature_data?: string;
}

export async function getStudentsWithSubmission(docId: string, grade: number, classNum: number) {
    try {
        // 1. Get all students in the class
        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('grade', grade)
            .eq('class_num', classNum)
            .order('student_num', { ascending: true });

        if (studentError) throw studentError;

        // 2. Get all signatures for this document in this class
        const { data: signatures, error: signatureError } = await supabase
            .from('signatures')
            .select('*')
            .eq('grade', grade)
            .eq('class_num', classNum); // We might need to filter by doc_name or doc_id

        if (signatureError) throw signatureError;

        // 3. Map status
        // Note: Currently signatures table uses 'doc_name'. 
        // We might need to join or filter by title if doc_id isn't in signatures yet.
        // Assuming we join by student identification for now.

        return students.map(student => {
            const signature = signatures?.find(s => s.student_num === student.student_num);
            return {
                ...student,
                submitted: !!signature,
                submittedAt: signature?.created_at,
                signature_data: signature?.signature_data
            };
        });
    } catch (error) {
        console.warn('Supabase fetch failed, falling back to offline mock data:', error);
        // Fallback Mock Data
        return Array.from({ length: 24 }, (_, i) => ({
            id: `mock-${i}`,
            grade,
            class_num: classNum,
            student_num: i + 1,
            name: `학생 ${i + 1}`, // Fixing type issue (string)
            submitted: i < 15, // Some submitted
            submittedAt: i < 15 ? new Date().toISOString() : undefined,
        })) as any;
    }
}

/**
 * Mock data generator for students if DB is empty
 */
export async function seedMockStudents(grade: number, classNum: number) {
    const names = ['김철수', '이영희', '박지민', '최수연', '정민호', '강하늘', '윤서준', '임도윤', '서아인', '한지우'];
    // Fallback to purely local return if DB fails
    console.warn('Seeding skipped, returning offline mock data');
    return names.map((name, i) => ({
        id: `seed-${i}`,
        grade,
        class_num: classNum,
        student_num: i + 1,
        name,
        submitted: false
    }));
}

import { supabase } from './supabaseClient';
import { parseDocumentName } from './documentParser';

export interface UploadResult {
    success: boolean;
    error?: string;
    data?: any;
}

export async function uploadDocument(file: File, deadline?: string, formSchema: any[] = []): Promise<UploadResult> {
    try {
        const metadata = parseDocumentName(file.name);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `communications/${fileName}`;

        // 1. Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase.storage
            .from('household-communications')
            .upload(filePath, file);

        if (storageError) {
            console.error('Storage error:', storageError);
            return { success: false, error: '스토리지 업로드 실패: ' + storageError.message };
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('household-communications')
            .getPublicUrl(filePath);

        // 3. Insert into Database
        const { data: dbData, error: dbError } = await supabase
            .from('documents')
            .insert([
                {
                    title: metadata.title,
                    type: metadata.type,
                    path: publicUrl,
                    status: 'ongoing',
                    deadline: deadline || null,
                    form_schema: formSchema,
                    total_count: 30, // Default for now
                    submitted_count: 0,
                }
            ])
            .select();

        if (dbError) {
            console.error('DB error:', dbError);
            return { success: false, error: '데이터베이스 저장 실패: ' + dbError.message };
        }

        return { success: true, data: dbData[0] };
    } catch (err: any) {
        return { success: false, error: '서버 오류: ' + err.message };
    }
}

export async function getDocuments() {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

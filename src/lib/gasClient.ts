/**
 * Google Apps Script API Client
 * 
 * 프론트엔드에서 GAS 백엔드와 통신하기 위한 클라이언트 라이브러리
 */

// ============================================
// Types
// ============================================

export interface SubmissionData {
    sheetId: string;
    headers?: string[];
    formFields?: string[];
    values: any[];
    studentInfo: {
        grade: number;
        class: number;
        number: number;
        name: string;
    };
}

export interface UpdateData {
    sheetId: string;
    submissionId: number;
    values: any[];
    reason: string;
    editor: string;
}

export interface GASResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    timestamp: string;
}

// ============================================
// Configuration
// ============================================

const GAS_CONFIG = {
    apiUrl: process.env.NEXT_PUBLIC_GAS_API_URL || '',
    apiKey: process.env.NEXT_PUBLIC_GAS_API_KEY || '',
    schoolSecret: process.env.NEXT_PUBLIC_SCHOOL_SECRET || '',
};

// ============================================
// Helper Functions
// ============================================

/**
 * 학교 토큰 생성
 */
function generateSchoolToken(schoolId: string): string {
    // 간단한 토큰 생성 (실제로는 더 복잡한 해시 사용)
    const combined = schoolId + GAS_CONFIG.schoolSecret;
    return btoa(combined).substring(0, 32);
}

/**
 * GAS POST 요청
 */
async function gasPost<T = any>(action: string, data: any): Promise<GASResponse<T>> {
    try {
        const payload = {
            action,
            apiKey: GAS_CONFIG.apiKey,
            schoolToken: generateSchoolToken(data.schoolId || 'default'),
            ...data,
        };

        const response = await fetch(GAS_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Avoid CORS preflight
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('GAS POST error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: null as T,
            timestamp: new Date().toISOString(),
        };
    }
}

/**
 * GAS GET 요청
 */
async function gasGet<T = any>(action: string, params: any): Promise<GASResponse<T>> {
    try {
        const queryParams = new URLSearchParams({
            action,
            apiKey: GAS_CONFIG.apiKey,
            schoolToken: generateSchoolToken(params.schoolId || 'default'),
            ...params,
        });

        const response = await fetch(`${GAS_CONFIG.apiUrl}?${queryParams.toString()}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('GAS GET error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: null as T,
            timestamp: new Date().toISOString(),
        };
    }
}

// ============================================
// Public API
// ============================================

/**
 * 제출 데이터를 GAS로 전송
 */
export async function submitToGAS(data: SubmissionData & { spreadsheetId?: string }): Promise<GASResponse> {
    return gasPost('submit', data);
}

/**
 * 제출 현황 조회
 */
export async function getSubmissions(sheetId: string, spreadsheetId?: string): Promise<GASResponse<any[]>> {
    return gasGet('get-submissions', { sheetId, spreadsheetId });
}

/**
 * 통계 조회
 */
export async function getStats(sheetId: string, spreadsheetId?: string): Promise<GASResponse<any>> {
    return gasGet('get-stats', { sheetId, spreadsheetId });
}

/**
 * 학생 명단 조회
 */
export async function getStudents(sheetId: string): Promise<GASResponse<any[]>> {
    return gasGet('get-students', { sheetId });
}

/**
 * 제출 데이터 수정
 */
export async function updateSubmission(data: UpdateData & { spreadsheetId?: string }): Promise<GASResponse> {
    return gasPost('update', data);
}

/**
 * 제출 데이터 삭제 (soft delete)
 */
export async function deleteSubmission(
    sheetId: string,
    submissionId: number,
    editor: string,
    spreadsheetId?: string
): Promise<GASResponse> {
    return gasPost('delete', {
        sheetId,
        submissionId,
        editor,
        spreadsheetId,
    });
}

/**
 * 새 시트 생성
 */
export async function createSheet(
    sheetId: string,
    headers?: string[],
    spreadsheetId?: string
): Promise<GASResponse<{ sheetId: string; sheetUrl: string }>> {
    return gasPost('create-sheet', {
        sheetId,
        headers,
        spreadsheetId,
    });
}

/**
 * 재제출 링크 생성
 */
export async function generateResubmitLink(
    sheetId: string,
    submissionId: number
): Promise<GASResponse<{ token: string; expiresIn: number }>> {
    return gasPost('generate-resubmit', {
        sheetId,
        submissionId,
    });
}

/**
 * 재제출 토큰 검증
 */
export async function verifyResubmitToken(
    token: string
): Promise<GASResponse<any>> {
    return gasGet('verify-resubmit', { token });
}

/**
 * 재제출 URL 생성
 */
export function buildResubmitUrl(docId: string, token: string): string {
    const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://gatong.creat1324.com';

    return `${baseUrl}/s/${docId}?resubmit=${token}`;
}

/**
 * 시트 ID 생성 헬퍼
 */
export function generateSheetId(schoolId: string, year: number, docId: string): string {
    return `${schoolId}_${year}_${docId}`;
}

/**
 * GAS 설정 확인
 */
export function isGASConfigured(): boolean {
    return !!(GAS_CONFIG.apiUrl && GAS_CONFIG.apiKey);
}

/**
 * 에러 메시지 추출
 */
export function extractErrorMessage(response: GASResponse): string {
    if (response.success) return '';
    return response.message || '알 수 없는 오류가 발생했습니다.';
}

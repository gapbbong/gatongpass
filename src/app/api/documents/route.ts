import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseDocumentName } from '@/lib/documentParser';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gradeFilter = searchParams.get('grade'); // '1', '2', '3'
        const deptFilter = searchParams.get('dept'); // 'semicon', 'iot', 'game'

        const documentsDir = path.join(process.cwd(), 'public', 'documents');

        if (!fs.existsSync(documentsDir)) {
            return NextResponse.json({ files: [] });
        }

        const files = fs.readdirSync(documentsDir);
        const supportedExtensions = ['.hwp', '.hwpx', '.pdf', '.jpg', '.png'];

        let parsedDocs = files
            .filter(file => supportedExtensions.includes(path.extname(file).toLowerCase()))
            .map(file => parseDocumentName(file));

        // Apply filters if present
        if (gradeFilter) {
            const g = parseInt(gradeFilter);
            // Include if targetGrade includes g OR contains 0 (all)
            parsedDocs = parsedDocs.filter(doc => doc.targetGrade.includes(0) || doc.targetGrade.includes(g));
        }

        if (deptFilter) {
            // Include if targetDept includes the filter OR contains 'common'
            parsedDocs = parsedDocs.filter(doc => doc.targetDept.includes('common') || doc.targetDept.includes(deptFilter));
        }

        // Sort: Actions first, then by name
        parsedDocs.sort((a, b) => {
            if (a.type === b.type) return a.fileName.localeCompare(b.fileName);
            return a.type === 'action' ? -1 : 1;
        });

        return NextResponse.json({ files: parsedDocs });
    } catch (error) {
        console.error('Error reading documents:', error);
        return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
    }
}

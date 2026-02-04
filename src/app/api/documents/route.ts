import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const documentsDir = path.join(process.cwd(), 'public', 'documents');

        // Check if directory exists
        if (!fs.existsSync(documentsDir)) {
            return NextResponse.json({ files: [] });
        }

        const files = fs.readdirSync(documentsDir).map(file => {
            // Get file stats for logical ordering or info if needed (skipping for speed)
            return {
                name: file,
                path: `/documents/${file}`,
                type: path.extname(file).toLowerCase().replace('.', '')
            };
        });

        // Filter mainly for document types if needed, or return all
        const docFiles = files.filter(f => ['hwp', 'hwpx', 'pdf', 'jpg', 'png'].includes(f.type));

        return NextResponse.json({ files: docFiles });
    } catch (error) {
        console.error('Error reading documents:', error);
        return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
    }
}

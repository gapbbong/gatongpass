import { NextResponse } from 'next/server';

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Fnvbd2_oDlZ_JZ874smNhDoXDqvZhOzApjAFleeZIdU/export?format=csv&gid=153974185';

// Simple CSV Parser handling quotes
function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) continue;

        const row: any = {};
        headers.forEach((header, index) => {
            row[header.trim()] = values[index];
        });
        rows.push(row);
    }
    return rows;
}

function parseCSVLine(line: string) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

export async function GET() {
    try {
        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch sheet: ${response.statusText}`);
        }

        const csvText = await response.text();
        const parsedData = parseCSV(csvText);

        // Transform to Student interface structure, filtering out students with '학적' status (e.g., 전학, 자퇴)
        const students = parsedData
            .filter(row => !row['학적'] || row['학적'].trim() === '') // Only include empty status
            .map((row) => ({
                id: row['PID'] || `STU-${row['학번']}`,
                grade: parseInt(row['학년']) || 1,
                class_num: parseInt(row['반']) || 1,
                student_num: parseInt(row['학번']) || 0,
                name: row['이름'] || 'Unknown',
                submitted: false, // Default status
                // Additional fields can be mapped here if needed
                phone: row['학생폰'],
                parent_phone: row['모(연락처)'] || row['부(연락처)']
            }));

        // Sort by student number
        students.sort((a, b) => a.student_num - b.student_num);

        return NextResponse.json({
            success: true,
            count: students.length,
            students
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to import student data' },
            { status: 500 }
        );
    }
}

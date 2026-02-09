import { NextResponse } from 'next/server';

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1OgMiyfnQwFYC06KcOTFGKLzcizD9nuvXvCcTWkIxDWg/export?format=csv&gid=0';

// In-memory cache
let cachedStudents: any[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

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
        const now = Date.now();

        if (cachedStudents && (now - lastFetchTime < CACHE_TTL)) {
            return NextResponse.json({
                success: true,
                count: cachedStudents.length,
                students: cachedStudents,
                fromCache: true
            });
        }

        const response = await fetch(GOOGLE_SHEET_CSV_URL);
        if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.statusText}`);

        const csvText = await response.text();
        const parsedData = parseCSV(csvText);

        const students = parsedData.map((row: any) => {
            const studentIdRaw = row['학번'] || '';
            let grade = 0;
            let classNum = 0;
            let stuNum = 0;

            // Handle 4-digit student ID (e.g., 1101 -> Grade 1, Class 1, Number 01)
            if (studentIdRaw.length === 4) {
                grade = parseInt(studentIdRaw[0]);
                classNum = parseInt(studentIdRaw.substring(1, 2));
                stuNum = parseInt(studentIdRaw.substring(2));
            } else if (studentIdRaw.length === 5) { // 11001
                grade = parseInt(studentIdRaw[0]);
                classNum = parseInt(studentIdRaw.substring(1, 3));
                stuNum = parseInt(studentIdRaw.substring(3));
            }

            return {
                id: `STU-${studentIdRaw}`,
                grade,
                class_num: classNum,
                student_num: stuNum,
                name: row['이름'] || 'Unknown',
                submitted: false,
                parents: {
                    father: row['부(연락처)'] || row['부연락처'],
                    mother: row['모(연락처)'] || row['모연락처']
                }
            };
        });

        students.sort((a: any, b: any) => {
            const aVal = (a.grade * 10000) + (a.class_num * 100) + a.student_num;
            const bVal = (b.grade * 10000) + (b.class_num * 100) + b.student_num;
            return aVal - bVal;
        });

        cachedStudents = students;
        lastFetchTime = now;

        return NextResponse.json({ success: true, count: students.length, students });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ success: false, error: 'Failed to import student data' }, { status: 500 });
    }
}

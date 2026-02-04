
export interface DocMetadata {
    fileName: string;
    title: string;
    year: string;
    targetGrade: number[]; // 0 for all/common
    targetDept: string[]; // 'common', 'semicon', 'iot', 'game', 'doje'
    type: 'notice' | 'action'; // 'action' requires signature/response
    path: string;
}

export function parseDocumentName(fileName: string): DocMetadata {
    const name = fileName.normalize('NFC');

    // 1. Year Extraction
    const yearMatch = name.match(/20\d\d/);
    const year = yearMatch ? yearMatch[0] : '2025';

    // 2. Grade Extraction
    const targetGrade: number[] = [];
    if (name.includes('1학년') || name.includes('신입생')) targetGrade.push(1);
    if (name.includes('2학년')) targetGrade.push(2);
    if (name.includes('3학년')) targetGrade.push(3);
    if (targetGrade.length === 0) targetGrade.push(0); // All grades

    // 3. Department Extraction
    const targetDept: string[] = [];
    if (name.includes('반도체') || name.includes('기술사관')) targetDept.push('semicon');
    if (name.includes('IoT') || name.includes('전기')) targetDept.push('iot');
    if (name.includes('게임') || name.includes('콘텐츠')) targetDept.push('game');
    if (name.includes('도제')) targetDept.push('doje');
    if (targetDept.length === 0) targetDept.push('common');

    // 4. Type Extraction (Notice vs Action)
    // Keywords implying action required
    const actionKeywords = ['신청', '동의', '조사', '참가', '수강', '희망', '가입', '서약'];
    const isAction = actionKeywords.some(keyword => name.includes(keyword));

    // 5. Clean Title
    // Remove file extension and some common prefixes/suffixes for cleaner display
    let title = name.replace(/\.(hwp|hwpx|pdf|jpg|png)$/i, '');
    // Optional: remove (가정통신문), [No], etc if needed, but keeping generally intact is safer for identification

    return {
        fileName: name,
        title,
        year,
        targetGrade,
        targetDept,
        type: isAction ? 'action' : 'notice',
        path: `/documents/${fileName}`
    };
}

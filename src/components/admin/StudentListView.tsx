'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, CheckCircle2, Circle, Clock, Mail, ChevronRight, User, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSheet, generateSheetId } from '@/lib/gasClient';
import { getSchoolConfig } from '@/lib/schoolConfig';
import { cn } from '@/lib/utils';

export interface Student {
    id: string;
    grade: number;
    class_num: number;
    student_num: number;
    name: string;
    submitted: boolean;
    submittedAt?: string;
}

interface StudentListViewProps {
    students: Student[];
    loading?: boolean;
    docId?: string;
    sheetId?: string;
}

export default function StudentListView({ students, loading, docId, sheetId }: StudentListViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'submitted' | 'pending'>('all');
    const [isImporting, setIsImporting] = useState(false);
    const [localStudents, setLocalStudents] = useState<Student[]>(students);

    // Update localStudents if props change, but allow local override
    React.useEffect(() => {
        if (students.length > 0 && localStudents.length === 0) {
            setLocalStudents(students);
        }
    }, [students]);

    const handleOpenSheet = async () => {
        if (!docId) {
            alert("문서 정보가 없습니다.");
            return;
        }

        const targetSheetId = sheetId || generateSheetId('school', new Date().getFullYear(), docId);

        try {
            // Using undefined headers to trigger default backend logic (avoid empty row error)
            const schoolCfg = getSchoolConfig();
            const res = await createSheet(targetSheetId, undefined, schoolCfg.submissionSpreadsheetId);
            if (res.success && res.data.sheetUrl) {
                window.open(res.data.sheetUrl, '_blank');
            } else {
                if (res.message && (res.message.includes('이미') || res.message.includes('exists'))) {
                    // Assuming the error means sheet creation failed but it likely exists.
                    // Ideally we should just verify existence, but GAS createSheet tries to create.
                    // If it exists, it should return success.
                    // But currently it seems to error if logic is rigid.
                    // Wait, previous fix in ActiveDocumentViewer instructed user to delete.
                    // We should keep consistent behavior.
                    alert("⚠️ 시트 생성 오류\n\n이미 동일한 이름의 시트가 존재합니다. (이전 시도에서 생성됨)\n\n구글 시트 하단의 탭을 삭제한 후 다시 버튼을 눌러주세요!");
                } else {
                    alert("시트를 열 수 없습니다: " + res.message);
                }
            }
        } catch (e) {
            console.error(e);
            alert("오류가 발생했습니다.");
        }
    };

    const handleImport = async () => {
        if (!confirm('구글 시트에서 최신 명렬표를 가져오시겠습니까? 기존 데이터는 업데이트됩니다.')) return;

        setIsImporting(true);
        try {
            const res = await fetch('/api/students/import');
            const data = await res.json();

            if (data.success) {
                setLocalStudents(data.students);
                alert(`${data.count}명의 학생 데이터를 성공적으로 가져왔습니다.`);
            } else {
                alert('데이터 가져오기 실패: ' + data.error);
            }
        } catch (error) {
            console.error(error);
            alert('데이터 가져오기 중 오류가 발생했습니다.');
        } finally {
            setIsImporting(false);
        }
    };

    const filteredStudents = useMemo(() => {
        return localStudents.filter(student => {
            const matchesSearch = student.name.includes(searchQuery) || student.student_num.toString().includes(searchQuery);
            const matchesFilter =
                filter === 'all' ? true :
                    filter === 'submitted' ? student.submitted :
                        !student.submitted;
            return matchesSearch && matchesFilter;
        });
    }, [localStudents, searchQuery, filter]);

    const stats = useMemo(() => {
        const total = localStudents.length;
        const submitted = localStudents.filter(s => s.submitted).length;
        return {
            total,
            submitted,
            pending: total - submitted,
            percent: total > 0 ? Math.round((submitted / total) * 100) : 0
        };
    }, [localStudents]);

    return (
        <div className="flex flex-col h-full bg-background/20 backdrop-blur-md">
            {/* Header */}
            <div className="p-8 pb-3 border-b border-white/[0.05]">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                            명렬표 관리
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            {/* English subtitle removed for simplicity */}
                            <button
                                onClick={handleImport}
                                disabled={isImporting}
                                className={cn(
                                    "text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors flex items-center gap-2",
                                    isImporting && "opacity-50 cursor-wait"
                                )}
                            >
                                <span className={cn("w-1.5 h-1.5 rounded-full", isImporting ? "bg-yellow-500 animate-pulse" : "bg-green-500")}></span>
                                {isImporting ? '가져오는 중...' : '명렬표 가져오기'}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-2xl font-black text-white">{stats.submitted}<span className="text-gray-600 mx-1">/</span>{stats.total}</p>
                            <div className="bg-white/5 h-1.5 w-32 rounded-full mt-2 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.percent}%` }}
                                    className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="이름 또는 번호로 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-bold placeholder:text-gray-600"
                        />
                    </div>
                </div>

                {/* Bulk Actions & Filter */}
                <div className="flex flex-col gap-3 mt-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => alert(`${stats.pending}명의 미제출 학부모님께 알림톡을 발송했습니다.`)}
                            disabled={stats.pending === 0}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-gray-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all"
                        >
                            <Mail size={16} /> 미제출자 일괄 알림
                        </button>
                        <button
                            onClick={handleOpenSheet}
                            className="flex-1 py-3 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-green-500/20 active:scale-[0.98] transition-all"
                        >
                            <ExternalLink size={16} /> 구글시트 열기
                        </button>
                    </div>

                    <div className="flex p-1 bg-white/[0.03] border border-white/5 rounded-xl">
                        {(['all', 'submitted', 'pending'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all",
                                    filter === f ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {f === 'all' ? '전체' : f === 'submitted' ? '제출 완료' : '미제출'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                    <AnimatePresence mode="popLayout">
                        {filteredStudents.map((student) => (
                            <motion.div
                                key={student.id || student.student_num}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={cn(
                                    "group p-2.5 rounded-xl border transition-all flex items-center justify-between active:scale-[0.98]",
                                    student.submitted
                                        ? "bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/30"
                                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-inner border",
                                        student.submitted
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            : "bg-white/5 text-gray-500 border-white/10"
                                    )}>
                                        {student.student_num}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                            {student.name}
                                        </h4>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mr-2">
                                        {student.submitted ? `제출됨` : '미제출'}
                                    </p>
                                    {student.submitted ? (
                                        <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                                            <CheckCircle2 size={14} />
                                        </div>
                                    ) : (
                                        <button disabled className="p-1.5 bg-white/5 rounded-lg text-gray-700 cursor-not-allowed opacity-50">
                                            <Mail size={14} />
                                        </button>
                                    )}
                                    <ChevronRight size={16} className="text-gray-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {filteredStudents.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-32 text-center opacity-30">
                        <User size={48} className="mb-4" />
                        <p className="font-bold text-gray-500">학생 데이터가 없습니다</p>
                    </div>
                )}
            </div>
        </div>
    );
}

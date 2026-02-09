'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    FileText, Search, Maximize2, Download, ExternalLink,
    MousePointer2, AlertCircle, ArrowLeft, ArrowRight, MoreVertical, Send, Table2,
    LayoutDashboard, Eye, Users, CheckCircle2, XCircle, BarChart3, PieChart,
    ChevronDown, ChevronUp, RefreshCcw, Calendar, Crown, Copy, BellRing, Sparkles,
    Megaphone, TrendingUp, Filter
} from 'lucide-react';
import { createSheet, generateSheetId } from '@/lib/gasClient';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getSchoolConfig } from '@/lib/schoolConfig';

const WARM_GREETINGS = [
    "학생의 꿈과 미래를 항상 응원합니다. ✨",
    "학교를 믿고 자녀를 맡겨주시는 학부모님께 깊은 감사를 드립니다. ❤️",
    "오늘도 우리 아이들의 성장을 위해 애쓰시는 학부모님, 정말 존경하고 감사합니다. 👏",
    "학교와 가정이 한마음으로 소통할 때, 우리 아이들은 더 크게 자라납니다. 🌱",
    "자녀의 행복한 학교 생활을 위해 최선을 다하겠습니다. 함께해주셔서 감사합니다. 🙏"
];

interface ActiveDocumentViewerProps {
    document: {
        id: string;
        title: string;
        path: string;
        type?: string;
        sheetId?: string;
        sheetUrl?: string; // Legacy support
        deadline?: string;
        targetSummary?: string;
        formItems?: any[]; // To label charts if available
    } | null;
    students: any[];
    submissions: any[];
    activeTab: 'info' | 'preview' | 'analytics'; // Controlled by parent
    studentFetchError?: string | null;
    hideHeader?: boolean;
}

function StatCard({ label, value, icon, color, sub, highlight = false }: { label: string, value: number, icon: React.ReactNode, color: string, sub: string, highlight?: boolean }) {
    return (
        <div className={cn(
            "rounded-2xl p-6 border transition-all",
            highlight ? "bg-emerald-500/10 border-emerald-500/20" : "bg-[var(--color-card)] border-[var(--color-border)]"
        )}>
            <div className={cn("flex items-center gap-3 mb-2", color)}>
                {icon}
                <span className="text-sm font-bold">{label}</span>
            </div>
            <div className="text-3xl font-black text-[var(--color-foreground)]">{value}명</div>
            <div className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">{sub}</div>
        </div>
    );
}

export default function ActiveDocumentViewer({ document, students = [], submissions = [], activeTab, studentFetchError, hideHeader = false }: ActiveDocumentViewerProps) {
    // --- Scale Logic for Preview ---
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [schoolConfig, setSchoolConfig] = useState<any>(null);

    useEffect(() => {
        setSchoolConfig(getSchoolConfig());
    }, []);

    const stableGreeting = useMemo(() => {
        if (!document?.id) return WARM_GREETINGS[0];
        let sum = 0;
        for (let i = 0; i < document.id.length; i++) sum += document.id.charCodeAt(i);
        return WARM_GREETINGS[sum % WARM_GREETINGS.length];
    }, [document?.id]);

    // ... (rest of the setup logic remains same)

    useEffect(() => {
        if (activeTab !== 'preview') return;

        const handleResize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                const padding = 0; // Absolute zero padding for maximized preview
                const targetWidth = 375 + padding;
                const targetHeight = 1000 + padding;

                // Calculate scale to fit both width and height
                const scaleW = clientWidth / targetWidth;
                const scaleH = clientHeight / targetHeight;

                // Use the smaller scale to ensure it fits entirely
                const newScale = Math.min(scaleW, scaleH, 1); // Max scale 1
                setScale(newScale);
            }
        };

        // Initial calc
        handleResize();

        window.addEventListener('resize', handleResize);
        const observer = new ResizeObserver(handleResize);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => {
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
        };
    }, [activeTab]);

    const [expandedClass, setExpandedClass] = useState<string | null>(null);

    const handleOpenSheet = async () => {
        if (!document) return;
        const targetSheetId = document.sheetId || generateSheetId('school', new Date().getFullYear(), document.id);
        try {
            const res = await createSheet(targetSheetId, undefined);
            if (res.success && res.data.sheetUrl) {
                window.open(res.data.sheetUrl, '_blank');
            } else {
                if (res.message && (res.message.includes('이미') || res.message.includes('exists'))) {
                    alert("이미 시트가 존재합니다. 구글 드라이브에서 확인해주세요.");
                } else {
                    alert("시트를 열 수 없습니다: " + res.message);
                }
            }
        } catch (e) {
            console.error(e);
            alert("오류가 발생했습니다.");
        }
    };

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        if (!document) return null;
        const total = students.length;
        const submitted = students.filter(s => s.submitted).length;
        const pending = Math.max(0, total - submitted);
        const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;

        // Class-level stats
        const classStats: Record<string, { total: number, submitted: number, grade: number, classNum: number }> = {};

        students.forEach(s => {
            const key = `${s.grade}-${s.class_num}`;
            if (!classStats[key]) {
                classStats[key] = { total: 0, submitted: 0, grade: s.grade, classNum: s.class_num };
            }
            classStats[key].total++;
            if (s.submitted) classStats[key].submitted++;
        });

        // Convert to array and sort
        const classes = Object.values(classStats).map(c => ({
            ...c,
            rate: c.total > 0 ? Math.round((c.submitted / c.total) * 100) : 0,
            key: `${c.grade}-${c.classNum}`
        })).sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            return a.classNum - b.classNum;
        });

        return { total, submitted, pending, rate, classes };
    }, [students, document]);

    const answerStats = useMemo(() => {
        if (!submissions || submissions.length === 0) return [];

        // Define which keys to ignore from submission data
        const ignoreKeys = new Set(['제출시간', '학년', '반', '번호', '이름', '연락처', '수정횟수', '서명URL', 'IP', '디바이스', 'id', 'timestamp']);
        const keys = new Set<string>();

        submissions.forEach(s => Object.keys(s).forEach(k => {
            if (!ignoreKeys.has(k)) keys.add(k);
        }));

        const result = Array.from(keys).map(key => {
            const counts: { [val: string]: number } = {};
            submissions.forEach(s => {
                const val = s[key] || '(미응답)';
                counts[val] = (counts[val] || 0) + 1;
            });
            return { question: key, counts };
        });

        return result;
    }, [submissions]);

    // Derived: Filtered View
    const viewStudents = useMemo(() => {
        if (!expandedClass) return students;
        const [g, c] = expandedClass.split('-').map(Number);
        return students.filter(s => s.grade === g && s.class_num === c);
    }, [students, expandedClass]);

    // Action: Copy Unsubmitted List
    const handleCopyUnsubmitted = (targetClassKey?: string) => {
        let targetList = students;
        let label = "전체 미제출자";

        if (targetClassKey) {
            const [g, c] = targetClassKey.split('-').map(Number);
            targetList = students.filter(s => s.grade === g && s.class_num === c);
            label = `${g}학년 ${c}반 미제출자`;
        }

        const unsubmittedNames = targetList
            .filter(s => !s.submitted)
            .map(s => s.name)
            .join(', ');

        const text = `[${label} 명단]\n${unsubmittedNames || '없음'}`;
        navigator.clipboard.writeText(text).then(() => {
            alert(`${label} 명단이 복사되었습니다!`);
        });
    };

    if (!document) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[var(--color-background)] text-[var(--color-muted-foreground)] p-10 text-center">
                <div className="p-4 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] mb-4">
                    <FileText size={32} className="opacity-20" />
                </div>
                <p className="font-bold text-sm">문서를 선택하거나 작성해주세요.</p>
            </div>
        );
    }

    const renderPreview = () => {
        if (!document) return null;

        // Priority 1: Real File Preview (Image/PDF)
        const actualUrl = (document as any).previewUrl || (document as any).path;
        if (actualUrl) {
            const isImage = actualUrl.includes('image/') || actualUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || actualUrl.startsWith('data:image/');
            return (
                <div className="w-full bg-white flex flex-col" style={{ backgroundColor: 'white' }}>
                    {isImage ? (
                        <div className="w-full flex items-start justify-center bg-white" style={{ backgroundColor: 'white' }}>
                            <img src={actualUrl} alt="Preview" className="w-full h-auto block" />
                        </div>
                    ) : (
                        <div className="w-full h-[700px] bg-white border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
                            <iframe
                                src={`${actualUrl}#toolbar=0&view=FitW`}
                                className="w-full h-full border-0 bg-white"
                                title="PDF Preview"
                                style={{ backgroundColor: 'white' }}
                            />
                        </div>
                    )}

                    {/* Overlay form items if they exist on top of the generic preview placeholder or as info */}
                    {document.formItems && document.formItems.length > 0 && (
                        <div className="p-5 space-y-4 border-t border-slate-200">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">추가 입력 항목</div>
                            {document.formItems.map((item: any, idx: number) => (
                                <div key={idx} className="space-y-1.5 grayscale opacity-50">
                                    <label className="text-[11px] font-bold text-slate-700">
                                        {idx + 1}. {item.label}
                                    </label>
                                    <div className="h-8 border border-slate-200 rounded-lg bg-white" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Priority 2: Form Items Preview (if no file but has items)
        if (document.formItems && document.formItems.length > 0) {
            return (
                <div className="p-5 space-y-4">
                    {document.formItems.map((item: any, idx: number) => (
                        <div key={idx} className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">
                                {idx + 1}. {item.label}
                                {item.required && <span className="text-rose-500 ml-1">*</span>}
                            </label>
                            {item.type === 'text' && (
                                <div className="h-10 border border-slate-200 rounded-lg bg-white" />
                            )}
                            {item.type === 'textarea' && (
                                <div className="h-24 border border-slate-200 rounded-lg bg-white" />
                            )}
                            {item.type === 'signature' && (
                                <div className="h-24 border border-indigo-100 border-dashed rounded-xl bg-indigo-50/30 flex items-center justify-center text-indigo-300 text-xs font-bold uppercase tracking-widest">
                                    (보호자 서명 영역)
                                </div>
                            )}
                            {item.type === 'radio' && (
                                <div className="flex flex-col gap-2">
                                    {item.options?.map((opt: string, oIdx: number) => (
                                        <div key={oIdx} className="h-10 border border-slate-200 rounded-lg bg-white flex items-center px-4 text-sm text-slate-600 gap-3">
                                            <div className="w-4 h-4 rounded-full border border-slate-300" />
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        return (
            <div className="p-10 text-center text-slate-400 text-sm font-medium">
                파일 또는 항목을 추가하면 <br />여기에 미리보기가 표시됩니다.
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
            {/* 1. Header (Conditional) */}
            {!hideHeader && (
                <div className="h-16 border-b border-[var(--color-border)] flex items-center px-6 justify-between bg-[var(--color-card)]/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white">
                            {document.type === 'action' ? <FileText size={20} /> : <Megaphone size={20} />}
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">{document.title}</h2>
                            <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mt-0.5">
                                <span className="bg-indigo-600/10 px-1.5 py-0.5 rounded text-indigo-600 font-bold">
                                    {document.targetSummary || '전체 대상'}
                                </span>
                                <span>•</span>
                                <span>{new Date().toLocaleDateString()} 기준</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenSheet}
                            className="bg-[#107040] hover:bg-[#0d5e35] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/10"
                        >
                            <Table2 size={16} />
                            구글 시트 열기
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                {/* PREVIEW TAB */}
                {activeTab === 'preview' && (
                    <div className="h-full flex flex-col items-center justify-center p-0 bg-[var(--color-background)]" ref={containerRef}>
                        <div
                            style={{ transform: `scale(${scale})` }}
                            className="origin-center shadow-2xl rounded-[3rem] overflow-hidden border-[8px] border-[var(--color-foreground)]/[0.05] bg-white relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-7 bg-[var(--color-foreground)]/[0.05] z-50 flex justify-center pt-2">
                                <div className="w-20 h-4 bg-[var(--color-foreground)]/[0.1] rounded-full"></div>
                            </div>
                            <div className="h-12 bg-white w-full flex items-center justify-between px-6 pt-2 select-none z-40 relative">
                                <span className="text-xs font-bold text-black">9:41</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-2.5 bg-black rounded-sm" />
                                    <div className="w-0.5 h-1 bg-black" />
                                </div>
                            </div>
                            {/* Scrollable Content */}
                            <div className="w-full h-[740px] bg-white overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                                {/* 1. Header (Title & Greeting) */}
                                <div className="bg-white px-6 pt-8 pb-6 border-b border-slate-100">
                                    <div className="mb-4">
                                        <span className="inline-block px-3 py-1 rounded-full bg-indigo-600/10 text-indigo-600 text-[10px] font-black tracking-wide uppercase mb-3">
                                            {document.type === 'action' ? '학부모 서명 필요' : '안내문'}
                                        </span>
                                        <h2 className="text-xl font-black text-slate-900 leading-snug break-keep">
                                            {document.title}
                                        </h2>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                        {stableGreeting}
                                    </p>
                                </div>

                                {/* 2. File Content (Full Width) */}
                                <div className="w-full bg-white">
                                    {renderPreview()}
                                </div>

                                <div className="p-5 space-y-6 pb-20">
                                    {/* Date Card */}
                                    {document.deadline && (
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                                            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-xl shrink-0">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 mb-1">참여 부탁드리는 시간</h4>
                                                <p className="text-sm font-bold text-slate-800">
                                                    {new Date(document.deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}까지
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* INFO TAB (Document Details) */}
                {activeTab === 'info' && (
                    <div className="space-y-6 max-w-3xl mx-auto p-4">

                        {/* 1. Document Summary Card */}
                        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={cn(
                                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide",
                                    document.type === 'action' ? "bg-rose-500/10 text-rose-400" : "bg-indigo-500/10 text-indigo-400"
                                )}>
                                    {document.type === 'action' ? '학부모 서명 필요' : '단순 안내문'}
                                </span>
                                <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--color-background)]/[0.05] text-[var(--color-muted-foreground)]">
                                    {document.targetSummary || '전체 대상'}
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold text-[var(--color-foreground)] leading-tight">
                                {document.title}
                            </h2>

                            <div className="flex items-center gap-4 text-xs text-[var(--color-muted-foreground)] font-mono pt-2 border-t border-[var(--color-border)]">
                                <span>작성일: {new Date().toLocaleDateString()}</span>
                                <span>•</span>
                                <span>ID: {document.id.slice(0, 8)}</span>
                            </div>
                        </div>

                        {/* 2. Deadline Card */}
                        {document.deadline && (
                            <div className="bg-[var(--color-card)] p-6 rounded-2xl border border-[var(--color-border)] flex items-start gap-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-[var(--color-muted-foreground)] mb-1 uppercase tracking-wider">마감 기한</h4>
                                    <p className="text-xl font-bold text-[var(--color-foreground)]">
                                        {new Date(document.deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}까지
                                    </p>
                                    <p className="text-xs text-indigo-500/70 mt-1">
                                        {Math.ceil((new Date(document.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}일 남았습니다.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 3. Form Items List */}
                        <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] flex items-center gap-2">
                                <FileText size={16} className="text-[var(--color-muted-foreground)]" />
                                <h3 className="font-bold text-[var(--color-muted-foreground)] text-sm">문서 내용 미리보기</h3>
                            </div>
                            <div className="w-full bg-[var(--color-background)]/[0.02] p-6">
                                {renderPreview()}
                            </div>
                        </div>
                    </div>
                )}

                {/* ANALYTICS TAB (Smart Dashboard) */}
                {activeTab === 'analytics' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-8 max-w-5xl mx-auto"
                    >
                        {/* Error Alert for Student Fetch */}
                        {studentFetchError && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-rose-500/20 border border-rose-500/30 rounded-2xl p-6 flex items-start gap-4"
                            >
                                <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-rose-400">명단 연동 오류</h4>
                                    <p className="text-sm text-rose-300 font-medium leading-relaxed">
                                        {studentFetchError}
                                    </p>
                                    <div className="pt-2 text-[10px] text-rose-400/60 uppercase tracking-widest font-bold">
                                        구글 시트 설정과 헤더(학년, 반, 번호, 이름)를 확인해 주세요.
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {stats ? (
                            <>

                                {/* A. Top Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Total Progress */}
                                    <div className="bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)] relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <PieChart size={100} className="text-indigo-500" />
                                        </div>
                                        <h3 className="text-[var(--color-muted-foreground)] text-sm font-bold uppercase tracking-wider mb-2">총 제출 현황</h3>
                                        <div className="flex items-end gap-3 mb-2">
                                            <span className="text-5xl font-black text-[var(--color-foreground)] tracking-tight">{stats.rate}%</span>
                                            <span className="text-lg text-[var(--color-muted-foreground)] font-bold mb-1">완료</span>
                                        </div>
                                        <div className="w-full h-3 bg-[var(--color-background)] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stats.rate}%` }}
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                            />
                                        </div>
                                        <div className="mt-3 text-xs font-mono text-[var(--color-muted-foreground)] flex justify-between">
                                            <span>{stats.submitted}명 제출</span>
                                            <span>총 {stats.total}명 대상</span>
                                        </div>
                                    </div>
                                </div>

                                {/* B. Smart Class Filter (Dynamic Buttons) */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[var(--color-foreground)] font-bold flex items-center gap-2">
                                            <Filter size={18} className="text-indigo-500" />
                                            <span className="text-[var(--color-foreground)] font-bold">학급별 현황판</span>
                                        </h3>
                                        {(expandedClass || stats.rate < 100) && (
                                            <button
                                                onClick={() => handleCopyUnsubmitted(expandedClass || undefined)}
                                                className="text-xs bg-[var(--color-background)]/[0.05] hover:bg-[var(--color-background)]/[0.1] px-3 py-1.5 rounded-lg text-[var(--color-muted-foreground)] flex items-center gap-1.5 transition-colors border border-[var(--color-border)]"
                                            >
                                                <Copy size={12} />
                                                {expandedClass ? `${expandedClass}반 미제출자 복사` : '전체 미제출자 복사'}
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {stats.classes.map((c) => (
                                            <button
                                                key={c.key}
                                                onClick={() => setExpandedClass(expandedClass === c.key ? null : c.key)}
                                                className={cn(
                                                    "relative p-4 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-95 group",
                                                    expandedClass === c.key
                                                        ? "bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/30"
                                                        : c.rate === 100
                                                            ? "bg-[var(--color-card)] border-emerald-500/30 hover:border-emerald-500/60"
                                                            : "bg-[var(--color-card)] border-[var(--color-border)] hover:border-indigo-500/30"
                                                )}
                                            >
                                                {c.rate === 100 && (
                                                    <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-md z-10">
                                                        <Crown size={12} fill="currentColor" />
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={cn(
                                                        "text-sm font-black",
                                                        expandedClass === c.key ? "text-white" : "text-[var(--color-foreground)]"
                                                    )}>
                                                        {c.grade}-{c.classNum}
                                                    </span>
                                                    <span className={cn(
                                                        "text-xs font-bold font-mono",
                                                        c.rate === 100 ? "text-emerald-500" : expandedClass === c.key ? "text-indigo-100" : "text-[var(--color-muted-foreground)]"
                                                    )}>
                                                        {c.rate}%
                                                    </span>
                                                </div>

                                                <div className="w-full h-1.5 bg-[var(--color-background)] rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-1000",
                                                            c.rate === 100 ? "bg-emerald-500" : expandedClass === c.key ? "bg-white" : "bg-indigo-500"
                                                        )}
                                                        style={{ width: `${c.rate}%` }}
                                                    />
                                                </div>
                                                {c.rate < 100 && (
                                                    <div className="mt-2 text-[10px] text-[var(--color-muted-foreground)] text-right">
                                                        {c.total - c.submitted}명 남음
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* C. Student List Table */}
                                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                                    <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-card)] flex items-center justify-between">
                                        <h4 className="font-bold text-sm text-[var(--color-muted-foreground)] flex items-center gap-2">
                                            <Users size={16} />
                                            {expandedClass ? `${expandedClass}반 명단` : '전체 학생 명단'}
                                            <span className="text-[var(--color-muted-foreground)]/50 text-xs font-normal">({viewStudents.length}명)</span>
                                        </h4>
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                                <CheckCircle2 size={10} /> 제출 완료
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 rounded text-[10px] font-bold text-rose-400 border border-rose-500/20">
                                                <XCircle size={10} /> 미제출
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-h-[500px] overflow-y-auto">
                                        <table className="w-full text-sm text-left text-gray-400">
                                            <thead className="text-xs text-[var(--color-muted-foreground)] uppercase bg-[var(--color-background)] sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-3 font-bold">학번/이름</th>
                                                    <th className="px-6 py-3 font-bold text-center">상태</th>
                                                    <th className="px-6 py-3 font-bold text-right">제출일시</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--color-border)]">
                                                {viewStudents.length > 0 ? (
                                                    viewStudents.map((s, idx) => (
                                                        <tr key={idx} className="hover:bg-[var(--color-foreground)]/[0.01] transition-colors group">
                                                            <td className="px-6 py-3 font-medium text-[var(--color-foreground)] group-hover:text-indigo-500 transition-colors">
                                                                <span className="font-mono text-[var(--color-muted-foreground)] mr-2">
                                                                    {(() => {
                                                                        const len = schoolConfig?.studentIdLength || 4;
                                                                        // Default 4: G(1)C(1)N(2) = 4 digits. e.g. 1101
                                                                        // Default 5: G(1)C(2)N(2) = 5 digits. e.g. 10101
                                                                        const g = s.grade.toString();
                                                                        const c = len === 5
                                                                            ? s.class_num.toString().padStart(2, '0')
                                                                            : s.class_num.toString(); // 1 digit for 4-len config usually
                                                                        const n = s.student_num.toString().padStart(2, '0');
                                                                        return `${g}${c}${n}`;
                                                                    })()}
                                                                </span>
                                                                {s.name}
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                {s.submitted ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                        <CheckCircle2 size={10} /> 완료
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-background)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500/30 animate-pulse" /> 대기
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-xs text-[var(--color-muted-foreground)]">
                                                                {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="px-6 py-12 text-center text-[var(--color-muted-foreground)]">
                                                            학생 데이터가 없습니다.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* D. Survey Visualization */}
                                {answerStats.length > 0 && (
                                    <div className="space-y-6">
                                        {answerStats.map((stat, idx) => (
                                            <div key={idx} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl">
                                                <h4 className="text-sm font-bold text-[var(--color-foreground)] mb-4 border-l-4 border-indigo-500 pl-3">{stat.question}</h4>
                                                <div className="space-y-3">
                                                    {Object.entries(stat.counts).map(([ans, count]) => {
                                                        const percent = stats.submitted > 0 ? Math.round((count / stats.submitted) * 100) : 0;
                                                        return (
                                                            <div key={ans} className="relative h-10 bg-[var(--color-background)]/[0.05] rounded-lg overflow-hidden flex items-center px-4 group">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percent}%` }}
                                                                    className="absolute left-0 top-0 h-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors"
                                                                />
                                                                <div className="relative z-10 flex justify-between w-full text-xs font-bold">
                                                                    <span className="text-[var(--color-foreground)]">{ans}</span>
                                                                    <span className="text-indigo-500">{count}명 ({percent}%)</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </motion.div>
                )}
            </div>
        </div>
    );
}

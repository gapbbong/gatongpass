'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import {
    LayoutDashboard, Plus, Search, Settings, FileText,
    MoreVertical, ArrowUpRight, Loader2, Sparkles, CheckCircle2,
    AlertCircle, Users, BarChart3, Trash2, Eye, RotateCcw,
    ChevronsLeft, ChevronsRight, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

// Components
import ActiveDocumentViewer from '@/components/admin/ActiveDocumentViewer';
import CorrespondenceWizard from '@/components/admin/CorrespondenceWizard';
import SchoolSettingsModal from '@/components/admin/SchoolSettingsModal';

// Services
import { getDocuments, deleteDocument } from '@/lib/docService';
import { getSubmissions } from '@/lib/gasClient';

// Types
import { getStudentsWithSubmission, seedMockStudents } from '@/lib/studentService';

export interface Document {
    id: string;
    title: string;
    type: 'notice' | 'action';
    created_at: string;
    status: 'ongoing' | 'completed';
    submitted_count: number;
    total_count: number;
    deadline?: string;
    path: string;
    sheetId?: string;
    formItems?: any[];
    targetSummary?: string;
}

function AdminDashboardContent() {
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || 'teacher';

    // --- State ---
    const [activeTab, setActiveTab] = useState<'list' | 'write' | 'preview' | 'analytics'>('list'); // Kept for logic compatibility, but UI replaced
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [schoolName, setSchoolName] = useState('GATONG ELEMENTARY');
    const [students, setStudents] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [draftRequest, setDraftRequest] = useState<any>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Column Widths State
    const [colWidths, setColWidths] = useState({
        list: 320,
        write: 450,
        preview: 420
    });

    const [collapsedCols, setCollapsedCols] = useState({
        write: false,
        preview: false
    });

    const toggleCollapse = useCallback((col: 'write' | 'preview') => {
        setCollapsedCols(prev => ({
            ...prev,
            [col]: !prev[col]
        }));
    }, []);

    const [wizardKey, setWizardKey] = useState(0);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleReset = useCallback(() => {
        setShowResetConfirm(true);
    }, []);

    const confirmReset = useCallback(() => {
        sessionStorage.removeItem('gatong_wizard_draft');
        setWizardKey(prev => prev + 1);
        setShowResetConfirm(false);
    }, []);

    const activeResizer = useRef<string | null>(null);

    useEffect(() => {
        import('@/lib/schoolConfig').then(mod => {
            const config = mod.getSchoolConfig();
            setSchoolName(config.schoolName);
        });
    }, [isSettingsOpen]); // Update when settings modal closes

    // --- Resize Handlers ---
    const startResize = (col: 'list' | 'write' | 'preview', e: React.MouseEvent) => {
        e.preventDefault();
        activeResizer.current = col;

        const startX = e.clientX;
        const startWidth = colWidths[col];

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!activeResizer.current) return;
            const diff = moveEvent.clientX - startX;
            setColWidths(prev => ({
                ...prev,
                [col]: Math.max(200, startWidth + diff) // Min width 200px
            }));
        };

        const onMouseUp = () => {
            activeResizer.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };


    // Load draft for preview if in create mode
    useEffect(() => {
        if (viewMode === 'create' && activeTab === 'preview') {
            try {
                const saved = sessionStorage.getItem('gatong_wizard_draft');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Reconstruct a comprehensive preview object
                    const previewDoc: any = {
                        title: parsed.title || '제목 없음',
                        path: parsed.fileData, // Base64
                        type: parsed.docType || 'action',
                        deadline: parsed.deadline,
                        formItems: parsed.formItems || [],
                        // Add dummy data for visual structure
                        id: 'draft',
                    };
                    setDraftRequest(previewDoc);
                }
            } catch (e) {
                console.error("Draft load error", e);
            }
        }
    }, [viewMode, activeTab]);

    // Student Data
    const [isStudentsLoading, setIsStudentsLoading] = useState(false);
    const [studentFetchError, setStudentFetchError] = useState<string | null>(null);

    const fetchStudents = useCallback(async () => {
        setIsStudentsLoading(true);
        setStudentFetchError(null);
        let allStudents: any[] = [];

        // 1. Get Base Student List
        const config = await import('@/lib/schoolConfig').then(mod => mod.getSchoolConfig());

        if (config.studentListSheetId) {
            try {
                // Fetch from GAS if configured
                const { getStudents } = await import('@/lib/gasClient');
                const res = await getStudents(config.studentListSheetId);
                if (res.success && Array.isArray(res.data)) {
                    allStudents = res.data.map((s: any) => ({
                        ...s,
                        id: `${s.grade}-${s.class_num}-${s.student_num}`, // Synthetic ID
                        submitted: false // Default
                    }));
                } else if (!res.success) {
                    setStudentFetchError(res.message);
                }
            } catch (e: any) {
                console.error("Failed to fetch student list from GAS", e);
                setStudentFetchError(e.message || "학생 명단을 가져오지 못했습니다.");
            }
        }

        // Fallback or Mock if GAS fetch failed or not configured
        if (allStudents.length === 0 && !config.studentListSheetId) {
            // Only seed mock data if NO sheet is configured.
            // If sheet IS configured but returned 0 students, we show 0 students (or error state).
            // This prevents "Name mismatch" confusion where user thinks they see their data but see mock data.
            const seeded = await seedMockStudents(3, 1);
            if (seeded) allStudents = seeded.map(s => ({ ...s, submitted: false }));
        }

        // 2. Override with Real GAS Data (Submissions) if available
        if (selectedDocId) {
            const doc = documents.find(d => d.id === selectedDocId);
            if (doc && doc.sheetId) {
                try {
                    const res = await getSubmissions(doc.sheetId);
                    if (res.success && Array.isArray(res.data)) {
                        setSubmissions(res.data); // Store raw data for analytics

                        const submittedSet = new Set();
                        res.data.forEach((row: any) => {
                            // Handle Korean keys from GAS
                            const grade = row['학년'];
                            const classNum = row['반'];
                            const studentNum = row['번호'];
                            const name = row['이름'];

                            if (grade && classNum && studentNum && name) {
                                submittedSet.add(`${grade}-${classNum}-${studentNum}-${name}`);
                            }
                        });

                        allStudents = allStudents.map((s: any) => ({
                            ...s,
                            submitted: submittedSet.has(`${s.grade}-${s.class_num}-${s.student_num}-${s.name}`)
                        }));
                    }
                } catch (e) {
                    console.error("GAS Fetch Error", e);
                }
            }
        }

        setStudents(allStudents);
        setIsStudentsLoading(false);
    }, [selectedDocId, documents]); // Re-fetch when doc changes

    useEffect(() => {
        if (selectedDocId) fetchStudents();
    }, [fetchStudents, selectedDocId, isSettingsOpen]);

    const fetchDocs = useCallback(async () => {
        try {
            setLoading(true);
            const dbDocs = await getDocuments().catch(() => []) || [];

            // Merge with LocalStorage (Mock Data from Wizard)
            const localDocsStr = localStorage.getItem('gatong_docs');
            const localDocs = localDocsStr ? JSON.parse(localDocsStr) : [];

            // Combine and sort by date desc
            const allDocs = [...localDocs, ...dbDocs].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            // Filter unique by ID just in case
            const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.id, item])).values());

            setDocuments(uniqueDocs);

            // Auto-select logic removed for explicit list view
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocs();
    }, []);

    // --- Actions ---
    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (documents.length === 0) return;
            // Ignore if user is typing in an input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const idx = documents.findIndex(d => d.id === selectedDocId);
                if (idx < documents.length - 1) {
                    handleSelectDoc(documents[idx + 1]);
                } else if (idx === -1 && documents.length > 0) {
                    handleSelectDoc(documents[0]);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const idx = documents.findIndex(d => d.id === selectedDocId);
                if (idx > 0) {
                    handleSelectDoc(documents[idx - 1]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [documents, selectedDocId]);

    const handleSelectDoc = (doc: any) => {
        setSelectedDocId(doc.id);
        setViewMode('detail');
        setActiveTab('analytics'); // Default to analytics for existing docs
    };

    const handleCreateNew = () => {
        setSelectedDocId(null);
        setViewMode('create');
        setActiveTab('write');
    };

    const handleBackToList = () => {
        setSelectedDocId(null);
        setViewMode('list');
        setActiveTab('list');
    };

    // Derived Selected Document
    const selectedDocument = documents.find(d => d.id === selectedDocId) || null;


    // --- Render Content ---
    const renderContent = () => {
        return (
            <div className="flex h-screen w-full bg-[var(--color-background)] overflow-hidden select-none">
                {/* ---------------------------------------------------------
                    COLUMN 1: 목록 (LIST)
                   --------------------------------------------------------- */}
                <div
                    style={{ width: colWidths.list }}
                    className="shrink-0 bg-[var(--color-background)] border-r border-[var(--color-border)] flex flex-col relative z-20 transition-none"
                >
                    {/* Header: Logo & Title */}
                    <div className="p-6 pb-2">
                        <div className="mb-6">
                            <LinkLogo schoolName={schoolName} />
                        </div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest">가통 목록</h2>
                            <span className="text-xs font-bold text-[var(--color-muted-foreground)] bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] px-2 py-0.5 rounded">{documents.length}</span>
                        </div>
                    </div>

                    <div className="px-4 mb-2">
                        <button
                            onClick={handleCreateNew}
                            className={cn(
                                "w-full py-3 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all border",
                                viewMode === 'create'
                                    ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/40"
                                    : "bg-[var(--color-background)]/[0.05] text-[var(--color-muted-foreground)] border-[var(--color-border)] hover:bg-[var(--color-background)]/[0.1] hover:text-[var(--color-foreground)]"
                            )}
                        >
                            <Plus size={16} />
                            새 가통 만들기
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-0 space-y-3">
                        <AnimatePresence>
                            {documents.map((doc) => (
                                <motion.div
                                    key={doc.id}
                                    layoutId={doc.id}
                                    onClick={() => handleSelectDoc(doc)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        "group relative p-4 rounded-2xl cursor-pointer border transition-all",
                                        selectedDocId === doc.id
                                            ? "bg-indigo-600/10 border-indigo-600/50"
                                            : "bg-[var(--color-background)] border-[var(--color-border)] hover:border-indigo-600/30"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div />
                                        <button
                                            onClick={(e) => handleDeleteClick(e, doc.id)}
                                            className="text-gray-600 hover:text-rose-400 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <h3 className={cn("text-sm font-bold mb-1 line-clamp-2", selectedDocId === doc.id ? "text-indigo-600" : "text-[var(--color-foreground)]")}>
                                        {doc.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-mono">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </span>
                                        <div className="w-16 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-600"
                                                style={{ width: `${Math.round((doc.submitted_count / Math.max(doc.total_count, 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Footer: School Info & Settings */}
                    <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
                        <div className="bg-[var(--color-background)]/[0.05] rounded-xl p-3 border border-[var(--color-border)] flex items-center justify-between group cursor-pointer hover:border-indigo-500/30 transition-all" onClick={() => setIsSettingsOpen(true)}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                                    <Settings size={16} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-[var(--color-foreground)] group-hover:text-indigo-600 transition-colors">{schoolName}</span>
                                    <span className="text-[10px] text-[var(--color-muted-foreground)] font-medium">학교 설정 및 관리</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESIZER 1 */}
                <div
                    className="w-[1px] hover:w-1 bg-[var(--color-border)] hover:bg-indigo-600 cursor-col-resize z-50 flex flex-col justify-center items-center group transition-all"
                    onMouseDown={(e) => startResize('list', e)}
                >
                    <div className="h-4 w-0.5 group-hover:bg-indigo-400 rounded-full transition-colors" />
                </div>

                {/* ---------------------------------------------------------
                    COLUMN 2: 작성/정보 (WRITE)
                   --------------------------------------------------------- */}
                <motion.div
                    animate={{ width: collapsedCols.write ? 48 : colWidths.write }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="shrink-0 bg-[var(--color-card)] flex flex-col relative z-10 overflow-hidden border-r border-[var(--color-border)]"
                >
                    {collapsedCols.write ? (
                        <div className="flex-1 flex flex-col items-center py-4 gap-4">
                            <button
                                onClick={() => toggleCollapse('write')}
                                className="p-2 hover:bg-[var(--color-background)]/[0.1] rounded-lg text-indigo-600 transition-colors"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <div className="writing-mode-vertical text-xs font-black text-[var(--color-muted-foreground)] uppercase tracking-widest whitespace-nowrap">
                                {viewMode === 'create' ? 'Editor' : 'Info'}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="h-14 border-b border-[var(--color-border)] flex items-center justify-between px-6 shrink-0 bg-[var(--color-card)]/50 backdrop-blur whitespace-nowrap">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        onClick={() => toggleCollapse('write')}
                                        className="text-gray-500 hover:text-white transition-colors"
                                        title="접기"
                                    >
                                        <Minimize2 size={16} />
                                    </button>
                                    <div className="flex items-center overflow-hidden">
                                        <FileText size={16} className="text-indigo-600 mr-2 shrink-0" />
                                        <h2 className="text-sm font-black text-[var(--color-foreground)] uppercase tracking-wider truncate">
                                            {viewMode === 'create' ? '작성 (Editor)' : '가통 정보 (Info)'}
                                        </h2>
                                    </div>
                                </div>
                                {viewMode === 'create' && (
                                    <button
                                        onClick={handleReset}
                                        className="px-3 py-1.5 bg-[var(--color-background)]/[0.05] hover:bg-[var(--color-background)]/[0.1] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border border-[var(--color-border)]"
                                    >
                                        <RotateCcw size={12} />
                                        초기화
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden relative bg-[var(--color-background)]">
                                {viewMode === 'create' ? (
                                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                                        <CorrespondenceWizard
                                            key={wizardKey}
                                            onSuccess={(newDoc) => {
                                                setDocuments(prev => {
                                                    const exists = prev.find(d => d.id === newDoc.id);
                                                    if (exists) return prev.map(d => d.id === newDoc.id ? newDoc : d);
                                                    return [newDoc, ...prev];
                                                });
                                                // Removed handleSelectDoc to allow summary screen to stay visible
                                            }}
                                            onCancel={() => { }}
                                            onDraftUpdate={(draft) => setDraftRequest(draft)}
                                        />
                                    </div>
                                ) : selectedDocument ? (
                                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                                        <CorrespondenceWizard
                                            key={selectedDocId}
                                            initialData={selectedDocument}
                                            onSuccess={(updatedDoc) => {
                                                setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
                                                // Removed handleSelectDoc to allow summary screen to stay visible
                                            }}
                                            onCancel={() => handleBackToList()}
                                            onDraftUpdate={(draft) => setDraftRequest(draft)}
                                        />
                                    </div>
                                ) : (
                                    <EmptyState text="가통을 선택하세요" icon={<FileText />} />
                                )}
                            </div>
                        </>
                    )}
                </motion.div>

                {/* RESIZER 2 */}
                <div
                    className="w-[1px] hover:w-1 bg-[var(--color-border)] hover:bg-indigo-600 cursor-col-resize z-50 flex flex-col justify-center items-center group transition-all"
                    onMouseDown={(e) => startResize('write', e)}
                >
                    <div className="h-4 w-0.5 group-hover:bg-indigo-400 rounded-full transition-colors" />
                </div>

                {/* ---------------------------------------------------------
                    COLUMN 3: 미리보기 (PREVIEW)
                   --------------------------------------------------------- */}
                <motion.div
                    animate={{ width: collapsedCols.preview ? 48 : colWidths.preview }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="shrink-0 bg-[var(--color-background)] flex flex-col relative z-10 overflow-hidden"
                >
                    {collapsedCols.preview ? (
                        <div className="flex-1 flex flex-col items-center py-4 gap-4">
                            <button
                                onClick={() => toggleCollapse('preview')}
                                className="p-2 hover:bg-[var(--color-background)]/[0.1] rounded-lg text-indigo-600 transition-colors"
                            >
                                <Maximize2 size={18} />
                            </button>
                            <div className="writing-mode-vertical text-xs font-black text-[var(--color-muted-foreground)] uppercase tracking-widest whitespace-nowrap">
                                Preview
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="h-14 border-b border-[var(--color-border)] flex items-center px-6 shrink-0 bg-[var(--color-background)] backdrop-blur justify-between whitespace-nowrap">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <button
                                        onClick={() => toggleCollapse('preview')}
                                        className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                                        title="접기"
                                    >
                                        <Minimize2 size={16} />
                                    </button>
                                    <div className="flex items-center overflow-hidden">
                                        <Eye size={16} className="text-indigo-600 mr-2 shrink-0" />
                                        <h2 className="text-sm font-black text-[var(--color-foreground)] uppercase tracking-wider truncate">미리보기 (Preview)</h2>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative bg-[url('/grid.svg')] bg-[length:20px_20px]">
                                {viewMode === 'create' ? (
                                    draftRequest ? (
                                        <ActiveDocumentViewer
                                            document={draftRequest}
                                            students={[]}
                                            submissions={[]}
                                            activeTab="preview"
                                            studentFetchError={studentFetchError}
                                            hideHeader={true}
                                        />
                                    ) : (
                                        <EmptyState text="작성 중..." icon={<Eye />} />
                                    )
                                ) : selectedDocument ? (
                                    <ActiveDocumentViewer
                                        document={selectedDocument}
                                        students={[]}
                                        submissions={[]}
                                        activeTab="preview"
                                        studentFetchError={studentFetchError}
                                        hideHeader={true}
                                    />
                                ) : (
                                    <EmptyState text="선택 대기" icon={<Eye />} />
                                )}
                            </div>
                        </>
                    )}
                </motion.div>

                {/* RESIZER 3 */}
                <div
                    className="w-[1px] hover:w-1 bg-[var(--color-border)] hover:bg-indigo-600 cursor-col-resize z-50 flex flex-col justify-center items-center group transition-all"
                    onMouseDown={(e) => startResize('preview', e)}
                >
                    <div className="h-4 w-0.5 group-hover:bg-indigo-400 rounded-full transition-colors" />
                </div>

                {/* ---------------------------------------------------------
                    COLUMN 4: 실시간 현황 (ANALYTICS) - Flexible (Remaining Space)
                   --------------------------------------------------------- */}
                <div className="flex-1 min-w-[300px] bg-[var(--color-card)] flex flex-col">
                    <div className="h-14 border-b border-[var(--color-border)] flex items-center px-6 shrink-0 bg-[var(--color-card)] backdrop-blur">
                        <BarChart3 size={16} className="text-indigo-600 mr-2" />
                        <h2 className="text-sm font-black text-[var(--color-foreground)] uppercase tracking-wider">실시간 현황 (Analytics)</h2>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-[var(--color-card)]">
                        {viewMode === 'create' ? (
                            <EmptyState text="작성 완료 후 활성화됩니다" icon={<BarChart3 />} />
                        ) : selectedDocument ? (
                            <ActiveDocumentViewer
                                document={documents.find(d => d.id === selectedDocId) || null}
                                students={students}
                                submissions={submissions}
                                activeTab="analytics"
                                studentFetchError={studentFetchError}
                                hideHeader={true}
                            />
                        ) : (
                            <EmptyState text="통계 대기 중" icon={<BarChart3 />} />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const EmptyState = ({ text, icon }: any) => (
        <div className="flex-1 flex flex-col items-center justify-center text-white/20 gap-4 h-full">
            {icon}
            <span className="font-bold text-lg">{text}</span>
            <button onClick={handleBackToList} className="mt-4 px-4 py-2 bg-white/5 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                목록으로 돌아가기
            </button>
        </div>
    );

    // --- Delete Logic ---
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        setDeleteTargetId(docId);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        const docId = deleteTargetId;

        setDocuments(prev => prev.filter(d => d.id !== docId));
        if (selectedDocId === docId) setSelectedDocId(null);

        const localDocs = JSON.parse(localStorage.getItem('gatong_docs') || '[]');
        const newLocalDocs = localDocs.filter((d: any) => d.id !== docId);
        localStorage.setItem('gatong_docs', JSON.stringify(newLocalDocs));

        try {
            await deleteDocument(docId);
        } catch (e) { console.error('DB Delete Error:', e); }

        setDeleteTargetId(null);
    };

    return (
        <main className="flex flex-col h-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative bg-neutral-950">
                {renderContent()}
            </div>

            {/* School Settings Modal */}
            <SchoolSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Delete Modal (Global) */}
            <AnimatePresence>
                {deleteTargetId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0" onClick={() => setDeleteTargetId(null)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#111216] border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500" />
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4 text-rose-500 shadow-lg shadow-rose-900/20">
                                    <Trash2 size={28} />
                                </div>
                                <h3 className="text-lg font-black text-white mb-2">문서를 삭제하시겠습니까?</h3>
                                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                    삭제된 문서는 복구할 수 없으며,<br />
                                    수집된 응답 데이터도 함께 사라집니다.
                                </p>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setDeleteTargetId(null)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-900/30 transition-all active:scale-[0.98]"
                                    >
                                        삭제하기
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Reset Confirmation Modal */}
            <AnimatePresence>
                {showResetConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <div className="absolute inset-0" onClick={() => setShowResetConfirm(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#111216] border border-white/10 p-6 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 shadow-lg shadow-indigo-900/20">
                                    <RotateCcw size={28} />
                                </div>
                                <h3 className="text-lg font-black text-white mb-2">작성을 초기화하시겠습니까?</h3>
                                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                    입력하신 모든 내용이 사라지며,<br />
                                    되돌릴 수 없습니다.
                                </p>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setShowResetConfirm(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={confirmReset}
                                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98]"
                                    >
                                        초기화하기
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

// Sub-components
function LinkLogo({ schoolName }: { schoolName: string }) {
    return (
        <div className="flex items-center gap-3 select-none transform origin-left transition-all duration-300">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <span className="font-black text-white text-lg">{schoolName.substring(0, 1)}</span>
            </div>
            <div className="flex flex-col leading-none">
                <div className="flex items-baseline text-[var(--color-foreground)] gap-[1px]">
                    <span className="font-black text-xl">가</span>
                    <span className="text-xs font-bold opacity-40">정</span>
                    <span className="font-black text-xl">통</span>
                    <span className="text-xs font-bold opacity-40">신문</span>
                    <span className="font-black text-xl text-indigo-600 ml-1">Pass</span>
                </div>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
            <motion.div
                className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
                <Spinner />
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}

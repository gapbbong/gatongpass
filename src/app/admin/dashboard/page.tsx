'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import {
    LayoutDashboard, Users, FileText, Send, Upload,
    Settings, Bell, Search, CheckCircle, XCircle, MoreVertical, AlertTriangle,
    Keyboard, ChevronRight, Filter, Download, ExternalLink, MousePointer2, Sparkles, BarChart3,
    Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

// Components
import DashboardLayout from '@/components/admin/DashboardLayout';
import ActiveDocumentViewer from '@/components/admin/ActiveDocumentViewer';
import SubmissionStats from '@/components/admin/SubmissionStats';
import CorrespondenceWizard from '@/components/admin/CorrespondenceWizard';

// Services
import { getDocuments } from '@/lib/docService';

// Types
import StudentListView from '@/components/admin/StudentListView';
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
}

function AdminDashboardContent() {
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || 'teacher';

    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // View Mode: 'analytics' (default) or 'create' (wizard)
    const [viewMode, setViewMode] = useState<'analytics' | 'create'>('analytics');
    const [showStats, setShowStats] = useState(true);

    // Student Data
    const [students, setStudents] = useState<any[]>([]);
    const [isStudentsLoading, setIsStudentsLoading] = useState(false);

    const fetchStudents = useCallback(async () => {
        setIsStudentsLoading(true);
        // Assuming 3rd grade, 1st class for now
        const data = await getStudentsWithSubmission('', 3, 1);
        if (data && data.length > 0) {
            setStudents(data);
        } else {
            const seeded = await seedMockStudents(3, 1);
            if (seeded) setStudents(seeded.map(s => ({ ...s, submitted: false })));
        }
        setIsStudentsLoading(false);
    }, []);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const fetchDocs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getDocuments();
            setDocuments(data || []);
            if (data && data.length > 0 && !selectedDocId) {
                setSelectedDocId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDocId]);

    useEffect(() => {
        fetchDocs();
    }, []);

    const selectedDoc = documents.find(doc => doc.id === selectedDocId) || null;

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const currentIndex = documents.findIndex(d => d.id === selectedDocId);
                let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;

                if (nextIndex >= 0 && nextIndex < documents.length) {
                    setSelectedDocId(documents[nextIndex].id);
                    setViewMode('analytics');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDocId, documents]);

    // --- Column 1: Navigator (Sidebar) ---
    const sidebar = (
        <div className="flex flex-col h-full mesh-gradient relative">
            {/* Header / Logo */}
            <div className="p-6 pb-2">
                <LinkLogo />
            </div>

            {/* Create Button */}
            <div className="px-4 mt-6 mb-4">
                <button
                    onClick={() => {
                        setSelectedDocId(null);
                        setViewMode('create');
                    }}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-4 rounded-2xl shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98] group relative z-[1000]",
                        documents.length === 0 && "animate-breathe ring-4 ring-indigo-500/30"
                    )}
                >
                    <div className="bg-white/20 p-1 rounded-lg">
                        <Plus size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-sm">새 가정통신문 만들기</span>
                </button>
            </div>

            {/* Document List Header */}
            <div className="px-6 py-2 flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                <span>Recent Documents</span>
                <span className="bg-white/5 px-2 py-0.5 rounded text-[10px]">{documents.length}</span>
            </div>

            {/* Document List (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-2 pb-4">
                {documents.map((doc) => (
                    <button
                        key={doc.id}
                        onClick={() => {
                            setSelectedDocId(doc.id);
                            setViewMode('analytics');
                        }}
                        className={cn(
                            "w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden active:scale-[0.97] border",
                            selectedDocId === doc.id
                                ? "bg-white/[0.08] border-indigo-500/50 shadow-xl"
                                : "bg-transparent border-transparent hover:bg-white/[0.03]"
                        )}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border",
                                doc.type === 'action'
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            )}>
                                {doc.type === 'action' ? '서명' : '안내'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(doc.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                            </span>
                        </div>
                        <h4 className={cn(
                            "text-sm font-bold leading-snug line-clamp-2 transition-colors mb-2",
                            selectedDocId === doc.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                        )}>
                            {doc.title}
                        </h4>

                        {/* Progress Bar in List */}
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-500", doc.status === 'completed' ? "bg-emerald-500" : "bg-indigo-500")}
                                style={{ width: `${(doc.submitted_count / doc.total_count) * 100}%` }}
                            />
                        </div>
                    </button>
                ))}
            </div>

            {/* Fixed Bottom: Settings */}
            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Settings size={16} />
                    </div>
                    <div className="text-left flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-gray-300 group-hover:text-white truncate">환경 설정</p>
                        <p className="text-[10px] text-gray-600 truncate">gatong.creat1324.com</p>
                    </div>
                </button>
            </div>
        </div>
    );

    // --- Column 2: Workspace (Viewer / Wizard) ---
    const viewer = viewMode === 'create' ? (
        <CorrespondenceWizard
            onSuccess={(newDoc) => {
                setDocuments(prev => [newDoc, ...prev]);
                setSelectedDocId(newDoc.id);
                setViewMode('analytics');
            }}
            onCancel={() => {
                setViewMode('analytics');
                if (documents.length > 0) setSelectedDocId(documents[0].id);
            }}
        />
    ) : (
        <ActiveDocumentViewer document={selectedDoc} />
    );

    // --- Column 3: Manager (Stats & List) ---
    const stats = (
        <div className="flex flex-col h-full bg-secondary/20 relative">
            {/* Top: Stats Summary */}
            <div className="shrink-0">
                <SubmissionStats
                    document={selectedDoc ? {
                        title: selectedDoc.title,
                        submittedCount: selectedDoc.submitted_count,
                        totalCount: selectedDoc.total_count,
                        deadline: selectedDoc.deadline || ''
                    } : null}
                />
            </div>

            {/* Middle: Student List */}
            <div className="flex-1 overflow-hidden flex flex-col border-t border-white/5">
                <StudentListView students={students} loading={isStudentsLoading} />
            </div>
        </div>
    );

    // List is hidden in this layout, but we need to pass null or empty fragment to layout
    const list = null;

    // --- Onboarding Tour ---
    const [showTour, setShowTour] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTour');
        // Show tour if no documents exist, not creating, and hasn't opted out
        if (documents.length === 0 && viewMode === 'analytics' && !loading && hasSeenTour !== 'true') {
            setShowTour(true);
        } else {
            setShowTour(false);
        }
    }, [documents, viewMode, loading]);

    const handleStartTour = () => {
        if (dontShowAgain) {
            localStorage.setItem('hasSeenTour', 'true');
        }
        setShowTour(false);
        // Direct Action: Open Wizard
        setSelectedDocId(null);
        setViewMode('create');
    };

    const handleDismissTour = () => {
        if (dontShowAgain) {
            localStorage.setItem('hasSeenTour', 'true');
        }
        setShowTour(false);
    };

    return (
        <>
            <DashboardLayout
                sidebar={sidebar}
                list={list}
                viewer={viewer}
                stats={stats}
                showList={false} // Force 3-column mode by hiding the middle list column
                showStats={true}
            />

            <AnimatePresence>
                {showTour && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center"
                    >
                        {/* Backdrop Click to Dismiss */}
                        <div className="absolute inset-0" onClick={handleDismissTour} />

                        <div className="absolute left-[360px] top-[140px] pointer-events-auto">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-indigo-600 text-white p-6 rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.5)] max-w-sm relative"
                            >
                                <div className="absolute -left-3 top-6 w-0 h-0 border-t-[10px] border-t-transparent border-r-[12px] border-r-indigo-600 border-b-[10px] border-b-transparent"></div>
                                <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                                    <Sparkles size={20} className="text-yellow-300 animate-pulse" />
                                    환영합니다, 선생님!
                                </h3>
                                <p className="text-sm font-medium leading-relaxed opacity-90 mb-4">
                                    아직 작성된 가정통신문이 없네요.<br />
                                    <strong>[새 가정통신문 만들기]</strong> 버튼을 눌러서<br />
                                    첫 번째 통신문을 30초 만에 만들어보세요!
                                </p>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleStartTour}
                                        className="w-full text-xs bg-white/20 hover:bg-white/30 py-3 rounded-xl font-bold transition-colors shadow-lg"
                                    >
                                        알겠어요, 지금 시작할게요!
                                    </button>

                                    <label className="flex items-center gap-2 text-[10px] opacity-70 cursor-pointer hover:opacity-100 transition-opacity">
                                        <input
                                            type="checkbox"
                                            checked={dontShowAgain}
                                            onChange={(e) => setDontShowAgain(e.target.checked)}
                                            className="rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-offset-indigo-600"
                                        />
                                        다음에 다시 보지 않기
                                    </label>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Sub-components
function LinkLogo() {
    return (
        <div className="flex items-center gap-3 select-none transform origin-left transition-all duration-300">
            <div className="w-9 h-9 nav-logo-icon rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="font-black text-white text-lg">G</span>
            </div>
            <div className="flex flex-col nav-logo-text leading-none">
                <span className="font-black text-base text-white tracking-tight">GATONG</span>
                <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">PASS ADMIN</span>
            </div>
        </div>
    );
}

function Spinner() {
    return (
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-white/5" />
            <motion.div
                className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
                <Spinner />
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}

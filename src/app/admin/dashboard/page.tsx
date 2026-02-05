'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense, useRef } from 'react';
import {
    LayoutDashboard, Users, FileText, Send, Upload,
    Settings, Bell, Search, CheckCircle, XCircle, MoreVertical, AlertTriangle,
    Keyboard, ChevronRight, Filter, Download, ExternalLink, MousePointer2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

// Components
import DashboardLayout from '@/components/admin/DashboardLayout';
import ActiveDocumentViewer from '@/components/admin/ActiveDocumentViewer';
import SubmissionStats from '@/components/admin/SubmissionStats';
import UploadModal from '@/components/admin/UploadModal';

// Services
import { getDocuments } from '@/lib/docService';

// Types
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

    const [activeTab, setActiveTab] = useState('dashboard');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

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
                }
            }

            if (e.key === 'Escape') {
                setSelectedDocId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDocId, documents]);

    // Sidebar Content
    const sidebar = (
        <div className="flex flex-col h-full mesh-gradient">
            <div className="p-8">
                <LinkLogo />
                <div className="mt-8 flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-black text-white italic">K</div>
                    <div>
                        <p className="text-[11px] font-black text-white/90 truncate leading-none">경성전자고등학교</p>
                        <div className="mt-1 flex items-center gap-1.5 ">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{role === 'head' ? '학년 부장' : '담임 교사'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1">
                <NavItem icon={<LayoutDashboard size={20} />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={<FileText size={20} />} label="통신문 보관함" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} />
                <NavItem icon={<Users size={20} />} label="학급 명렬표" active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
                <NavItem icon={<Settings size={20} />} label="관리 설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </nav>

            <div className="p-6 border-t border-white/[0.05] space-y-6">
                <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 rotate-12 group-hover:opacity-10 transition-opacity">
                        <Keyboard size={48} />
                    </div>
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Shortcuts</p>
                        <Keyboard size={12} className="text-gray-600" />
                    </div>
                    <div className="space-y-2">
                        <ShortcutHint kbd="↑↓" label="목록 이동" />
                        <ShortcutHint kbd="Enter" label="상세 보기" />
                        <ShortcutHint kbd="Space" label="미리보기" />
                    </div>
                </div>
                <button className="w-full py-4 bg-white/[0.03] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-2xl text-[11px] font-black transition-all border border-white/[0.05] hover:border-rose-500/20 active:scale-[0.98] uppercase tracking-widest">
                    Sign Out
                </button>
            </div>
        </div>
    );

    // Column 1: Document List
    const list = (
        <div className="flex flex-col h-full bg-background/40 backdrop-blur-md">
            <div className="p-6 border-b border-white/[0.05] space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-white flex items-center gap-2.5 uppercase tracking-wide">
                        <FileText size={18} className="text-indigo-500" />
                        Document Inbox
                    </h2>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-xl shadow-indigo-900/40 active:scale-90"
                    >
                        <Upload size={16} />
                    </button>
                </div>
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-3 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <Badge label="전체" active />
                    <Badge label="진행중" />
                    <Badge label="마감" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-4">
                <div className="space-y-2">
                    {documents.filter(d => d.title.includes(searchQuery)).map((doc) => (
                        <button
                            key={doc.id}
                            onClick={() => setSelectedDocId(doc.id)}
                            className={cn(
                                "w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden active:scale-[0.97]",
                                selectedDocId === doc.id
                                    ? "bg-indigo-600/[0.08] border border-indigo-500/40 shadow-xl"
                                    : "hover:bg-white/[0.03] border border-transparent"
                            )}
                        >
                            <div className="flex justify-between items-center mb-2.5">
                                <span className={cn(
                                    "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border",
                                    doc.type === 'action'
                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                )}>
                                    {doc.type === 'action' ? '서명' : '안내'}
                                </span>
                                <span className="text-[9px] text-gray-600 font-mono italic">
                                    {new Date(doc.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                                </span>
                            </div>
                            <h4 className={cn(
                                "text-xs font-bold leading-relaxed line-clamp-2 transition-colors",
                                selectedDocId === doc.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                            )}>
                                {doc.title}
                            </h4>

                            <div className="mt-4 pt-4 border-t border-white/[0.03] flex items-center justify-between">
                                <div className="flex items-center gap-2.5 flex-1">
                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(doc.submitted_count / doc.total_count) * 100}%` }}
                                            className={cn("h-full rounded-full", doc.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500')}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-black font-mono w-8 text-right">{Math.round((doc.submitted_count / doc.total_count) * 100)}%</span>
                                </div>
                                {selectedDocId === doc.id && (
                                    <motion.div layoutId="doc-active-indicator" className="ml-3 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // Column 2: Document Viewer
    const viewer = (
        <ActiveDocumentViewer document={selectedDoc} />
    );

    // Column 3: Stats
    const stats = (
        <SubmissionStats
            document={selectedDoc ? {
                title: selectedDoc.title,
                submittedCount: selectedDoc.submitted_count,
                totalCount: selectedDoc.total_count,
                deadline: selectedDoc.deadline || ''
            } : null}
        />
    );

    return (
        <>
            <DashboardLayout
                sidebar={sidebar}
                list={list}
                viewer={viewer}
                stats={stats}
            />
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={(newDoc) => {
                    setDocuments(prev => [newDoc, ...prev]);
                    setSelectedDocId(newDoc.id);
                }}
            />
        </>
    );
}

// Sub-components
function LinkLogo() {
    return (
        <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter italic">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-900/40 transform -rotate-6">
                <span className="not-italic text-white">G</span>
            </div>
            <span>Gatong<span className="text-indigo-500">Pass</span></span>
        </h1>
    );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black text-[13px] group relative uppercase tracking-wider",
                active
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-200"
            )}
        >
            <span className={cn("transition-all duration-300", active ? "text-indigo-500 scale-110" : "text-gray-600 group-hover:text-gray-400")}>{icon}</span>
            <span>{label}</span>
            {active && (
                <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-white/[0.03] border border-white/[0.05] rounded-2xl -z-10 shadow-2xl overflow-hidden"
                >
                    <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500" />
                </motion.div>
            )}
        </button>
    );
}

function Badge({ label, active }: { label: string, active?: boolean }) {
    return (
        <span className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black cursor-pointer transition-all border whitespace-nowrap uppercase tracking-widest",
            active
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/30"
                : "bg-white/[0.03] border-white/[0.05] text-gray-500 hover:text-gray-300"
        )}>
            {label}
        </span>
    );
}

function ShortcutHint({ kbd, label }: { kbd: string, label: string }) {
    return (
        <div className="flex items-center justify-between text-[10px] text-gray-500 group cursor-default">
            <span className="font-bold opacity-60 group-hover:opacity-100 transition-opacity uppercase">{label}</span>
            <kbd className="bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 font-mono group-hover:bg-indigo-500/20 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all uppercase">{kbd}</kbd>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
                <Spinner />
                <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.3em] animate-pulse">Initializing Gate</p>
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
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
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]" />
            </div>
        </div>
    );
}

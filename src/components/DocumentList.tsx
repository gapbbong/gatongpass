'use client';

import { useState, useEffect } from 'react';
import { DocMetadata } from '@/lib/documentParser'; // We'll need to export interface from client side or share types
import { FileText, File, Download, PenTool, ExternalLink, Calendar, Filter, Share2, ClipboardList, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import SignatureModal from './SignatureModal';
import { useSearchParams, useRouter } from 'next/navigation';

// Duplicate interface here if build fails on import, or better move types to a shared file.
// For now, assuming direct import works or redefining.
interface DocMetadataClient {
    fileName: string;
    title: string;
    year: string;
    targetGrade: number[];
    targetDept: string[];
    type: 'notice' | 'action';
    path: string;
}

export default function DocumentList() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filters state
    const [selectedGrade, setSelectedGrade] = useState<string>(searchParams.get('grade') || '');
    const [selectedDept, setSelectedDept] = useState<string>(searchParams.get('dept') || '');
    const [isAdminMode, setIsAdminMode] = useState(false);

    const [documents, setDocuments] = useState<DocMetadataClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<DocMetadataClient | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, [selectedGrade, selectedDept]); // Refetch when filters change

    const fetchDocuments = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedGrade) params.append('grade', selectedGrade);
        if (selectedDept) params.append('dept', selectedDept);

        const res = await fetch(`/api/documents?${params.toString()}`);
        const data = await res.json();
        setDocuments(data.files || []);
        setLoading(false);
    };

    const updateFilter = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        if (value) {
            newParams.set(key, value);
            if (key === 'grade') setSelectedGrade(value);
            if (key === 'dept') setSelectedDept(value);
        } else {
            newParams.delete(key);
            if (key === 'grade') setSelectedGrade('');
            if (key === 'dept') setSelectedDept('');
        }
        router.push(`?${newParams.toString()}`);
    };

    const handleSignClick = (doc: DocMetadataClient) => {
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const copyLink = (doc?: DocMetadataClient) => {
        let url = window.location.origin;
        if (doc) {
            // Link to specific document context? 
            // Or just the current filtered view?
            // Let's copy the current filtered view + highlight logic if we had it.
            // For distinctness, let's copy the download link or a hypothetical deep link?
            // User asked for "Kakao link". Usually linking to the App with filters applied is best.

            // If doc provided, maybe emphasize it? For now, just sharing current view is safest unless we implement single-doc view.
            // Let's share the direct file link for simplicity or the filtered page.
            url += `?grade=${selectedGrade}&dept=${selectedDept}`;
        } else {
            url += `?grade=${selectedGrade}&dept=${selectedDept}`;
        }
        navigator.clipboard.writeText(url);
        alert('필터가 적용된 페이지 링크가 복사되었습니다. 카카오톡에 붙여넣으세요.');
    };

    return (
        <div className="space-y-6">
            {/* Filter Section */}
            <div className="glass-panel p-4 rounded-xl space-y-4">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-medium">
                        <Filter className="w-5 h-5 text-blue-400" />
                        <span>맞춤 필터</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAdminMode(!isAdminMode)}
                            className={cn("text-xs px-2 py-1 rounded border", isAdminMode ? "bg-red-500/20 border-red-500 text-red-400" : "border-white/10 text-gray-500")}
                        >
                            {isAdminMode ? '선생님 모드 ON' : '선생님 모드 OFF'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <select
                        value={selectedGrade}
                        onChange={(e) => updateFilter('grade', e.target.value)}
                        className="bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">학년 전체</option>
                        <option value="1">1학년</option>
                        <option value="2">2학년</option>
                        <option value="3">3학년</option>
                    </select>

                    <select
                        value={selectedDept}
                        onChange={(e) => updateFilter('dept', e.target.value)}
                        className="bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">학과 전체</option>
                        <option value="semicon">반도체기술사관</option>
                        <option value="iot">IoT전기과</option>
                        <option value="game">게임콘텐츠과</option>
                        <option value="doje">도제학교</option>
                    </select>

                    {isAdminMode && (
                        <button
                            onClick={() => copyLink()}
                            className="col-span-2 md:col-span-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                            현재 필터 링크 파기
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-500">통신문을 불러오고 있습니다...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc, idx) => (
                        <motion.div
                            key={doc.fileName}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={cn(
                                "group relative rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between border",
                                doc.type === 'action'
                                    ? "bg-gradient-to-br from-blue-900/20 to-purple-900/10 border-blue-500/30 hover:border-blue-500/50"
                                    : "glass-panel bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2">
                                        {/* Tags */}
                                        {doc.type === 'action' && (
                                            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded shadow-sm">
                                                서명/제출 필요
                                            </span>
                                        )}
                                        {doc.targetGrade.includes(0) ? (
                                            <span className="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded">전체</span>
                                        ) : (
                                            doc.targetGrade.map(g => (
                                                <span key={g} className="bg-white/10 text-blue-300 text-xs px-2 py-1 rounded">{g}학년</span>
                                            ))
                                        )}
                                    </div>
                                    {isAdminMode && (
                                        <button className="text-gray-500 hover:text-white" title="취합 현황 보기 (준비중)">
                                            <ClipboardList className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                <h3 className="text-lg font-semibold text-gray-100 mb-3 leading-snug break-keep">
                                    {doc.title}
                                </h3>
                            </div>

                            <div className="mt-4 space-y-3">
                                <div className="flex gap-2 flex-wrap">
                                    {doc.type === 'action' ? (
                                        <button
                                            onClick={() => handleSignClick(doc)}
                                            className="flex-1 min-w-[120px] py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                                        >
                                            <PenTool className="w-4 h-4" />
                                            확인 및 제출
                                        </button>
                                    ) : (
                                        <a
                                            href={doc.path}
                                            target="_blank"
                                            className="flex-1 min-w-[120px] py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                                        >
                                            <FileText className="w-4 h-4" />
                                            문서 보기
                                        </a>
                                    )}
                                    <a
                                        href={doc.path}
                                        target="_blank"
                                        className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                                        title="다운로드"
                                    >
                                        <Download className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {selectedDoc && (
                <SignatureModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    docName={selectedDoc.fileName}
                />
            )}
        </div>
    );
}

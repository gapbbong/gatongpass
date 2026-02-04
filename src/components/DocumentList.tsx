'use client';

import { useEffect, useState } from 'react';
import { FileText, File, Download, PenTool, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import SignatureModal from './SignatureModal';

interface DocFile {
    name: string;
    path: string;
    type: string;
}

export default function DocumentList() {
    const [documents, setDocuments] = useState<DocFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetch('/api/documents')
            .then(res => res.json())
            .then(data => {
                setDocuments(data.files || []);
                setLoading(false);
            });
    }, []);

    const handleSignClick = (doc: DocFile) => {
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const handleShare = async (doc: DocFile) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: '가정통신문',
                    text: doc.name,
                    url: window.location.origin + doc.path,
                });
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            // Fallback: Copy link
            navigator.clipboard.writeText(window.location.origin + doc.path);
            alert('링크가 복사되었습니다!');
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {documents.map((doc, idx) => (
                    <motion.div
                        key={doc.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative glass-panel rounded-2xl p-6 hover:bg-white/5 transition-all duration-300 flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={cn(
                                "p-3 rounded-lg flex items-center justify-center",
                                doc.type === 'pdf' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                            )}>
                                {doc.type === 'pdf' ? <FileText className="w-6 h-6" /> : <File className="w-6 h-6" />}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleShare(doc)}
                                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-100 line-clamp-2 mb-2 leading-relaxed">
                                {doc.name.replace(/\.[^/.]+$/, "")}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="bg-white/10 px-2 py-1 rounded">2025학년도</span>
                                <span className="uppercase">{doc.type}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-auto">
                            <a
                                href={doc.path}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium transition-all"
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Download className="w-4 h-4" />
                                다운로드
                            </a>
                            <button
                                onClick={() => handleSignClick(doc)}
                                className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                <PenTool className="w-4 h-4" />
                                확인 및 서명
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {selectedDoc && (
                <SignatureModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    docName={selectedDoc.name}
                />
            )}
        </>
    );
}

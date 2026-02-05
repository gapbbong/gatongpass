'use client';

import React from 'react';
import { FileText, Search, Maximize2, Download, ExternalLink, MousePointer2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActiveDocumentViewerProps {
    document: {
        title: string;
        path: string;
    } | null;
}

export default function ActiveDocumentViewer({ document }: ActiveDocumentViewerProps) {
    if (!document) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-background/50 backdrop-blur-sm">
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20 animate-pulse">
                    <FileText className="w-10 h-10 text-indigo-400/50" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">선택된 문서 없음</h3>
                <p className="text-muted-foreground max-w-xs text-sm">왼쪽 목록에서 열람하실 가정통신문을 선택해 주세요.</p>
                <div className="mt-8 flex gap-2">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-500 border border-white/10 uppercase tracking-widest font-bold">Ready for scan</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden relative">
            {/* Floating Viewer Controls Header */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3 pr-4 border-r border-white/10 mr-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                        <FileText className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h2 className="text-sm font-bold text-white max-w-[300px] truncate">{document.title}</h2>
                </div>

                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
                    <ControlButton icon={<Search className="rotate-90" size={16} />} />
                    <div className="px-2 text-xs font-mono text-gray-400 select-none">100%</div>
                    <ControlButton icon={<Search size={16} />} />
                </div>

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                <ControlButton icon={<Maximize2 size={16} />} />
                <ControlButton icon={<Download size={16} />} active />

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white">
                    <ExternalLink size={14} />
                    <span className="text-xs font-bold">새 창</span>
                </button>
            </div>

            {/* Actual PDF Container */}
            <div className="flex-1 overflow-auto p-20 pt-28 flex justify-center bg-[#0d0d0d] custom-scrollbar">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={document.title}
                    className="w-full max-w-4xl bg-[#1a1d24] aspect-[1/1.414] rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col relative group"
                >
                    {/* Mock PDF Content Styling */}
                    <div className="p-16 flex-1 flex flex-col gap-8 opacity-20 pointer-events-none select-none">
                        <div className="h-8 bg-white/10 rounded w-1/2" />
                        <div className="h-4 bg-white/10 rounded w-3/4" />
                        <div className="h-4 bg-white/10 rounded w-full" />
                        <div className="h-4 bg-white/10 rounded w-full" />
                        <div className="h-4 bg-white/10 rounded w-5/6" />
                        <div className="mt-auto h-32 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-600">SIGNATURE AREA</span>
                        </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-indigo-900/50 flex items-center gap-2">
                            <MousePointer2 size={18} />
                            <span>PDF 렌더링 최적화 됨</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Footer / Status bar */}
            <footer className="h-10 border-t border-white/5 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-40">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-2 text-glow">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        LIVE SCANNING
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono italic">HASH: 7F82...E9A1</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
                    <span>PAGE 1 / 1</span>
                    <span className="text-indigo-400 font-bold cursor-pointer hover:underline transition-all" onClick={() => window.open(document.path)}>원본 다운로드</span>
                </div>
            </footer>
        </div>
    );
}

function ControlButton({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
    return (
        <button className={cn(
            "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
            active
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 glow-indigo"
                : "text-gray-400 hover:text-white hover:bg-white/5"
        )}>
            {icon}
        </button>
    );
}

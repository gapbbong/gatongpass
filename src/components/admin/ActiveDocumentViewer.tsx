'use client';

import React from 'react';
import {
    FileText, Search, Maximize2, Download, ExternalLink,
    MousePointer2, AlertCircle, ArrowLeft, ArrowRight, MoreVertical, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ActiveDocumentViewerProps {
    document: {
        title: string;
        path: string;
        type?: string;
    } | null;
}

export default function ActiveDocumentViewer({ document }: ActiveDocumentViewerProps) {
    return (
        <div className="flex-1 flex flex-col h-full bg-background/20 relative">
            {/* Professional Header Area - Always Visible */}
            <header className="px-8 py-5 border-b border-white/[0.03] bg-background/40 backdrop-blur-3xl flex items-center justify-between relative z-20">
                <div className="absolute right-8 top-0 h-full flex items-center pointer-events-none z-0">
                    <h1 className="text-[200px] font-black text-white/[0.01] tracking-tighter leading-none select-none">GATONG</h1>
                </div>
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20 group">
                        <FileText size={20} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                        {document ? (
                            <>
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-base font-black text-white tracking-tight uppercase tracking-wider">{document.title}</h2>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10 uppercase tracking-widest">v1.2</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Active Workspace</span>
                                    </div>
                                    <div className="w-px h-2 bg-white/10" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                        {document.type === 'action' ? 'Signature Tracking' : 'Information Flow'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-base font-black text-white/50 tracking-tight uppercase tracking-wider">No Selection</h2>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[11px] font-black text-white/90 leading-none">경성전자고등학교</span>
                    </div>
                    <div className="w-px h-8 bg-white/10 mr-2" />
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-gray-400 hover:text-white group">
                        <ExternalLink size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-gray-400 hover:text-white">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </header>

            {/* Expansive Document Canvas */}
            <div className="flex-1 overflow-auto p-12 lg:p-16 flex justify-center bg-background/50 custom-scrollbar relative">
                <AnimatePresence mode="wait">
                    {document ? (
                        <motion.div
                            key={document.path}
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.02, y: -10 }}
                            className="w-full max-w-5xl bg-[#111216] rounded-[2.5rem] border border-white/[0.05] p-1 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.7)] flex flex-col"
                        >
                            <div className="aspect-[1/1.414] w-full bg-[#1a1b21] rounded-[2.4rem] overflow-hidden relative group">
                                <iframe
                                    src={document.path}
                                    className="w-full h-full border-none opacity-90 group-hover:opacity-100 transition-opacity"
                                    title={document.title}
                                />
                                {/* Glass overlay frame */}
                                <div className="absolute inset-0 pointer-events-none border-[1.5rem] border-[#1a1b21] rounded-[2.4rem] shadow-inner" />

                                {/* Overlay Interaction simulation */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                                    <div className="px-6 py-3 bg-indigo-600/90 backdrop-blur-xl text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl border border-white/20">
                                        Document Preview Active
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-70">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20 animate-pulse">
                                <Sparkles className="w-10 h-10 text-indigo-400/50" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">문서를 선택해주세요</h3>
                            <p className="text-gray-500 max-w-xs text-[11px] font-bold uppercase tracking-[0.1em] leading-relaxed">
                                Select a document from the left panel to begin your administrative workflow.
                            </p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Smart Floating Controls - Only show if document exists */}
            {document && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30">
                    <div className="flex items-center gap-1.5 p-2 bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        <ControlButton icon={<ArrowLeft size={18} />} label="Prev" />
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <div className="px-6 py-2.5 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Page</span>
                            <span className="text-xs font-black text-white font-mono tracking-tighter leading-none">01 / 04</span>
                        </div>
                        <div className="h-4 w-px bg-white/10 mx-1" />
                        <ControlButton icon={<ArrowRight size={18} />} label="Next" />
                        <div className="w-2" />
                        <button className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-[1.5rem] font-black text-[13px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 active:scale-95 group">
                            <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            Execute
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function ControlButton({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <button className="flex flex-col items-center gap-1 p-2.5 px-4 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90 group">
            {icon}
            <span className="text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">{label}</span>
        </button>
    );
}

function Sparkles({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
    );
}

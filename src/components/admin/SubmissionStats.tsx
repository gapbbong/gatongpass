'use client';

import React from 'react';
import {
    Users, Calendar, CheckCircle2, AlertCircle, Clock,
    ArrowRight, Download, Send, Settings, Sparkles, Filter,
    ExternalLink, BarChart3, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SubmissionStatsProps {
    document: {
        title: string;
        submittedCount: number;
        totalCount: number;
        deadline: string;
    } | null;
}

export default function SubmissionStats({ document }: SubmissionStatsProps) {
    if (!document) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-20 text-center select-none grayscale">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <BarChart3 className="w-8 h-8" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest italic tracking-[0.2em]">Ready for Analysis</p>
            </div>
        );
    }

    const rate = Math.round((document.submittedCount / document.totalCount) * 100);

    return (
        <div className="flex flex-col h-full bg-background/40 backdrop-blur-sm custom-scrollbar">
            {/* Minimal Header */}
            <div className="p-8 pb-2 flex items-center justify-between">
                <div>
                    <h2 className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Live Analytics</h2>
                    <h3 className="text-xl font-black text-white mt-1">제출 현황 요약</h3>
                </div>
                <button className="p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all active:scale-95">
                    <Settings size={16} className="text-gray-400" />
                </button>
            </div>

            <div className="p-8 pt-6 space-y-10 flex-1">
                {/* Visual Progress - Simplified */}
                <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-white tracking-tighter">{rate}%</span>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Complete</span>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-mono text-indigo-400 font-bold">{document.submittedCount} / {document.totalCount}</p>
                            <p className="text-[10px] text-gray-600 font-bold uppercase mt-1 tracking-wider">Submitted Students</p>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rate}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        />
                    </div>
                </div>

                {/* Compact Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={14} className="text-rose-400" />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">D-Day</span>
                        </div>
                        <p className="text-base font-black text-white">2일 남음</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-emerald-400" />
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Status</span>
                        </div>
                        <p className="text-base font-black text-white">순항 중</p>
                    </div>
                </div>

                {/* Priority Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => alert('미제출자 12명에게 알람톡이 발송되었습니다.')}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl shadow-indigo-900/40 group active:scale-[0.98] font-black text-xs uppercase tracking-widest"
                    >
                        <Send size={16} />
                        미제출자 일괄 독촉
                    </button>
                    <button
                        onClick={() => alert('구글 스프레드시트로 데이터를 내보냅니다.')}
                        className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-2xl transition-all active:scale-[0.98] font-black text-xs uppercase tracking-widest"
                    >
                        <Download size={16} />
                        데이터 내보내기
                    </button>
                </div>

                {/* Activity Feed - Refined */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Recent Activity</h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-500 uppercase">Live</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="flex items-center p-3 rounded-xl hover:bg-white/[0.03] transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mr-4 border border-indigo-500/10 group-hover:border-indigo-500/30 transition-all font-mono text-[10px] font-black text-indigo-400">
                                    {i}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-200">학생명{i}</p>
                                    <p className="text-[10px] text-gray-600 mt-0.5 font-medium">{i * 3}분 전 제출</p>
                                </div>
                                <div className="text-[9px] font-black text-gray-500 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">
                                    Success
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, color, label, value, secondary }: { icon: React.ReactNode, color: string, label: string, value: string, secondary: string }) {
    return (
        <div className="p-5 bg-secondary/40 border border-white/5 rounded-3xl hover:bg-secondary/60 transition-all">
            <div className={cn("p-2 rounded-xl mb-4 w-fit inline-block bg-white/5", color)}>
                {icon}
            </div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
            <p className="text-lg font-black text-white mb-1">{value}</p>
            <p className="text-[9px] font-bold text-gray-600 uppercase italic">{secondary}</p>
        </div>
    );
}

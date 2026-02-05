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
                <p className="text-sm font-bold uppercase tracking-widest italic">Waiting for data...</p>
            </div>
        );
    }

    const rate = Math.round((document.submittedCount / document.totalCount) * 100);

    return (
        <div className="flex flex-col h-full mesh-gradient custom-scrollbar">
            {/* Section Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-indigo-400" />
                        실시간 제출 현황
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">실시간으로 응답이 업데이트 되고 있습니다.</p>
                </div>
                <button className="p-2.5 bg-secondary/50 rounded-xl border border-white/5 hover:bg-secondary transition-all">
                    <Filter size={16} className="text-gray-400" />
                </button>
            </div>

            <div className="p-8 pt-4 space-y-8 flex-1">
                {/* Main Progress Circle */}
                <div className="bg-secondary/40 rounded-3xl p-8 border border-white/[0.05] relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp size={100} className="rotate-12" />
                    </div>

                    <div className="flex items-center gap-8 relative z-10">
                        <div className="relative flex items-center justify-center">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle className="text-white/5" strokeWidth="6" stroke="currentColor" fill="transparent" r="44" cx="48" cy="48" />
                                <motion.circle
                                    className="text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                    strokeWidth="6"
                                    strokeDasharray={44 * 2 * Math.PI}
                                    initial={{ strokeDashoffset: 44 * 2 * Math.PI }}
                                    animate={{ strokeDashoffset: (44 * 2 * Math.PI) * (1 - rate / 100) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="44" cx="48" cy="48"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-white text-glow">{rate}%</span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-bold text-muted-foreground">제출 진행률</span>
                                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded tracking-tighter">GOOD PROGRESS</span>
                            </div>
                            <div className="flex items-end gap-1.5">
                                <span className="text-3xl font-black text-white">{document.submittedCount}</span>
                                <span className="text-lg font-bold text-muted-foreground pb-0.5">/ {document.totalCount}명</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard icon={<Clock size={16} />} color="text-rose-400" label="남은 시간" value="2일 5시간" secondary="2026-03-10 마감" />
                    <StatCard icon={<Users size={16} />} color="text-indigo-400" label="제출 유형" value="서명 날인" secondary="실명 확인 필요" />
                </div>

                {/* Actions Section */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Quick Actions</h3>
                    <div className="grid gap-3">
                        <button className="flex items-center justify-between p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl shadow-indigo-900/30 group active:scale-[0.98]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg"><Send size={16} /></div>
                                <span className="font-bold text-sm">미제출자 전체 독촉</span>
                            </div>
                            <ArrowRight size={18} className="opacity-50 group-hover:opacity-100 transition-all translate-x-0 group-hover:translate-x-1" />
                        </button>
                        <button className="flex items-center justify-between p-4 bg-secondary border border-white/5 hover:bg-secondary/70 text-gray-300 rounded-2xl transition-all group active:scale-[0.98]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 rounded-lg"><Download size={16} /></div>
                                <span className="font-bold text-sm">구글 스프레드시트 내보내기</span>
                            </div>
                            <ExternalLink size={18} className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Feed Section */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">실시간 응답 피드</h3>
                        <span className="text-[9px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full font-bold">LIVE UPDATE</span>
                    </div>

                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={i}
                                className="flex items-center p-3.5 bg-secondary/50 rounded-2xl border border-white/5 group hover:bg-secondary transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mr-4 border border-white/5 group-hover:border-indigo-500/30 transition-all">
                                    <span className="text-[10px] font-black text-white">0{i}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-200">학생명{i}</p>
                                    <p className="text-[10px] text-muted-foreground">{i * 3}분 전 제출 완료</p>
                                </div>
                                <div className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded-lg border border-indigo-400/10">참가</div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Settings Link Footer */}
            <div className="p-6 bg-secondary/80 backdrop-blur-md border-t border-white/5 mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium hover:text-white transition-colors cursor-pointer group">
                    <Settings size={14} className="group-hover:rotate-45 transition-transform" />
                    <span>응답 수집 설정 최적화</span>
                </div>
                <ArrowRight size={14} className="text-gray-600" />
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

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { School, User, Lock, ChevronRight, Check, Briefcase, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AdminLoginPage() {
    const router = useRouter();
    const [selectedSchool, setSelectedSchool] = useState('');
    const [role, setRole] = useState<'teacher' | 'head' | 'staff' | ''>('');
    const submitRef = useRef<HTMLButtonElement>(null);

    const handleLogin = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedSchool || !role) return;
        router.push(`/admin/dashboard?school=${selectedSchool}&role=${role}`);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (role) setRole('');
                else if (selectedSchool) setSelectedSchool('');
                else router.push('/');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [role, selectedSchool, router]);

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-indigo-500/30 overflow-hidden relative">
            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-20 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-2xl"
            >
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl p-8 md:p-10 relative overflow-hidden group">
                    {/* Glossy sheen effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="flex flex-col md:flex-row gap-10">

                        {/* Left Side: Header & Info */}
                        <div className="md:w-1/3 flex flex-col justify-between space-y-6">
                            <div>
                                <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                                    <Lock className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">교직원<br />로그인</h1>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    학교 관리의 모든 것,<br />
                                    <span className="text-indigo-400 font-medium">GatongPass</span> 하나로.
                                </p>
                            </div>

                            <div className="hidden md:block">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                                    <p className="text-xs text-gray-400 mb-2 font-medium">✨ New Update</p>
                                    <p className="text-xs text-gray-300 leading-snug">
                                        이제 <strong>업무 담당 선생님</strong>도<br />가정통신문을 발송할 수 있어요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Form */}
                        <form onSubmit={handleLogin} className="flex-1 space-y-6">

                            {/* School Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">소속 학교</label>
                                <div className="relative group/input">
                                    <select
                                        value={selectedSchool}
                                        onChange={(e) => setSelectedSchool(e.target.value)}
                                        className="w-full bg-[#0a0a0a]/50 hover:bg-[#0a0a0a]/70 border border-white/10 hover:border-indigo-500/50 rounded-xl px-4 py-3.5 text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer outline-none"
                                        required
                                    >
                                        <option value="" className="bg-gray-900 text-gray-500">학교를 선택해주세요</option>
                                        <option value="kyungsung" className="bg-gray-900">경성전자고등학교 (Demo)</option>
                                        <option value="seoul" className="bg-gray-900">서울고등학교</option>
                                        <option value="busan" className="bg-gray-900">부산기계공업고등학교</option>
                                        <option value="other" className="bg-gray-900">기타 학교 (SaaS 신청)</option>
                                    </select>
                                    <ChevronRight className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none group-hover/input:text-indigo-400 transition-colors" />
                                </div>
                            </div>

                            {/* Role Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">직책 선택</label>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <RoleCard
                                            selected={role === 'teacher'}
                                            onClick={() => setRole('teacher')}
                                            icon={<User className="w-5 h-5" />}
                                            label="담임 교사"
                                        />
                                        <RoleCard
                                            selected={role === 'head'}
                                            onClick={() => setRole('head')}
                                            icon={<School className="w-5 h-5" />}
                                            label="학년 부장"
                                        />
                                    </div>
                                    <RoleCard
                                        selected={role === 'staff'}
                                        onClick={() => setRole('staff')}
                                        icon={<Briefcase className="w-5 h-5" />}
                                        label="업무 담당"
                                        sublabel="방과후, 교육복지 등"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                {selectedSchool === 'other' ? (
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-sm text-center">
                                        <Sparkles className="w-4 h-4 inline-block mr-1" />
                                        도입 문의가 필요합니다.
                                    </div>
                                ) : (
                                    <button
                                        ref={submitRef}
                                        type="submit"
                                        disabled={!selectedSchool || !role}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 active:scale-[0.98] group/btn"
                                    >
                                        관리자 접속
                                        <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Footer / Shortcuts */}
                <div className="mt-8 text-center opacity-60">
                    <p className="text-[10px] text-gray-500 flex justify-center gap-3">
                        <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-sans">ESC</kbd> 초기화</span>
                        <span className="w-px h-3 bg-gray-700"></span>
                        <span className="flex items-center gap-1.5"><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-sans">Enter</kbd> 접속</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

function RoleCard({ selected, onClick, icon, label, sublabel }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string, sublabel?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative p-4 rounded-xl border transition-all duration-300 flex items-center gap-3 group outline-none text-left w-full overflow-hidden",
                selected
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-100 shadow-[0_0_30px_-10px_rgba(99,102,241,0.3)]"
                    : "bg-[#0a0a0a]/40 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10 hover:text-gray-200"
            )}
        >
            {selected && (
                <motion.div
                    layoutId="selected-glow"
                    className="absolute inset-0 bg-indigo-500/10 pointer-events-none"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                />
            )}

            <div className={cn(
                "p-2.5 rounded-lg transition-colors shrink-0",
                selected ? "bg-indigo-500 text-white shadow-lg" : "bg-white/5 text-gray-500 group-hover:text-gray-300"
            )}>
                {icon}
            </div>

            <div className="flex flex-col">
                <span className={cn("font-medium text-sm transition-colors", selected ? "text-white" : "")}>{label}</span>
                {sublabel && <span className="text-[10px] text-gray-500 font-normal">{sublabel}</span>}
            </div>

            {selected && (
                <div className="absolute right-4 text-indigo-400 animate-in fade-in zoom-in duration-300">
                    <Check className="w-4 h-4" />
                </div>
            )}
        </button>
    );
}

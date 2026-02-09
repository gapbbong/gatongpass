'use client';

import React, { useState, useEffect } from 'react';
import { SchoolConfig, getSchoolConfig, saveSchoolConfig, Department } from '@/lib/schoolConfig';
import { X, Plus, Trash2, Save, Building2, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

interface SchoolSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SchoolSettingsModal({ isOpen, onClose }: SchoolSettingsModalProps) {
    const { theme, setTheme } = useTheme();
    const [config, setConfig] = useState<SchoolConfig>(getSchoolConfig());
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isEmailValid = !config.contactEmail || emailRegex.test(config.contactEmail);

    useEffect(() => {
        if (isOpen) {
            setConfig(getSchoolConfig()); // Refresh on open
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!isEmailValid) {
            alert('유효한 이메일 형식을 입력해 주세요.');
            return;
        }
        saveSchoolConfig(config);
        onClose();
        window.location.reload();
    };

    const addDepartment = () => {
        const newId = Date.now().toString();
        const lastDept = config.departments[config.departments.length - 1];
        const newStart = lastDept ? lastDept.classRange.end + 1 : 1;

        setConfig(prev => ({
            ...prev,
            departments: [...prev.departments, {
                id: newId,
                name: '새 학과',
                shortName: '학과',
                classRange: { start: newStart, end: newStart + 1 }
            }]
        }));
    };

    const removeDepartment = (id: string) => {
        setConfig(prev => ({
            ...prev,
            departments: prev.departments.filter(d => d.id !== id)
        }));
    };

    const updateDepartment = (id: string, updates: Partial<Department>) => {
        setConfig(prev => ({
            ...prev,
            departments: prev.departments.map(d =>
                d.id === id ? { ...d, ...updates } : d
            )
        }));
    };

    const handleGradeChange = (val: string) => {
        const nums = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        setConfig(prev => ({ ...prev, grades: nums }));
    };

    if (!isOpen) return null;

    const handleThemeChange = (mode: 'light' | 'dark') => {
        setConfig(prev => ({ ...prev, displayMode: mode }));
        setTheme(mode);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[var(--color-card)] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Building2 size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--color-foreground)]">학교 기본 정보 설정</h2>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-2">
                            기본 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* School Name and Region - Side by Side */}
                            <div className="space-y-2">
                                <label className="text-xs text-[var(--color-muted-foreground)] font-bold">학교명</label>
                                <input
                                    value={config.schoolName}
                                    onChange={e => setConfig({ ...config, schoolName: e.target.value })}
                                    className="w-full bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 transition-all focus:bg-white/[0.08]"
                                    placeholder="예: 가통고등학교"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-[var(--color-muted-foreground)] font-bold">지역 (시/도)</label>
                                <select
                                    value={config.region || ''}
                                    onChange={e => setConfig({ ...config, region: e.target.value })}
                                    className="w-full bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 appearance-none cursor-pointer transition-all focus:bg-white/[0.08]"
                                >
                                    <option value="" disabled className="bg-[var(--color-card)]">지역 선택</option>
                                    {['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'].map(region => (
                                        <option key={region} value={region} className="bg-[var(--color-card)]">{region}</option>
                                    ))}
                                </select>
                            </div>



                            {/* School Level and ID Length - Side by Side */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                    {(['elementary', 'middle', 'high'] as const).map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setConfig({ ...config, schoolLevel: level })}
                                            className={cn(
                                                "py-3 rounded-xl text-xs font-bold border transition-all active:scale-95",
                                                config.schoolLevel === level
                                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                                                    : "bg-[var(--color-background)]/[0.05] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-white/10"
                                            )}
                                        >
                                            {level === 'elementary' ? '초등' : level === 'middle' ? '중등' : '고등'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-[var(--color-muted-foreground)] font-bold">학번 자릿수</label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        min="1"
                                        max="6"
                                        value={config.studentIdLength}
                                        onChange={e => setConfig({ ...config, studentIdLength: parseInt(e.target.value) || 4 })}
                                        className="w-full bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 transition-all focus:bg-white/[0.08] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 px-2">
                                        <button
                                            onClick={() => setConfig({ ...config, studentIdLength: Math.min(6, config.studentIdLength + 1) })}
                                            className="text-[var(--color-muted-foreground)] hover:text-indigo-400 p-0.5 transition-colors"
                                        >
                                            <ChevronUp size={12} strokeWidth={3} />
                                        </button>
                                        <button
                                            onClick={() => setConfig({ ...config, studentIdLength: Math.max(1, config.studentIdLength - 1) })}
                                            className="text-[var(--color-muted-foreground)] hover:text-indigo-400 p-0.5 transition-colors"
                                        >
                                            <ChevronDown size={12} strokeWidth={3} />
                                        </button>
                                    </div>
                                    <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted-foreground)] pointer-events-none uppercase tracking-tighter">Digits</span>
                                </div>
                            </div>
                        </div>
                    </section>


                    {/* Theme Settings (New) */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-2">
                            화면 설정
                        </h3>
                        <div className="bg-[var(--color-background)]/[0.03] border border-[var(--color-border)] p-4 rounded-xl flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-sm font-bold text-[var(--color-foreground)]">디스플레이 모드</span>
                                <p className="text-xs text-[var(--color-muted-foreground)]">화면의 밝기를 설정합니다.</p>
                            </div>
                            <div className="flex bg-[var(--color-background)]/40 p-1 rounded-lg border border-[var(--color-border)]">
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                        config.displayMode === 'dark'
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                                    )}
                                >
                                    다크 모드
                                </button>
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                        config.displayMode === 'light'
                                            ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                                            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                                    )}
                                >
                                    라이트 모드
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Departments Config */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} /> 학과 및 반 구성
                            </h3>
                            <button
                                onClick={addDepartment}
                                className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                            >
                                <Plus size={12} /> 학과 추가
                            </button>
                        </div>

                        <div className="space-y-3">
                            {config.departments.map((dept) => (
                                <div key={dept.id} className="bg-[var(--color-background)]/[0.03] border border-[var(--color-border)] p-4 rounded-xl flex items-end gap-4">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest">학과명</label>
                                        <div className="relative flex items-center">
                                            <input
                                                value={dept.name.endsWith('과') ? dept.name.slice(0, -1) : dept.name}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/과$/, '');
                                                    updateDepartment(dept.id, { name: val + '과' });
                                                }}
                                                className="w-full bg-transparent border-b border-[var(--color-border)] py-1 text-sm text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 pr-6"
                                                placeholder="학과 이름"
                                            />
                                            <span className="absolute right-0 bottom-1.5 text-sm font-bold text-[var(--color-muted-foreground)]">과</span>
                                        </div>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tighter">대표명(두 글자)</label>
                                        <input
                                            value={dept.shortName}
                                            onChange={e => updateDepartment(dept.id, { shortName: e.target.value.slice(0, 2) })}
                                            className="w-full bg-transparent border-b border-[var(--color-border)] py-1 text-sm text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 text-center"
                                            placeholder="전기"
                                            maxLength={2}
                                        />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">시작 반</label>
                                        <input
                                            type="number"
                                            value={dept.classRange.start}
                                            onChange={e => updateDepartment(dept.id, { classRange: { ...dept.classRange, start: parseInt(e.target.value) || 0 } })}
                                            className="w-full bg-transparent border-b border-[var(--color-border)] py-1 text-sm text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 text-center"
                                        />
                                    </div>
                                    <div className="pb-2 text-[var(--color-muted-foreground)]">~</div>
                                    <div className="w-20 space-y-1">
                                        <label className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">종료 반</label>
                                        <input
                                            type="number"
                                            value={dept.classRange.end}
                                            onChange={e => updateDepartment(dept.id, { classRange: { ...dept.classRange, end: parseInt(e.target.value) || 0 } })}
                                            className="w-full bg-transparent border-b border-[var(--color-border)] py-1 text-sm text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50 text-center"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeDepartment(dept.id)}
                                        className="p-2 hover:bg-red-500/10 text-[var(--color-muted-foreground)] hover:text-red-400 rounded-lg transition-colors mt-4"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {config.departments.length === 0 && (
                                <div className="text-center py-8 text-[var(--color-muted-foreground)] text-xs font-bold">
                                    설정된 학과가 없습니다.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Contact Info (Moved to Bottom) */}
                    <section className="space-y-4 border-t border-[var(--color-border)] pt-6">
                        <h3 className="text-sm font-bold text-[var(--color-muted-foreground)] uppercase tracking-widest flex items-center gap-2">
                            담당자 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-[var(--color-muted-foreground)] font-bold">담당자 이메일</label>
                                <input
                                    value={config.contactEmail || ''}
                                    onChange={e => setConfig({ ...config, contactEmail: e.target.value })}
                                    className={cn(
                                        "w-full bg-[var(--color-background)]/[0.05] border rounded-xl px-4 py-3 text-[var(--color-foreground)] font-bold outline-none transition-all",
                                        isEmailValid
                                            ? "border-[var(--color-border)] focus:border-indigo-500/50"
                                            : "border-rose-500/50 focus:border-rose-500 bg-rose-500/[0.02]"
                                    )}
                                    placeholder="admin@school.edu"
                                />
                                {!isEmailValid && (
                                    <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-1 ml-1 animate-pulse">
                                        유효한 이메일 형식이 아닙니다.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-[var(--color-muted-foreground)] font-bold">카카오톡 아이디</label>
                                <input
                                    value={config.kakaoId || ''}
                                    onChange={e => setConfig({ ...config, kakaoId: e.target.value })}
                                    className="w-full bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-foreground)] font-bold outline-none focus:border-indigo-500/50"
                                    placeholder="kakaoId123"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--color-border)] flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-white/5 text-[var(--color-muted-foreground)] font-bold transition-colors">
                        취소
                    </button>
                    <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                        <Save size={18} /> 저장하기
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { SchoolConfig, getSchoolConfig, saveSchoolConfig, Department } from '@/lib/schoolConfig';
import { X, Plus, Trash2, Save, Building2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SchoolSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SchoolSettingsModal({ isOpen, onClose }: SchoolSettingsModalProps) {
    const [config, setConfig] = useState<SchoolConfig>(getSchoolConfig());

    useEffect(() => {
        if (isOpen) {
            setConfig(getSchoolConfig()); // Refresh on open
        }
    }, [isOpen]);

    const handleSave = () => {
        saveSchoolConfig(config);
        onClose();
        // Force refresh might be needed for parent components if they don't listen to storage
        window.location.reload(); // Simple refresh to apply config everywhere (MVP)
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
        // Parse string "1,2,3" to number array
        const nums = val.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        setConfig(prev => ({ ...prev, grades: nums }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                            <Building2 size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">학교 기본 정보 설정</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            기본 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 font-bold">지역</label>
                                <input
                                    value={config.region || ''}
                                    onChange={e => setConfig({ ...config, region: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500/50"
                                    placeholder="예: 서울"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 font-bold">학교급</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['elementary', 'middle', 'high'] as const).map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setConfig({ ...config, schoolLevel: level })}
                                            className={cn(
                                                "py-3 rounded-xl text-xs font-bold border transition-colors",
                                                config.schoolLevel === level
                                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                            )}
                                        >
                                            {level === 'elementary' ? '초등' : level === 'middle' ? '중등' : '고등'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs text-gray-500 font-bold">학교명</label>
                                <input
                                    value={config.schoolName}
                                    onChange={e => setConfig({ ...config, schoolName: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-xs text-gray-500 font-bold">운영 학년 (쉼표 구분)</label>
                                <input
                                    value={config.grades.join(', ')}
                                    onChange={e => handleGradeChange(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500/50"
                                    placeholder="예: 1, 2, 3"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Departments Config */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
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
                                <div key={dept.id} className="bg-white/[0.03] border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] text-gray-500 font-bold">학과명</label>
                                        <div className="relative flex items-center">
                                            <input
                                                value={dept.name.endsWith('과') ? dept.name.slice(0, -1) : dept.name}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/과$/, '');
                                                    updateDepartment(dept.id, { name: val + '과' });
                                                }}
                                                className="w-full bg-transparent border-b border-white/10 py-1 text-sm text-white font-bold outline-none focus:border-indigo-500/50 placeholder:text-gray-700 pr-6"
                                                placeholder="학과 이름"
                                            />
                                            <span className="absolute right-0 bottom-1.5 text-sm font-bold text-gray-500">과</span>
                                        </div>
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[10px] text-gray-500 font-bold">시작 반</label>
                                        <input
                                            type="number"
                                            value={dept.classRange.start}
                                            onChange={e => updateDepartment(dept.id, { classRange: { ...dept.classRange, start: parseInt(e.target.value) || 0 } })}
                                            className="w-full bg-transparent border-b border-white/10 py-1 text-sm text-white font-bold outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                    <div className="text-gray-500">~</div>
                                    <div className="w-24 space-y-1">
                                        <label className="text-[10px] text-gray-500 font-bold">종료 반</label>
                                        <input
                                            type="number"
                                            value={dept.classRange.end}
                                            onChange={e => updateDepartment(dept.id, { classRange: { ...dept.classRange, end: parseInt(e.target.value) || 0 } })}
                                            className="w-full bg-transparent border-b border-white/10 py-1 text-sm text-white font-bold outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeDepartment(dept.id)}
                                        className="p-2 hover:bg-red-500/10 text-gray-600 hover:text-red-400 rounded-lg transition-colors mt-4"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {config.departments.length === 0 && (
                                <div className="text-center py-8 text-gray-600 text-xs">
                                    설정된 학과가 없습니다.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Contact Info (Moved to Bottom) */}
                    <section className="space-y-4 border-t border-white/5 pt-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            담당자 정보
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 font-bold">담당자 이메일</label>
                                <input
                                    value={config.contactEmail || ''}
                                    onChange={e => setConfig({ ...config, contactEmail: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500/50"
                                    placeholder="admin@school.edu"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-500 font-bold">카카오톡 아이디</label>
                                <input
                                    value={config.kakaoId || ''}
                                    onChange={e => setConfig({ ...config, kakaoId: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500/50"
                                    placeholder="kakaoId123"
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-white/5 text-gray-400 font-bold transition-colors">
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

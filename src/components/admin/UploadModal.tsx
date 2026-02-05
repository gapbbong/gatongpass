'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Plus, Trash2, ChevronRight, Layout, Check, AlignLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadDocument } from '@/lib/docService';
import { cn } from '@/lib/utils';

interface FormItem {
    id: string;
    type: 'select' | 'radio' | 'text' | 'checkbox';
    label: string;
    options?: string[];
    required: boolean;
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newDoc: any) => void;
}

type Step = 'upload' | 'suggest' | 'builder';

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deadline, setDeadline] = useState('');

    // Form Builder State
    const [formItems, setFormItems] = useState<FormItem[]>([]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            if (!title) setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
            setError(null);
        }
    }, [title]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const handleNextToSuggest = () => {
        if (!file || !title) {
            setError('제목을 입력하고 PDF 파일을 업로드해주세요.');
            return;
        }
        setStep('suggest');
    };

    const applyTemplate = (templateType: string) => {
        let items: FormItem[] = [];
        if (templateType === 'attendance') {
            items = [{ id: Date.now().toString(), type: 'radio', label: '참석 여부', options: ['참석', '불참'], required: true }];
        } else if (templateType === 'privacy') {
            items = [{ id: Date.now().toString(), type: 'radio', label: '개인정보 수집 및 이용 동의', options: ['동의함', '동의하지 않음'], required: true }];
        } else if (templateType === 'survey') {
            items = [
                { id: (Date.now()).toString(), type: 'radio', label: '참가 희망 여부', options: ['희망함', '희망하지 않음'], required: true },
                { id: (Date.now() + 1).toString(), type: 'text', label: '기타 건의 사항', required: false }
            ];
        }
        setFormItems(items);
        setStep('builder');
    };

    const addFormItem = (type: FormItem['type']) => {
        const newItem: FormItem = {
            id: Date.now().toString(),
            type,
            label: type === 'text' ? '주관식 질문' : '새 질문',
            options: type === 'text' ? undefined : ['옵션 1', '옵션 2'],
            required: true
        };
        setFormItems([...formItems, newItem]);
    };

    const removeFormItem = (id: string) => {
        setFormItems(formItems.filter(item => item.id !== id));
    };

    const updateFormItem = (id: string, updates: Partial<FormItem>) => {
        setFormItems(formItems.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const result = await uploadDocument(file, deadline, formItems);

        if (result.success) {
            onSuccess(result.data);
            handleClose();
        } else {
            setError(result.error || '업로드 중 오류가 발생했습니다.');
            setStep('upload');
        }
        setIsUploading(false);
    };

    const handleClose = () => {
        setFile(null);
        setTitle('');
        setError(null);
        setDeadline('');
        setFormItems([]);
        setStep('upload');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-2xl glass-card rounded-[2.5rem] overflow-hidden relative z-10 flex flex-col max-h-[90vh] shadow-2xl border border-white/10"
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                    {step === 'upload' ? <Upload size={24} /> : <Sparkles size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">
                                        {step === 'upload' ? '통신문 배포' : step === 'suggest' ? '스마트 응답 추천' : '응답 항목 구성'}
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
                                        Step {step === 'upload' ? '1' : step === 'suggest' ? '2' : '3'} of 3: {step === 'upload' ? 'File info' : 'Response config'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-500 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <AnimatePresence mode="wait">
                                {step === 'upload' && (
                                    <motion.div
                                        key="upload-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">통신문 제목 (필수)</label>
                                            <input
                                                type="text"
                                                placeholder="예: 2026학년도 수학여행 참가 동의서"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full glass-input rounded-2xl px-6 py-5 text-base text-white focus:outline-none placeholder:text-gray-600 font-bold"
                                            />
                                        </div>

                                        {!file ? (
                                            <div
                                                {...getRootProps()}
                                                className={cn(
                                                    "border-2 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center transition-all cursor-pointer group",
                                                    isDragActive ? "border-indigo-500 bg-indigo-500/5" : "border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.02]"
                                                )}
                                            >
                                                <input {...getInputProps()} />
                                                <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                                    <Upload className="w-12 h-12 text-gray-400 group-hover:text-indigo-400" />
                                                </div>
                                                <p className="text-lg font-bold text-gray-300">PDF 파일을 여기에 드롭</p>
                                                <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest font-bold">or click to browse local files</p>
                                            </div>
                                        ) : (
                                            <div className="bg-indigo-500/5 rounded-3xl p-8 border border-indigo-500/20 flex items-center justify-between group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                                        <FileText className="text-indigo-400" size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-black text-white">{file.name}</p>
                                                        <p className="text-xs text-indigo-400/60 font-mono mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setFile(null)} className="p-3 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded-2xl transition-all">
                                                    <X size={24} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">제출 마감 일자 (선택)</label>
                                            <input
                                                type="date"
                                                value={deadline}
                                                onChange={(e) => setDeadline(e.target.value)}
                                                className="w-full glass-input rounded-2xl px-6 py-5 text-sm text-white focus:outline-none font-bold"
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 'suggest' && (
                                    <motion.div
                                        key="suggest-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8 py-4"
                                    >
                                        <div className="text-center space-y-3 mb-12">
                                            <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-bounce">
                                                <Sparkles size={32} />
                                            </div>
                                            <h3 className="text-2xl font-black text-white">현명한 제안!</h3>
                                            <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto font-medium">
                                                업로드하신 PDF 내용을 분석하여<br />가장 적합한 응답 항목을 발견했습니다.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <SuggestionCard
                                                title="참석 여부 조사"
                                                desc="행사 참가 희망 및 불참 사유 수집"
                                                icon={<CheckCircle2 className="text-emerald-400" />}
                                                onClick={() => applyTemplate('attendance')}
                                            />
                                            <SuggestionCard
                                                title="개인정보 제공 동의"
                                                desc="법적 필수 동의 항목 세트 적용"
                                                icon={<AlertCircle className="text-indigo-400" />}
                                                onClick={() => applyTemplate('privacy')}
                                            />
                                            <SuggestionCard
                                                title="자유 설문 구성"
                                                desc="템플릿 없이 직접 항목을 만듭니다"
                                                icon={<Plus className="text-gray-400" />}
                                                onClick={() => setStep('builder')}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 'builder' && (
                                    <motion.div
                                        key="builder-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">응답 폼 미리보기</h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => addFormItem('radio')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 flex items-center gap-1.5 transition-all">
                                                    <Layout size={12} /> 선택형 추가
                                                </button>
                                                <button onClick={() => addFormItem('text')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 flex items-center gap-1.5 transition-all">
                                                    <AlignLeft size={12} /> 주관식 추가
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {formItems.length === 0 ? (
                                                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                                                    <p className="text-sm text-gray-600 font-bold">추가된 응답 항목이 없습니다.</p>
                                                </div>
                                            ) : (
                                                formItems.map((item, idx) => (
                                                    <motion.div
                                                        layout
                                                        key={item.id}
                                                        className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl relative group"
                                                    >
                                                        <div className="flex justify-between gap-4 mb-4">
                                                            <input
                                                                className="bg-transparent text-sm font-black text-white focus:outline-none w-full border-b border-transparent focus:border-indigo-500/50 pb-1"
                                                                value={item.label}
                                                                onChange={(e) => updateFormItem(item.id, { label: e.target.value })}
                                                            />
                                                            <button onClick={() => removeFormItem(item.id)} className="p-2 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-rose-500 transition-all">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>

                                                        {item.type !== 'text' && item.options && (
                                                            <div className="space-y-2 mt-4 pl-2">
                                                                {item.options.map((opt, optIdx) => (
                                                                    <div key={optIdx} className="flex items-center gap-3">
                                                                        <div className="w-4 h-4 rounded-full border border-white/20" />
                                                                        <input
                                                                            className="bg-transparent text-xs text-gray-400 focus:outline-none flex-1"
                                                                            value={opt}
                                                                            onChange={(e) => {
                                                                                const newOpts = [...item.options!];
                                                                                newOpts[optIdx] = e.target.value;
                                                                                updateFormItem(item.id, { options: newOpts });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {item.type === 'text' && (
                                                            <div className="h-10 w-full bg-white/[0.02] border border-white/5 rounded-xl border-dashed mt-4" />
                                                        )}
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer / Progression */}
                        <div className="p-8 pt-4 border-t border-white/5">
                            {error && step === 'upload' && (
                                <p className="text-rose-400 text-[10px] font-black mb-4 flex items-center gap-2 tracking-wide uppercase">
                                    <AlertCircle size={14} /> {error}
                                </p>
                            )}

                            <div className="flex gap-4">
                                {step !== 'upload' && (
                                    <button
                                        onClick={() => setStep(step === 'suggest' ? 'upload' : 'suggest')}
                                        className="px-8 py-5 rounded-3xl bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        이전
                                    </button>
                                )}

                                <button
                                    onClick={step === 'upload' ? handleNextToSuggest : step === 'suggest' ? () => setStep('builder') : handleUpload}
                                    disabled={isUploading}
                                    className={cn(
                                        "flex-1 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.98]",
                                        isUploading ? "bg-white/5 text-gray-600" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/30 glow-indigo"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            {step === 'upload' ? '다음 단계로' : step === 'suggest' ? '직접 수정하기' : '배포 시작'}
                                            <ChevronRight size={20} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function SuggestionCard({ title, desc, icon, onClick }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full p-6 bg-white/[0.03] hover:bg-indigo-600/[0.06] border border-white/5 hover:border-indigo-500/40 rounded-[2rem] text-left transition-all group flex items-center justify-between"
        >
            <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-black text-white">{title}</h4>
                    <p className="text-[11px] text-gray-500 font-bold mt-1 uppercase tracking-tight">{desc}</p>
                </div>
            </div>
            <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-all">
                <Plus size={16} />
            </div>
        </button>
    );
}

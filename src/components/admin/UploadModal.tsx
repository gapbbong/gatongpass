'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Plus, Trash2, ChevronRight, Layout, Check, AlignLeft,
    Copy, Search, MousePointer2, Wand2, PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadDocument } from '@/lib/docService';
import { cn } from '@/lib/utils';

// Import knowledge base
import docStats from '@/lib/doc_stats.json';

interface FormItem {
    id: string;
    type: 'select' | 'radio' | 'text' | 'checkbox' | 'signature';
    label: string;
    options?: string[];
    required: boolean;
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newDoc: any) => void;
}

type Step = 'upload' | 'analyze' | 'suggest' | 'builder';

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [pastedContent, setPastedContent] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deadline, setDeadline] = useState('');

    // Form Builder State
    const [formItems, setFormItems] = useState<FormItem[]>([]);
    const [suggestedTemplates, setSuggestedTemplates] = useState<any[]>([]);

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

    const analyzeContext = useCallback(async () => {
        setIsAnalyzing(true);
        // Simulate AI Analysis of Title & Content
        await new Promise(resolve => setTimeout(resolve, 1500));

        const combinedText = (title + ' ' + pastedContent).toLowerCase();
        const suggestions: any[] = [];

        // Check against KB
        Object.entries(docStats.categories).forEach(([key, category]: [string, any]) => {
            if (category.keywords.some((kw: string) => combinedText.includes(kw))) {
                suggestions.push({
                    id: key,
                    name: key === 'field_trip' ? '현장학습/체험활동 세트' :
                        key === 'survey' ? '희망 조사 세트' :
                            key === 'agreement' ? '개인정보동의 세트' : '기본 안내 세트',
                    desc: `${category.keywords[0]} 관련 문서에 최적화된 설문`,
                    items: category.suggested_items,
                    icon: key === 'field_trip' ? <MousePointer2 className="text-emerald-400" /> :
                        key === 'agreement' ? <CheckCircle2 className="text-indigo-400" /> : <Wand2 className="text-purple-400" />
                });
            }
        });

        // Add default if none
        if (suggestions.length === 0) {
            suggestions.push({
                id: 'custom',
                name: '맞춤형 설문 생성',
                desc: '문서 내용을 바탕으로 새로 구성합니다',
                items: [{ id: '1', type: 'radio', label: '참가 여부', options: ['참가', '불참'], required: true }],
                icon: <Plus className="text-gray-400" />
            });
        }

        setSuggestedTemplates(suggestions);
        setIsAnalyzing(false);
        setStep('suggest');
    }, [title, pastedContent]);

    const handleNextToAnalyze = () => {
        if (!title) {
            setError('통신문 제목을 입력해주세요.');
            return;
        }
        setStep('analyze');
    };

    const applyTemplate = (items: any[]) => {
        setFormItems(items.map(it => ({ ...it, id: Math.random().toString(36).substr(2, 9) })));
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
        if (!file && !pastedContent) {
            setError('파일을 업로드하거나 내용을 입력해주세요.');
            setStep('analyze');
            return;
        }

        setIsUploading(true);
        setError(null);

        // If no file but has content, we could generate a mock file or just send text
        // For now, let's assume we need at least one file or we handle content separately in docService
        const result = await uploadDocument(file || new File([pastedContent], `${title}.txt`, { type: 'text/plain' }), deadline, formItems);

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
        setPastedContent('');
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
                        <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5 bg-white/[0.01]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                    {step === 'upload' ? <FileText size={24} /> : <Wand2 size={24} className="animate-pulse" />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">
                                        {step === 'upload' ? '새 통신문 작성' : step === 'analyze' ? 'AI 내용 분석' : step === 'suggest' ? '스마트 응답 추천' : '응답 항목 구성'}
                                    </h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">
                                        {step === 'upload' ? '01 START' : step === 'analyze' ? '02 SCANNING' : step === 'suggest' ? '03 AI SUGGEST' : '04 FINALIZING'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-500 hover:text-white">
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
                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">통신문 제목</label>
                                            <input
                                                type="text"
                                                placeholder="예: 2026학년도 현장체험학습 참가 신청서"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full glass-input rounded-2xl px-6 py-5 text-base text-white focus:outline-none placeholder:text-gray-600 font-bold"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">제출 마감 일자</label>
                                            <input
                                                type="date"
                                                value={deadline}
                                                onChange={(e) => setDeadline(e.target.value)}
                                                className="w-full glass-input rounded-2xl px-6 py-5 text-sm text-white focus:outline-none font-bold"
                                            />
                                        </div>

                                        <div className="pt-4">
                                            <p className="text-[11px] text-gray-500 font-bold text-center uppercase tracking-widest mb-6 border-b border-white/5 pb-6">Choose your method</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={() => setStep('analyze')}
                                                    className="p-8 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-3xl flex flex-col items-center gap-4 transition-all group"
                                                >
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                                        <Copy size={24} />
                                                    </div>
                                                    <span className="text-xs font-black text-white uppercase tracking-wider">복사해서 분석</span>
                                                </button>
                                                <div {...getRootProps()} className="p-8 bg-white/[0.03] hover:bg-indigo-600/[0.05] border border-dashed border-white/10 hover:border-indigo-500/40 rounded-3xl flex flex-col items-center gap-4 transition-all group cursor-pointer">
                                                    <input {...getInputProps()} />
                                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:scale-110 group-hover:text-indigo-400 transition-all">
                                                        <Upload size={24} />
                                                    </div>
                                                    <span className="text-xs font-black text-white uppercase tracking-wider">PDF 파일 업로드</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 'analyze' && (
                                    <motion.div
                                        key="analyze-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">통신문 내용 분석 (한글/텍스트)</label>
                                                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest italic">Paste HWP content here</span>
                                            </div>
                                            <textarea
                                                placeholder="한글(HWP) 파일의 내용을 복사해서 여기에 붙여넣어 주세요. AI가 내용을 분석하여 최적의 설문 항목을 추천해 드립니다."
                                                value={pastedContent}
                                                onChange={(e) => setPastedContent(e.target.value)}
                                                className="w-full h-64 glass-input rounded-3xl px-6 py-6 text-sm text-white focus:outline-none placeholder:text-gray-600 font-medium resize-none leading-relaxed"
                                            />
                                        </div>

                                        {file && (
                                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FileText size={18} className="text-indigo-400" />
                                                    <span className="text-xs font-bold text-white">{file.name}</span>
                                                </div>
                                                <X size={16} className="text-gray-500 cursor-pointer" onClick={() => setFile(null)} />
                                            </div>
                                        )}

                                        <button
                                            onClick={analyzeContext}
                                            disabled={isAnalyzing || (!pastedContent && !file)}
                                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    AI 분석 중...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={18} />
                                                    내용 분석 및 마법사 시작
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                )}

                                {step === 'suggest' && (
                                    <motion.div
                                        key="suggest-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6 py-4"
                                    >
                                        <div className="text-center space-y-3 mb-10">
                                            <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                                                <Sparkles size={32} />
                                            </div>
                                            <h3 className="text-2xl font-black text-white">AI 맞춤 추천</h3>
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                                지난 90여 개의 데이터를 기반으로 분석한<br />가장 적합한 응답 템플릿입니다.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            {suggestedTemplates.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => applyTemplate(tpl.items)}
                                                    className="w-full p-6 bg-white/[0.03] hover:bg-indigo-600/[0.08] border border-white/5 hover:border-indigo-500/40 rounded-[2rem] text-left transition-all group flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                                            {tpl.icon}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black text-white">{tpl.name}</h4>
                                                            <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-tight">{tpl.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-all">
                                                        <Plus size={16} />
                                                    </div>
                                                </button>
                                            ))}
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
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">최종 폼 커스터마이징</h3>
                                            <div className="flex gap-2">
                                                <button onClick={() => addFormItem('radio')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 flex items-center gap-1.5 transition-all">
                                                    <Plus size={12} /> 객관식
                                                </button>
                                                <button onClick={() => addFormItem('text')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 flex items-center gap-1.5 transition-all">
                                                    <AlignLeft size={12} /> 주관식
                                                </button>
                                                <button onClick={() => addFormItem('signature')} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-400 flex items-center gap-1.5 transition-all">
                                                    <PenTool size={12} /> 서명
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {formItems.map((item) => (
                                                <div key={item.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl group relative">
                                                    <div className="flex justify-between gap-4">
                                                        <input
                                                            className="bg-transparent text-sm font-bold text-white focus:outline-none w-full border-b border-transparent focus:border-indigo-500/30"
                                                            value={item.label}
                                                            onChange={(e) => updateFormItem(item.id, { label: e.target.value })}
                                                        />
                                                        <button onClick={() => removeFormItem(item.id)} className="text-gray-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    {item.options && (
                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            {item.options.map((opt, oIdx) => (
                                                                <span key={oIdx} className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-md">{opt}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {item.type === 'text' && (
                                                        <div className="h-10 w-full bg-white/[0.02] border border-white/5 rounded-xl border-dashed mt-4 flex items-center px-4">
                                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Text Input Area</span>
                                                        </div>
                                                    )}

                                                    {item.type === 'signature' && (
                                                        <div className="h-20 w-full bg-white/[0.02] border border-white/5 rounded-xl border-dashed mt-4 flex items-center justify-center">
                                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-2">
                                                                <PenTool size={12} /> Guardian Signature Pad
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="p-8 pt-4 border-t border-white/5 bg-white/[0.01]">
                            {error && (
                                <p className="text-rose-400 text-[10px] font-black mb-4 flex items-center gap-2 uppercase tracking-widest pl-1">
                                    <AlertCircle size={14} /> {error}
                                </p>
                            )}

                            <div className="flex gap-4">
                                {step !== 'upload' && (
                                    <button
                                        onClick={() => setStep(step === 'analyze' ? 'upload' : step === 'suggest' ? 'analyze' : 'suggest')}
                                        className="px-10 py-5 rounded-3xl bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs uppercase tracking-widest transition-all border border-white/5"
                                    >
                                        뒤로
                                    </button>
                                )}

                                <button
                                    onClick={step === 'upload' ? handleNextToAnalyze : step === 'suggest' ? () => setStep('builder') : step === 'builder' ? handleUpload : undefined}
                                    disabled={isUploading || isAnalyzing}
                                    className={cn(
                                        "flex-1 py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-[0.98]",
                                        (isUploading || isAnalyzing) ? "bg-white/5 text-gray-600" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/30 glow-indigo"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            {step === 'upload' ? '내용 분석 시작' : step === 'analyze' ? '분석 대기 중...' : step === 'suggest' ? '이 템플릿 사용하기' : '통신문 배포 완료'}
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

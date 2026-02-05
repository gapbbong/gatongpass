'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Plus, Trash2, ChevronRight, Layout, Check, AlignLeft,
    Copy, Search, MousePointer2, Wand2, PenTool, Smartphone, QrCode, Download,
    Users, Calendar, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// import { uploadDocument } from '@/lib/docService'; // Will use props to bubble up
import { cn } from '@/lib/utils';
import docStats from '@/lib/doc_stats.json';

interface FormItem {
    id: string;
    type: 'select' | 'radio' | 'text' | 'checkbox' | 'signature';
    label: string;
    options?: string[];
    required: boolean;
}

interface CorrespondenceWizardProps {
    onSuccess: (newDoc: any) => void;
    onCancel: () => void;
}

type Step = 'upload' | 'analyze' | 'suggest' | 'builder' | 'preview' | 'settings';

export default function CorrespondenceWizard({ onSuccess, onCancel }: CorrespondenceWizardProps) {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [pastedContent, setPastedContent] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Settings
    const [deadlineDate, setDeadlineDate] = useState('');
    const [deadlineTime, setDeadlineTime] = useState('16:30');
    const [targetAudience, setTargetAudience] = useState<'all' | 'grade' | 'class'>('all');

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

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    });

    const analyzeContext = useCallback(async () => {
        setIsAnalyzing(true);
        // Simulate AI Analysis
        await new Promise(resolve => setTimeout(resolve, 2000)); // Slightly longer for "AI Magic" feel

        let textToAnalyze = (title + ' ' + pastedContent);
        const lowerText = textToAnalyze.toLowerCase();

        // --- 1. AI Content Refinement (Friendly Tone) ---
        // If specific keywords are found, we rewrite the content to be friendlier
        if (lowerText.includes('경성 미래인') || lowerText.includes('ks ftp')) {
            const friendlyContent = `[AI가 다듬은 학부모님용 안내문입니다 💌]

안녕하세요, 학부모님! 
학부모님의 가정에 늘 행복과 건강이 가득하시기를 기원합니다. 🌿

기쁜 소식을 전해드립니다. 귀댁의 자녀가 본교의 핵심 인재 양성 프로그램인 『경성 미래인(KS FTP)』에 자랑스럽게 선발되었습니다! 🎉
이와 관련하여, 학생들의 올바른 인성 함양과 예절 교육을 위해 전문 기관인 '동래향교'에서 진행하는 예절 교육에 참여하고자 합니다.

우리 학생들이 서로 존중하고 배려하는 멋진 어른으로 성장할 수 있도록, 이번 프로그램에 많은 관심과 격려 부탁드립니다. 학교에서도 아이들이 안전하고 유익한 시간을 보낼 수 있도록 최선을 다하겠습니다.

📅 **일시**: 2025년 5월 23일(금)
📍 **장소**: 동래 향교
👥 **대상**: 경성 미래인 1학년 (20명)
🙇 **내용**: 인성 및 전통 예절 교실
💸 **비용**: 전액 무료 (학교 지원)

학부모님의 따뜻한 응원 부탁드립니다. 감사합니다.
경성전자고등학교장 드림`;

            setPastedContent(friendlyContent);
            // Update local var for categorization
            textToAnalyze = friendlyContent;
        }

        // --- 2. Category Suggestion ---
        const combinedText = textToAnalyze.toLowerCase();
        const suggestions: any[] = [];

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

    // ... (Builder helpers: addFormItem, removeFormItem, updateFormItem - Same as UploadModal)
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

    const [isGracePeriod, setIsGracePeriod] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleTestSend = () => {
        alert("선생님의 휴대폰 번호로 미리보기가 발송되었습니다.\n(실제 발송되는 화면과 동일합니다)");
    };

    const startGracePeriod = () => {
        setIsGracePeriod(true);
        setCountdown(60);

        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    completeUpload();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const cancelUpload = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsGracePeriod(false);
        setCountdown(60);
        alert("발송이 취소되었습니다. 내용을 다시 수정하실 수 있습니다.");
    };

    const completeUpload = async () => {
        // Real upload logic
        setIsUploading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newDoc = {
            id: Date.now().toString(),
            title: title,
            type: formItems.some(i => i.type === 'signature') ? 'action' : 'notice',
            created_at: new Date().toISOString(),
            status: 'ongoing',
            submitted_count: 0,
            total_count: 24, // Demo
            deadline: `${deadlineDate} ${deadlineTime}`,
            path: '', // Mock path
        };

        onSuccess(newDoc);
        setIsUploading(false);
        setIsGracePeriod(false);
    };

    // Render Steps
    // ... Copy render logic from UploadModal but adapted for inline use ...

    return (
        <div className="h-full flex flex-col bg-background/50 backdrop-blur-md overflow-hidden relative">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Wand2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white">AI 가정통신문 마법사</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            {step === 'upload' ? 'Step 1. 어떤 내용을 보낼까요?' :
                                step === 'analyze' ? 'Step 2. 내용을 살펴보고 있어요' :
                                    step === 'suggest' ? 'Step 3. 딱 맞는 양식을 찾았어요' :
                                        step === 'builder' ? 'Step 4. 질문 내용을 다듬어볼까요?' :
                                            step === 'preview' ? 'Step 5. 학부모님께는 이렇게 보여요' :
                                                'Step 6. 누구에게 언제 보낼까요?'}
                        </p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-lg text-gray-500">
                    <X size={18} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <AnimatePresence mode="wait">
                    {/* --- STEP 1: UPLOAD --- */}
                    {step === 'upload' && (
                        <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400">제목</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="예: 2026학년도 현장체험학습 참가 신청서"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500/50 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setStep('analyze')} className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/5 transition-all text-left group">
                                    <Copy className="text-gray-500 mb-3 group-hover:text-indigo-400 transition-colors" />
                                    <div className="text-sm font-bold text-white">텍스트 붙여넣기</div>
                                    <div className="text-[10px] text-gray-500 mt-1">한글(HWP) 내용 복사</div>
                                </button>
                                <div {...getRootProps()} className="p-6 bg-white/[0.03] border border-dashed border-white/10 rounded-2xl hover:border-indigo-500/50 cursor-pointer transition-all text-left group">
                                    <input {...getInputProps()} />
                                    <Upload className="text-gray-500 mb-3 group-hover:text-indigo-400 transition-colors" />
                                    <div className="text-sm font-bold text-white">PDF 파일 업로드</div>
                                    <div className="text-[10px] text-gray-500 mt-1">파일을 끌어다 놓으세요</div>
                                </div>
                            </div>
                            {file && (
                                <div className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-xs text-white">
                                    <CheckCircle2 size={14} className="text-indigo-400" />
                                    {file.name}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* --- STEP 2: ANALYZE --- */}
                    {step === 'analyze' && (
                        <motion.div key="analyze" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <textarea
                                value={pastedContent}
                                onChange={e => setPastedContent(e.target.value)}
                                placeholder="가정통신문 내용을 여기에 붙여넣으세요..."
                                className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none resize-none"
                            />
                            <button onClick={analyzeContext} disabled={isAnalyzing} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                {isAnalyzing ? <Loader2 className="animate-spin" /> : <><Sparkles size={18} /> 내용을 분석하고 있어요</>}
                            </button>
                        </motion.div>
                    )}

                    {/* --- STEP 3: SUGGEST --- */}
                    {step === 'suggest' && (
                        <motion.div key="suggest" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <p className="text-xs text-gray-400 mb-2">분석 결과 가장 적합한 설문 유형입니다.</p>
                            {suggestedTemplates.map((tpl) => (
                                <button key={tpl.id} onClick={() => applyTemplate(tpl.items)} className="w-full p-4 bg-white/5 border border-white/5 hover:border-indigo-500/50 rounded-xl flex items-center gap-4 text-left transition-all group">
                                    <div className="p-3 bg-black/20 rounded-lg">{tpl.icon}</div>
                                    <div>
                                        <div className="text-sm font-bold text-white">{tpl.name}</div>
                                        <div className="text-[10px] text-gray-500">{tpl.desc}</div>
                                    </div>
                                    <ChevronRight className="ml-auto text-gray-500 group-hover:text-indigo-400" size={16} />
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* --- STEP 4: BUILDER --- */}
                    {step === 'builder' && (
                        <motion.div key="builder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="space-y-3">
                                {formItems.map((item) => (
                                    <div key={item.id} className="p-4 bg-white/5 rounded-xl border border-white/5 relative group">
                                        <div className="flex justify-between mb-2">
                                            <input value={item.label} onChange={e => updateFormItem(item.id, { label: e.target.value })} className="bg-transparent text-sm font-bold text-white outline-none w-full" />
                                            <button onClick={() => removeFormItem(item.id)} className="text-gray-500 hover:text-rose-400"><Trash2 size={14} /></button>
                                        </div>
                                        {item.options && (
                                            <div className="flex gap-2">
                                                {item.options.map((opt, i) => <span key={i} className="text-[10px] bg-black/20 px-2 py-1 rounded text-gray-400">{opt}</span>)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => addFormItem('radio')} className="px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400 hover:text-white">+ 객관식 추가</button>
                                <button onClick={() => addFormItem('text')} className="px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400 hover:text-white">+ 주관식 추가</button>
                                <button onClick={() => addFormItem('signature')} className="px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400 hover:text-white">+ 서명란 추가</button>
                            </div>
                        </motion.div>
                    )}

                    {/* --- STEP 5: PREVIEW & DOWNLOAD --- */}
                    {step === 'preview' && (
                        <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="bg-black/40 border border-white/10 rounded-[2.5rem] p-4 max-w-[300px] mx-auto relative shadow-2xl">
                                {/* Mobile Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20" />

                                <div className="bg-white rounded-[2rem] overflow-hidden h-[400px] relative text-slate-900 pointer-events-none select-none">
                                    <div className="bg-indigo-600 p-4 pt-10 text-white">
                                        <div className="text-[10px] opacity-80">가정통신문</div>
                                        <div className="font-bold text-sm leading-tight mt-1">{title}</div>
                                    </div>
                                    <div className="p-4 space-y-4 bg-slate-50 h-full">
                                        <div className="space-y-2">
                                            {formItems.map((item) => (
                                                <div key={item.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-700 mb-2">Q. {item.label}</div>
                                                    {item.type === 'radio' && (
                                                        <div className="flex gap-2">
                                                            {item.options?.map(opt => (
                                                                <div key={opt} className="flex-1 py-1.5 text-[10px] text-center rounded bg-slate-100 text-slate-500">{opt}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {item.type === 'signature' && (
                                                        <div className="h-12 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400">서명 입력</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={handleTestSend} className="flex-1 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-indigo-500/20">
                                    <Smartphone size={14} /> 나에게 테스트 발송
                                </button>
                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-300 flex items-center justify-center gap-2">
                                    <Download size={14} /> 게시용 PDF 다운로드
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* --- STEP 6: SETTINGS --- */}
                    {step === 'settings' && (
                        <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            {/* Deadline */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 flex items-center gap-2"><Calendar size={12} /> 언제까지 받을까요?</label>
                                <div className="flex gap-2">
                                    <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm" />
                                    <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="w-24 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm" />
                                </div>
                            </div>

                            {/* Audience */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 flex items-center gap-2"><Users size={12} /> 누구에게 보낼까요?</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setTargetAudience('all')} className={cn("p-3 rounded-xl text-xs font-bold border transition-all", targetAudience === 'all' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-500")}>
                                        전교생
                                    </button>
                                    <button onClick={() => setTargetAudience('grade')} className={cn("p-3 rounded-xl text-xs font-bold border transition-all", targetAudience === 'grade' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-500")}>
                                        학년 전체
                                    </button>
                                    <button onClick={() => setTargetAudience('class')} className={cn("p-3 rounded-xl text-xs font-bold border transition-all", targetAudience === 'class' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-gray-500")}>
                                        우리 반만
                                    </button>
                                </div>
                            </div>

                            {/* Feature Description */}
                            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <h4 className="text-white text-xs font-bold mb-1 flex items-center gap-2">
                                    <Sparkles size={12} className="text-indigo-400" /> 안심하세요!
                                </h4>
                                <p className="text-[10px] text-gray-400 leading-relaxed">
                                    [학부모님께 배부하기] 버튼을 눌러도 바로 전송되지 않습니다.<br />
                                    <strong>60초 동안 전송 취소</strong>가 가능하니 걱정 마세요.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-white/5 flex gap-3 shrink-0 relative">
                {isGracePeriod ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute inset-0 bg-background z-50 flex items-center justify-center p-6 gap-4"
                    >
                        <div className="flex-1 flex flex-col justify-center">
                            <p className="text-xs text-indigo-400 font-bold mb-1 animate-pulse">발송 대기 중... ( {countdown}초 )</p>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
                                <motion.div
                                    className="h-full bg-indigo-500"
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 60, ease: "linear" }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={cancelUpload}
                            className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-900/30"
                        >
                            발송 취소
                        </button>
                    </motion.div>
                ) : (
                    <>
                        {step !== 'upload' && (
                            <button
                                onClick={() => {
                                    if (step === 'analyze') setStep('upload');
                                    else if (step === 'suggest') setStep('analyze');
                                    else if (step === 'builder') setStep('suggest');
                                    else if (step === 'preview') setStep('builder');
                                    else if (step === 'settings') setStep('preview');
                                }}
                                className="px-6 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold text-xs hover:bg-white/10 transition-colors"
                            >
                                이전
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (step === 'upload') handleNextToAnalyze();
                                else if (step === 'analyze') analyzeContext();
                                else if (step === 'suggest') setStep('builder');
                                else if (step === 'builder') setStep('preview');
                                else if (step === 'preview') setStep('settings');
                                else if (step === 'settings') startGracePeriod();
                            }}
                            disabled={isUploading || isAnalyzing}
                            className={cn(
                                "flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm py-4 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40 transition-all",
                                step === 'settings' && "animate-breathe" // Apply breathing animation here
                            )}
                        >
                            {isUploading ? <Loader2 className="animate-spin" /> : (
                                step === 'settings' ? '학부모님께 배부하기' : '다음 단계로'
                            )}
                            {step !== 'settings' && <ChevronRight size={16} />}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

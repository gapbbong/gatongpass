'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Plus, Trash2, ChevronRight, Layout, Check, AlignLeft,
    Copy, Search, MousePointer2, Wand2, PenTool, Smartphone, QrCode, Download,
    Users, Calendar, Clock, Share2, MessageCircle, FileImage, ExternalLink,
    Minus, Sheet, UserPlus, Table2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import docStats from '@/lib/doc_stats.json';

// --- Types ---
type Step = 'upload' | 'type_select' | 'form_builder' | 'settings' | 'processing' | 'completed';

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

// --- Target Audience Definitions ---
const DEPARTMENTS = [
    { id: 'iot', name: 'IoT전기과' },
    { id: 'game', name: '게임콘텐츠과' }
];

const GRADES = ['1', '2', '3'];

export default function CorrespondenceWizard({ onSuccess, onCancel }: CorrespondenceWizardProps) {
    // --- State ---
    const [step, setStep] = useState<Step>('upload');

    // 1. File & Basic Info
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState<'notice' | 'action' | null>(null); // 단순안내 vs 회신

    // 2. Form Builder
    const [formItems, setFormItems] = useState<FormItem[]>([]);

    // 3. Settings (Target & Deadline)
    const [targetCategory, setTargetCategory] = useState<'all' | 'grade' | 'dept' | 'student'>('all');
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
    const [targetStudents, setTargetStudents] = useState<string>(''); // Comma separated

    const [deadline, setDeadline] = useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3); // Default +3 days
        return d;
    });

    // 4. Final Processing
    const [isSheetCreating, setIsSheetCreating] = useState(false);
    const [tempDoc, setTempDoc] = useState<any>(null);

    // --- Handlers ---

    // File Drop
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setFile(acceptedFiles[0]);
            if (!title) setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
        }
    }, [title]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
        multiple: false
    });

    // Type Selection
    const selectType = (type: 'notice' | 'action') => {
        setDocType(type);
        if (type === 'notice') {
            setFormItems([]); // No items needed
            setStep('settings');
        } else {
            // Pre-fill some defaults for action
            setFormItems([
                { id: '1', type: 'radio', label: '참가 여부', options: ['참가', '불참'], required: true },
                { id: '2', type: 'signature', label: '보호자 서명', required: true }
            ]);
            setStep('form_builder');
        }
    };

    // Form Builder Helpers
    const addFormItem = (type: FormItem['type']) => {
        setFormItems(prev => [...prev, {
            id: Date.now().toString(),
            type,
            label: '새 항목',
            options: type === 'radio' ? ['옵션1', '옵션2'] : undefined,
            required: true
        }]);
    };
    const updateFormItem = (id: string, update: Partial<FormItem>) => {
        setFormItems(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
    };
    const removeFormItem = (id: string) => {
        setFormItems(prev => prev.filter(item => item.id !== id));
    };

    // Deadline Helpers
    const adjustDeadline = (days: number) => {
        const newDate = new Date(deadline);
        newDate.setDate(newDate.getDate() + days);

        // Min date check (tomorrow)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        if (newDate < tomorrow) return;
        setDeadline(newDate);
    };

    // Format Date for UI
    const formattedDeadline = deadline.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

    // Target Helpers
    const toggleSelection = (list: string[], item: string, setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        if (list.includes(item)) setList(list.filter(i => i !== item));
        else setList([...list, item]);
    };

    // Sheet Creation & Finalize
    const startProcessing = async () => {
        setStep('processing');
        setIsSheetCreating(true);

        // 1. Simulate Google Sheet Creation
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Create Doc Data
        const newDoc = {
            id: Date.now().toString(),
            title: title,
            type: docType === 'action' ? 'action' : 'notice',
            created_at: new Date().toISOString(),
            status: 'ongoing',
            submitted_count: 0,
            total_count: calculateTotalTarget(), // Mock calc
            deadline: deadline.toISOString(),
            formItems: formItems,
            sheetUrl: "https://docs.google.com/spreadsheets/d/mock-sheet-id", // Mock URL
            targetSummary: getTargetSummary()
        };

        // 3. Save to LocalStorage for Demo
        const savedDocs = JSON.parse(localStorage.getItem('gatong_docs') || '[]');
        savedDocs.push(newDoc);
        localStorage.setItem('gatong_docs', JSON.stringify(savedDocs));

        setTempDoc(newDoc);
        setIsSheetCreating(false);
        setStep('completed');
    };

    const getTargetSummary = () => {
        if (targetCategory === 'all') return '전교생';
        if (targetCategory === 'student') return `개별 학생 (${targetStudents.split(',').filter(s => s.trim()).length}명)`;

        const parts = [];
        if (selectedGrades.length > 0) parts.push(`${selectedGrades.join(',')}학년`);
        if (selectedDepts.length > 0) parts.push(`${selectedDepts.map(d => d === 'iot' ? 'IoT' : '게임').join(',')}과`);

        if (parts.length === 0) return '전체';
        return parts.join(' ');
    };

    const calculateTotalTarget = () => {
        // Just mock numbers based on selection
        if (targetCategory === 'all') return 450;
        if (targetCategory === 'student') return targetStudents.split(',').length;
        let base = 100;
        if (selectedDepts.length > 0) base = base / 2 * selectedDepts.length;
        if (selectedGrades.length > 0) base = base / 3 * selectedGrades.length;
        return Math.floor(base);
    };

    const handleFinalize = () => {
        if (tempDoc) {
            onSuccess(tempDoc); // Notify admin dashboard
        } else {
            onCancel();
        }
    };

    const handleCopyText = () => {
        const url = `http://localhost:3000/s/${tempDoc?.id}`;
        const text = `[가정통신문] ${title}\n\n학부모님, 가정에 행복이 가득하시길 바랍니다.\n자녀의 학교 생활 관련 중요 안내입니다.\n\n📅 마감: ${formattedDeadline}까지\n📄 내용 확인 및 서명하기:\n${url}`;
        navigator.clipboard.writeText(text);
        alert("쿨알림톡용 텍스트가 복사되었습니다.");
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-md overflow-hidden relative">
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Wand2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight">AI 가정통신문 마법사</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            {step === 'upload' && 'Step 1. 파일 업로드'}
                            {step === 'type_select' && 'Step 2. 유형 선택'}
                            {step === 'form_builder' && 'Step 3. 응답 항목 구성'}
                            {step === 'settings' && 'Step 4. 배포 설정'}
                            {step === 'processing' && 'Step 5. 생성 중...'}
                            {step === 'completed' && 'Step 6. 발송 준비 완료'}
                        </p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                <AnimatePresence mode="wait">

                    {/* 1. UPLOAD */}
                    {step === 'upload' && (
                        <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400">제목</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="가정통신문 제목을 입력하세요"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500/50 outline-none transition-colors font-bold"
                                />
                            </div>
                            <div {...getRootProps()} className={cn(
                                "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all group",
                                file ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-indigo-500/50 hover:bg-white/[0.02]"
                            )}>
                                <input {...getInputProps()} />
                                <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {file ? <CheckCircle2 size={32} className="text-emerald-400" /> : <Upload size={32} className="text-gray-400 group-hover:text-indigo-400" />}
                                </div>
                                {file ? (
                                    <>
                                        <p className="text-white font-bold text-lg">{file.name}</p>
                                        <p className="text-emerald-400 text-sm mt-1">업로드 완료!</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white font-bold text-lg mb-1">이미지나 PDF 파일을 이곳에 드래그하세요</p>
                                        <p className="text-gray-500 text-sm">JPG, PNG, PDF 지원</p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* 2. TYPE SELECT */}
                    {step === 'type_select' && (
                        <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <h3 className="text-white font-bold text-lg mb-4 text-center">어떤 종류의 가정통신문인가요?</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => selectType('notice')} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group text-left space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg">단순 안내</h4>
                                        <p className="text-xs text-gray-400 mt-1">학부모님이 내용만 확인하면 됩니다.<br />(예: 학교급식 안내, 일정 안내)</p>
                                    </div>
                                </button>
                                <button onClick={() => selectType('action')} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all group text-left space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                        <PenTool size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg">선택 및 서명</h4>
                                        <p className="text-xs text-gray-400 mt-1">회신이나 동의서 서명이 필요합니다.<br />(예: 체험학습 동의서, 방과후 신청)</p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* 3. FORM BUILDER */}
                    {step === 'form_builder' && (
                        <motion.div key="builder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-bold">어떤 응답을 받을까요?</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => addFormItem('radio')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors">+ 객관식</button>
                                    <button onClick={() => addFormItem('text')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors">+ 주관식</button>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {formItems.map((item, idx) => (
                                    <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl relative group">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-indigo-400">Q{idx + 1}</span>
                                            <input
                                                value={item.label}
                                                onChange={e => updateFormItem(item.id, { label: e.target.value })}
                                                className="flex-1 bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-indigo-500/50"
                                            />
                                            <button onClick={() => removeFormItem(item.id)} className="text-gray-600 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                        {item.options && (
                                            <div className="flex gap-2 mt-3 ml-7">
                                                {item.options.map(opt => (
                                                    <span key={opt} className="text-[10px] bg-black/30 px-2 py-1 rounded text-gray-400">{opt}</span>
                                                ))}
                                                <span className="text-[10px] text-gray-600 px-2 py-1">...</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* 4. SETTINGS (Target & Deadline) */}
                    {step === 'settings' && (
                        <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

                            {/* Target Selection */}
                            <div className="space-y-4">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Users size={16} className="text-indigo-400" /> 대상 선택
                                </h3>

                                {/* Tabs */}
                                <div className="flex p-1 bg-black/40 rounded-xl">
                                    {['all', 'grade', 'dept', 'student'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTargetCategory(t as any)}
                                            className={cn(
                                                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                                targetCategory === t ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                            )}
                                        >
                                            {t === 'all' ? '전교생' : t === 'grade' ? '학년별' : t === 'dept' ? '학과별' : '학생지정'}
                                        </button>
                                    ))}
                                </div>

                                {/* Content based on Tab */}
                                <div className="p-5 bg-white/5 border border-white/5 rounded-2xl min-h-[120px]">
                                    {targetCategory === 'all' && (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                                            <Users size={32} className="opacity-20" />
                                            <p className="text-sm font-bold">전교생에게 발송합니다.</p>
                                        </div>
                                    )}

                                    {targetCategory === 'grade' && (
                                        <div className="flex gap-3 justify-center">
                                            {GRADES.map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => toggleSelection(selectedGrades, g, setSelectedGrades)}
                                                    className={cn(
                                                        "w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                                                        selectedGrades.includes(g)
                                                            ? "border-indigo-500 bg-indigo-500/20 text-white"
                                                            : "border-white/10 bg-white/5 text-gray-500 hover:bg-white/10"
                                                    )}
                                                >
                                                    <span className="text-xl font-black">{g}</span>
                                                    <span className="text-[10px]">학년</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {targetCategory === 'dept' && (
                                        <div className="flex gap-3 justify-center">
                                            {DEPARTMENTS.map(d => (
                                                <button
                                                    key={d.id}
                                                    onClick={() => toggleSelection(selectedDepts, d.id, setSelectedDepts)}
                                                    className={cn(
                                                        "px-6 py-4 rounded-xl border-2 transition-all",
                                                        selectedDepts.includes(d.id)
                                                            ? "border-emerald-500 bg-emerald-500/20 text-white"
                                                            : "border-white/10 bg-white/5 text-gray-500 hover:bg-white/10"
                                                    )}
                                                >
                                                    <span className="font-bold">{d.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {targetCategory === 'student' && (
                                        <div className="space-y-2">
                                            <textarea
                                                value={targetStudents}
                                                onChange={e => setTargetStudents(e.target.value)}
                                                placeholder="학번을 입력하세요. (쉼표로 구분, 예: 1101, 1102, 3205)"
                                                className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500/50 outline-none resize-none placeholder:text-gray-600"
                                            />
                                            <p className="text-[10px] text-gray-500 text-right">
                                                {targetStudents.split(',').filter(s => s.trim().length > 0).length}명 선택됨
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Deadline Setting */}
                            <div className="space-y-4">
                                <h3 className="text-white font-bold flex items-center gap-2">
                                    <Clock size={16} className="text-indigo-400" /> 제출 마감일
                                </h3>
                                <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                                    <button onClick={() => adjustDeadline(-1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                                        <Minus size={18} />
                                    </button>
                                    <div className="text-center">
                                        <div className="text-xl font-black text-white">{formattedDeadline}</div>
                                        <div className="text-xs text-gray-500 font-bold mt-1">까지 제출받기</div>
                                    </div>
                                    <button onClick={() => adjustDeadline(1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    )}

                    {/* 5. PROCESSING (Sheet Creation) */}
                    {step === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-10">
                            <div className="w-20 h-20 relative">
                                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                <Sheet className="absolute inset-0 m-auto text-emerald-500" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-white mt-8 mb-2">구글 시트 생성 중...</h3>
                            <p className="text-sm text-gray-400 text-center">
                                '{title}_취합용'<br />스프레드시트를 만들고 있어요.
                            </p>
                        </motion.div>
                    )}

                    {/* 6. COMPLETED */}
                    {step === 'completed' && tempDoc && (
                        <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)] mb-4 animate-bounce">
                                    <Check size={32} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-white">발송 준비 완료!</h3>
                            </div>

                            {/* Link Box */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                                    <MessageCircle size={14} /> 쿨알림톡 전달용 메시지
                                </h4>
                                <div className="bg-black/30 rounded-xl p-4 text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                                    {`[가정통신문] ${title}\n\n학부모님, 가정에 행복이 가득하시길 바랍니다.\n자녀의 학교 생활 관련 중요 안내입니다.\n\n📅 마감: ${formattedDeadline}까지\n📄 내용 확인 및 서명하기:\nhttp://localhost:3000/s/${tempDoc.id}`}
                                </div>
                                <button onClick={handleCopyText} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                    <Copy size={14} /> 텍스트 복사
                                </button>
                            </div>

                            {/* Sheet Link */}
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                                        <Table2 size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white">자동 취합 설정됨</div>
                                        <div className="text-[10px] text-emerald-400/80">구글 시트에 실시간으로 기록됩니다.</div>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 transition-colors flex items-center gap-1">
                                    시트 열기 <ExternalLink size={10} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 shrink-0">
                {step === 'completed' ? (
                    <button onClick={handleFinalize} className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black transition-colors">
                        닫기
                    </button>
                ) : step !== 'processing' ? (
                    <div className="flex gap-3">
                        {step !== 'upload' && (
                            <button
                                onClick={() => {
                                    if (step === 'type_select') setStep('upload');
                                    else if (step === 'form_builder') setStep('type_select');
                                    else if (step === 'settings') setStep(docType === 'notice' ? 'type_select' : 'form_builder');
                                }}
                                className="px-6 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold hover:bg-white/10"
                            >
                                이전
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (step === 'upload') {
                                    if (!title || !file) return alert('제목과 파일을 확인해주세요');
                                    setStep('type_select');
                                } else if (step === 'type_select') {
                                    // Managed in selection handler
                                } else if (step === 'form_builder') {
                                    setStep('settings');
                                } else if (step === 'settings') {
                                    startProcessing();
                                }
                            }}
                            className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/30 transition-all"
                        >
                            {step === 'settings' ? '가정통신문 생성하기' : '다음 단계로'}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

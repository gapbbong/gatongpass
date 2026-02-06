'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Plus, Trash2, ChevronRight, Layout, Check, AlignLeft,
    Copy, Search, MousePointer2, Wand2, PenTool, Smartphone, QrCode, Download,
    Users, Calendar, Clock, Share2, MessageCircle, FileImage, ExternalLink,
    Minus, Sheet, UserPlus, Table2, Send, ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import docStats from '@/lib/doc_stats.json';
import Tesseract from 'tesseract.js';

// --- Types ---
type Step = 'input' | 'processing' | 'completed';

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
// --- Constants removed in favor of schoolConfig ---

export default function CorrespondenceWizard({ onSuccess, onCancel }: CorrespondenceWizardProps) {
    // --- State ---
    const [step, setStep] = useState<Step>('input');
    const [showPreview, setShowPreview] = useState(false);

    // 1. File & Basic Info
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showTitleHint, setShowTitleHint] = useState(false);
    const [titleCandidates, setTitleCandidates] = useState<string[]>([]); // 추천 후보
    const [docType, setDocType] = useState<'notice' | 'action' | null>(null); // 단순안내 vs 회신

    // 2. Form Builder
    const [formItems, setFormItems] = useState<FormItem[]>([]);

    // 3. Settings (Target & Deadline)
    // 3. Settings (Target & Deadline)
    const [targetCategory, setTargetCategory] = useState<'group' | 'student'>('group');
    const [selectedGrades, setSelectedGrades] = useState<number[]>([1, 2, 3]);
    const [selectedClasses, setSelectedClasses] = useState<number[]>([1, 2, 3, 4, 5, 6]);
    const [targetStudents, setTargetStudents] = useState<string>(''); // Comma separated

    // School Config & Real Logic
    const [schoolConfig, setSchoolConfig] = useState<any>(null);
    const [allStudents, setAllStudents] = useState<any[]>([]);

    useEffect(() => {
        // Load Config
        import('@/lib/schoolConfig').then(mod => {
            setSchoolConfig(mod.getSchoolConfig());
        });

        // Load Real Students
        fetch('/api/students/import')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAllStudents(data.students);
                }
            })
            .catch(err => console.error("Failed to fetch students", err));
    }, []);

    const [deadline, setDeadline] = useState<Date>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3); // Default +3 days
        d.setHours(8, 0, 0, 0); // Default 08:00 AM
        return d;
    });

    // 4. Final Processing
    const [isSheetCreating, setIsSheetCreating] = useState(false);
    const [tempDoc, setTempDoc] = useState<any>(null);

    // --- Handlers ---

    // ... OCR (omitted for brevity, keep existing) ...

    const calculateTotalTarget = () => {
        if (!schoolConfig) return 0;

        // 1. Individual
        if (targetCategory === 'student') return targetStudents.split(',').filter(s => s.trim()).length;

        // 2. Group Selection
        // Filter by selected grades AND selected classes
        if (selectedGrades.length === 0 || selectedClasses.length === 0) return 0;

        const filtered = allStudents.filter(s => {
            return selectedGrades.includes(s.grade) && selectedClasses.includes(s.class_num);
        });

        return filtered.length;
    };

    // ... Existing OCR Analysis and Drops ...
    const analyzeImage = async (file: File) => {
        // ... existing code ...
        if (!file.type.startsWith('image/')) return;
        setIsAnalyzing(true);
        setTitleCandidates([]);

        try {
            const { data }: any = await Tesseract.recognize(
                file,
                'kor',
            );
            // ... strict copy of existing OCR logic ...
            const rawList: string[] = [];
            const scoredCandidates: { text: string, score: number }[] = [];

            const processText = (originalText: string, height: number, yPos: number, pageHeight: number) => {
                const clean = originalText.replace(/\s+/g, ' ').trim();
                const display = clean.replace(/[|\]\[_『「」』=—]/g, '').trim();
                if (display.length < 2) return;
                if (!rawList.includes(display)) rawList.push(display);
                let score = height;
                if (pageHeight > 0 && (yPos / pageHeight) < 0.35) score += 20;
                if (/발행처|발행인|발행일|교무실|행정실|FAX|홈페이지|http|www|제\s*[0-9]+호/.test(display)) score -= 50;
                if (/가정통신문/.test(display)) score -= 30;
                if (/^\d{4}[\.\-]\s*\d{1,2}[\.\-]\s*\d{1,2}[\.]?$/.test(display)) score -= 30;
                if (/[『「\[]/.test(originalText)) score += 30;
                scoredCandidates.push({ text: display, score });
            };

            const lines = data.lines || [];
            const pageHeight = data.text && lines.length > 0 ? lines[lines.length - 1].bbox.y1 : 1000;
            lines.forEach((line: any) => {
                const h = line.bbox.y1 - line.bbox.y0;
                processText(line.text, h, line.bbox.y0, pageHeight);
            });

            if (rawList.length < 5 && data.text) {
                const splits = data.text.split('\n');
                splits.forEach((s: string, idx: number) => {
                    processText(s, 10, idx * 30, 1000);
                });
            }

            setTitleCandidates(rawList.slice(0, 10));
            scoredCandidates.sort((a, b) => b.score - a.score);
            const bestPick = scoredCandidates.length > 0 ? scoredCandidates[0].text : "";

            if (bestPick) setTitle(bestPick);
            else if (rawList.length > 0) setTitle(rawList[0]);
            else {
                const fallbackName = file.name === 'image.png' ? `문서_${new Date().getHours()}시${new Date().getMinutes()}분` : file.name.replace(/\.[^/.]+$/, "");
                setTitle(fallbackName);
            }
            setShowTitleHint(true);
        } catch (err) {
            console.error("OCR Error", err);
            const fallbackName = file.name === 'image.png' ? `문서_${new Date().getHours()}시${new Date().getMinutes()}분` : file.name.replace(/\.[^/.]+$/, "");
            setTitle(fallbackName);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ... Dropzone ...
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const f = acceptedFiles[0];
            setFile(f);
            analyzeImage(f);
        }
    }, [title]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected: () => alert('지원되지 않는 파일 형식입니다.\nPDF 또는 이미지(JPG, PNG) 파일만 업로드해주세요.'),
        accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
        multiple: false
    });

    const titleInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (step !== 'input') return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1 || item.type === 'application/pdf') {
                    const blob = item.getAsFile();
                    if (blob) {
                        setFile(blob);
                        if (blob.type.startsWith('image/')) analyzeImage(blob);
                        else setTitle(blob.name.replace(/\.[^/.]+$/, ""));
                    }
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [step, title]);

    // ... Type Selection ...
    const selectType = (type: 'notice' | 'action') => {
        setDocType(type);
        if (type === 'notice') setFormItems([]);
        else if (formItems.length === 0) {
            setFormItems([
                { id: '1', type: 'radio', label: '참가 여부', options: ['참가', '불참'], required: true },
                { id: '2', type: 'signature', label: '보호자 서명', required: true }
            ]);
        }
    };

    // ... Form Builder Helpers ...
    const addFormItem = (type: FormItem['type']) => {
        setFormItems(prev => [...prev, {
            id: Date.now().toString(),
            type,
            label: type === 'text' ? '새 주관식 질문' : '새 객관식 질문',
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

    // ... Deadline Helpers ...
    const adjustDeadline = (days: number) => {
        const newDate = new Date(deadline);
        newDate.setDate(newDate.getDate() + days);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        if (newDate < tomorrow) return;
        setDeadline(newDate);
    };

    const formattedDeadline = deadline.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

    // ... Target Helpers ...
    const toggleGrade = (grade: number) => {
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(prev => prev.filter(g => g !== grade));
        } else {
            setSelectedGrades(prev => [...prev, grade]);
            // If no classes selected or just a few, auto-select all 1-6 for convenience
            if (selectedClasses.length < 6) {
                setSelectedClasses([1, 2, 3, 4, 5, 6]);
            }
        }
    };

    const toggleClass = (classNum: number) => {
        if (selectedClasses.includes(classNum)) {
            setSelectedClasses(prev => prev.filter(c => c !== classNum));
        } else {
            setSelectedClasses(prev => [...prev, classNum]);
        }
    };

    const selectAllStudents = () => {
        if (selectedGrades.length === schoolConfig.grades.length && selectedClasses.length === 6) {
            setSelectedGrades([]);
            setSelectedClasses([]);
        } else {
            setSelectedGrades(schoolConfig.grades);
            setSelectedClasses([1, 2, 3, 4, 5, 6]);
        }
    };

    const selectDept = (dept: any) => {
        const range = [];
        for (let i = dept.classRange.start; i <= dept.classRange.end; i++) {
            range.push(i);
        }
        setSelectedClasses(range);
        // Ensure at least one grade is selected if none are
        if (selectedGrades.length === 0 && schoolConfig) {
            setSelectedGrades(schoolConfig.grades);
        }
    };

    // ... Sheet Creation & Finalize ...
    const startProcessing = async () => {
        if (!title.trim()) {
            alert('제목을 입력해주세요.');
            titleInputRef.current?.focus();
            return;
        }
        setStep('processing');
        setIsSheetCreating(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        let fileData = null;
        if (file) {
            try {
                fileData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            } catch (e) {
                console.error("File read error", e);
            }
        }
        const newDoc = {
            id: Date.now().toString(),
            title: title,
            type: docType === 'action' ? 'action' : 'notice',
            created_at: new Date().toISOString(),
            status: 'ongoing',
            submitted_count: 0,
            total_count: calculateTotalTarget(),
            deadline: deadline.toISOString(),
            formItems: formItems,
            sheetUrl: "https://docs.google.com/spreadsheets/d/mock-sheet-id",
            targetSummary: getTargetSummary(),
            fileData: fileData,
            fileType: file?.type
        };
        const savedDocs = JSON.parse(localStorage.getItem('gatong_docs') || '[]');
        savedDocs.push(newDoc);
        localStorage.setItem('gatong_docs', JSON.stringify(savedDocs));
        setTempDoc(newDoc);
        setIsSheetCreating(false);
        setStep('completed');
    };

    const getTargetSummary = () => {
        if (targetCategory === 'student') return `개별 학생 (${targetStudents.split(',').filter(s => s.trim()).length}명)`;

        if (selectedGrades.length === schoolConfig?.grades.length && selectedClasses.length === 6) return '전교생';

        const parts = [];
        if (selectedGrades.length > 0) {
            parts.push(`${selectedGrades.join(',')}학년`);
        }
        if (selectedClasses.length > 0) {
            if (selectedClasses.length === 6) parts.push('전체 반');
            else parts.push(`${selectedClasses.join(',')}반`);
        }

        if (parts.length === 0) return '없음';
        return parts.join(' ');
    };

    const handleFinalize = () => {
        if (tempDoc) onSuccess(tempDoc);
        else onCancel();
    };

    const handleCopyText = () => {
        const url = `${window.location.origin}/s/${tempDoc?.id}`;
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
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {step === 'input' ? '간편 생성 모드' : step === 'processing' ? '생성 중...' : '완료'}
                        </p>
                    </div>
                </div>
                <button onClick={() => step === 'completed' && tempDoc ? onSuccess(tempDoc) : onCancel()} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                <AnimatePresence mode="wait">

                    {/* PROCESSING VIEW */}
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

                    {/* COMPLETED VIEW */}
                    {step === 'completed' && tempDoc && (
                        <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 relative">
                            <button
                                onClick={() => setStep('input')}
                                className="absolute left-0 top-0 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <ChevronRight className="rotate-180" size={20} />
                            </button>
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
                                    {`[가정통신문] ${title}\n\n학부모님, 가정에 행복이 가득하시길 바랍니다.\n자녀의 학교 생활 관련 중요 안내입니다.\n\n📅 마감: ${formattedDeadline}까지\n📄 내용 확인 및 서명하기:\n${typeof window !== 'undefined' ? window.location.origin : ''}/s/${tempDoc.id}`}
                                </div>
                                <button onClick={handleCopyText} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                    <Copy size={14} /> 텍스트 복사
                                </button>
                                <button onClick={() => setShowPreview(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                    <Smartphone size={14} /> 학부모 화면 미리보기
                                </button>
                                <button onClick={() => onSuccess(tempDoc)} className="w-full py-4 mt-2 col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2">
                                    <Check size={16} /> 확인 (대시보드로 이동)
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

                            <button onClick={handleFinalize} className="w-full py-4 bg-white text-black hover:bg-gray-200 rounded-2xl font-black transition-colors">
                                닫기
                            </button>
                        </motion.div>
                    )}

                    {/* INPUT FORM (WATERFALL) */}
                    {(step !== 'processing' && step !== 'completed') && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-12 pb-10"
                        >
                            {/* SECTION 1: UPLOAD & TITLE */}
                            <section className="space-y-6">
                                <div {...getRootProps()} className={cn(
                                    "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all group",
                                    isDragActive ? "border-indigo-500 bg-indigo-500/20 scale-[1.02] shadow-2xl shadow-indigo-500/20" :
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
                                            <p className="text-white font-bold text-lg mb-1">파일을 드래그하거나 클릭하여 업로드</p>
                                            <p className="text-gray-500 text-sm mb-2">JPG, PNG, PDF 지원</p>
                                            <div className="text-indigo-300 text-xs font-bold bg-indigo-500/10 px-3 py-1.5 rounded-full inline-block">
                                                💡 이미지를 복사했다면 클릭 없이 바로 <strong>Ctrl+V</strong>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400">제목</label>
                                    <div className="relative">
                                        <input
                                            ref={titleInputRef}
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder={isAnalyzing ? "제목을 분석하고 있습니다..." : "가정통신문 제목을 입력하세요"}
                                            className={cn(
                                                "w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500/50 outline-none transition-colors font-bold",
                                                isAnalyzing && "animate-pulse text-gray-400"
                                            )}
                                            readOnly={isAnalyzing}
                                        />
                                        {isAnalyzing && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-indigo-400 font-bold">
                                                <Loader2 className="animate-spin" size={14} /> AI 분석 중
                                            </div>
                                        )}
                                        <AnimatePresence>
                                            {showTitleHint && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="mt-3 relative w-full bg-slate-900/90 backdrop-blur border border-indigo-500/30 text-indigo-100 p-0 rounded-xl shadow-2xl z-20 overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between p-3 bg-indigo-500/10 border-b border-indigo-500/20">
                                                        <span className="flex items-center gap-2 font-bold text-indigo-300 text-xs uppercase tracking-wider">
                                                            <Sparkles size={14} className="text-yellow-400" /> AI 추천 제목
                                                        </span>
                                                        <button onClick={() => setShowTitleHint(false)} className="text-indigo-400 hover:text-white transition-colors"><X size={14} /></button>
                                                    </div>

                                                    <div className="p-2 flex flex-col gap-1 max-h-[250px] overflow-y-auto custom-scrollbar">
                                                        {titleCandidates.length > 0 ? titleCandidates.map((cand, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    setTitle(cand);
                                                                    setShowTitleHint(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 text-slate-200 transition-all text-sm flex items-start group"
                                                            >
                                                                <span className="text-indigo-500 font-mono mr-3 mt-0.5 text-xs group-hover:text-indigo-300">{String(idx + 1).padStart(2, '0')}</span>
                                                                <span className="leading-snug break-keep">{cand}</span>
                                                            </button>
                                                        )) : (
                                                            <div className="text-gray-500 text-xs p-4 text-center">
                                                                추천할 제목을 찾지 못했습니다.<br />직접 제목을 입력해주세요.
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </section>

                            {/* SECTION 2: DOC TYPE */}
                            {file && title.trim().length > 0 && (
                                <motion.section
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-4 border-t border-white/5"
                                >
                                    <h3 className="text-white font-bold text-lg mb-4 text-center">어떤 종류의 가정통신문인가요?</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => selectType('notice')}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                                                docType === 'notice'
                                                    ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-400"
                                            )}
                                        >
                                            <div className="p-3 bg-white/10 rounded-full">
                                                <FileText size={24} className={docType === 'notice' ? "text-white" : "text-gray-400"} />
                                            </div>
                                            <div className="font-bold text-white">단순 안내</div>
                                            <div className="text-xs text-white/60">서명 불필요</div>
                                        </button>
                                        <button
                                            onClick={() => selectType('action')}
                                            className={cn(
                                                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                                                docType === 'action'
                                                    ? "bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/20"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-400"
                                            )}
                                        >
                                            <div className="p-3 bg-white/10 rounded-full">
                                                <PenTool size={24} className={docType === 'action' ? "text-white" : "text-gray-400"} />
                                            </div>
                                            <div className="font-bold text-white">회신 필요</div>
                                            <div className="text-xs text-white/60">동의/신청/조사</div>
                                        </button>
                                    </div>
                                </motion.section>
                            )}

                            {/* SECTION 3: FORM BUILDER (For Action Letter) */}
                            {docType === 'action' && (
                                <motion.section
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-4 border-t border-white/5"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-bold text-lg">질문 항목 설정</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => addFormItem('radio')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors">+ 객관식</button>
                                            <button onClick={() => addFormItem('text')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white transition-colors">+ 주관식</button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {formItems.map((item, idx) => (
                                            <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/5 rounded-lg text-indigo-400">
                                                        {item.type === 'text' ? <AlignLeft size={16} /> : <ListChecks size={16} />}
                                                    </div>
                                                    <input
                                                        value={item.label}
                                                        onChange={(e) => updateFormItem(item.id, { label: e.target.value })}
                                                        placeholder="질문 내용을 입력하세요"
                                                        className="flex-1 bg-transparent border-none outline-none text-white font-bold placeholder:text-gray-600"
                                                    />
                                                    {item.type !== 'signature' && (
                                                        <button onClick={() => removeFormItem(item.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                {item.options && (
                                                    <div className="ml-12 space-y-2">
                                                        {item.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                                <input
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...(item.options || [])];
                                                                        newOptions[optIdx] = e.target.value;
                                                                        updateFormItem(item.id, { options: newOptions });
                                                                    }}
                                                                    className="flex-1 bg-transparent text-sm text-gray-300 outline-none border-b border-transparent focus:border-indigo-500/50 transition-colors placeholder:text-gray-700"
                                                                    placeholder={`옵션 ${optIdx + 1}`}
                                                                />
                                                            </div>
                                                        ))}
                                                        <button
                                                            onClick={() => {
                                                                const newOptions = [...(item.options || []), ''];
                                                                updateFormItem(item.id, { options: newOptions });
                                                            }}
                                                            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold mt-1"
                                                        >
                                                            + 옵션 추가
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                                        <AlertCircle size={14} />
                                        <span>모든 회신형 문서에는 '서명'란이 자동 포함됩니다.</span>
                                    </div>
                                </motion.section>
                            )}

                            {/* SECTION 4: TARGET & DEADLINE & SUBMIT */}
                            {docType && (
                                <motion.section
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8 pt-4 border-t border-white/5"
                                >
                                    {/* Target */}
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            <Users size={20} className="text-indigo-400" /> 발송 대상
                                            <span className="text-sm font-normal text-indigo-300 ml-2">
                                                (전체 - {calculateTotalTarget()}명)
                                            </span>
                                        </h3>
                                        <div className="space-y-6">
                                            <div className="flex p-1 bg-black/20 rounded-xl">
                                                <button
                                                    onClick={() => setTargetCategory('group')}
                                                    className={cn(
                                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                                        targetCategory === 'group' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                                    )}
                                                >
                                                    그룹 선택
                                                </button>
                                                <button
                                                    onClick={() => setTargetCategory('student')}
                                                    className={cn(
                                                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                                                        targetCategory === 'student' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                                                    )}
                                                >
                                                    개별 입력
                                                </button>
                                            </div>

                                            {targetCategory === 'group' && schoolConfig && (
                                                <div className="space-y-6">
                                                    {/* Quick Actions */}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={selectAllStudents}
                                                            className={cn(
                                                                "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                                                                (selectedGrades.length === schoolConfig.grades.length && selectedClasses.length === 6)
                                                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                                            )}
                                                        >
                                                            전교생
                                                        </button>
                                                        {schoolConfig.departments.map((dept: any) => (
                                                            <button
                                                                key={dept.id}
                                                                onClick={() => selectDept(dept)}
                                                                className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300 transition-all"
                                                            >
                                                                {dept.name}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Grade Selection */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">학년</label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {schoolConfig.grades.map((g: number) => (
                                                                <button
                                                                    key={g}
                                                                    onClick={() => toggleGrade(g)}
                                                                    className={cn(
                                                                        "py-3 rounded-xl text-sm font-black border transition-all",
                                                                        selectedGrades.includes(g)
                                                                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-inner shadow-indigo-500/10"
                                                                            : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10"
                                                                    )}
                                                                >
                                                                    {g}학년
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Class Selection */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">반</label>
                                                        <div className="grid grid-cols-6 gap-2">
                                                            {[1, 2, 3, 4, 5, 6].map((c) => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => toggleClass(c)}
                                                                    className={cn(
                                                                        "aspect-square rounded-xl text-sm font-black border transition-all flex items-center justify-center",
                                                                        selectedClasses.includes(c)
                                                                            ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30"
                                                                            : "bg-white/5 border-white/10 text-gray-600 hover:bg-white/10 hover:text-gray-400"
                                                                    )}
                                                                >
                                                                    {c}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {targetCategory === 'student' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">개별 학번 입력</label>
                                                    <textarea
                                                        value={targetStudents}
                                                        onChange={e => setTargetStudents(e.target.value)}
                                                        placeholder="학번 입력 (예: 1101, 1102)"
                                                        className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-indigo-500/50 outline-none resize-none font-mono"
                                                    />
                                                    <p className="text-[10px] text-gray-600">콤마(,) 또는 공백으로 구분하여 입력하세요.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Deadline */}
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            <Clock size={20} className="text-indigo-400" /> 제출 마감
                                            <span className="text-xs text-indigo-400 font-normal ml-1">
                                                (오늘로부터 {Math.ceil((new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))}일 뒤)
                                            </span>
                                        </h3>
                                        <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                                            <button onClick={() => adjustDeadline(-1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><Minus size={18} /></button>
                                            <div className="text-center">
                                                <div className="text-xl font-black text-white">{formattedDeadline}</div>
                                                <div className="text-xs text-gray-500 font-bold mt-1">
                                                    오전 8시 마감
                                                </div>
                                            </div>
                                            <button onClick={() => adjustDeadline(1)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"><Plus size={18} /></button>
                                        </div>
                                    </div>

                                    {/* Final Action Button */}
                                    <div className="pt-6">
                                        <button
                                            onClick={startProcessing}
                                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                                        >
                                            <Send size={24} />
                                            발송 준비하기
                                        </button>
                                    </div>
                                </motion.section>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Inline Preview Modal */}
            <AnimatePresence>
                {showPreview && tempDoc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowPreview(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-white/10 rounded-[3rem] p-3 shadow-2xl relative w-full max-w-[375px] h-[80vh] flex flex-col"
                        >
                            {/* Phone Frame Header */}
                            <div className="h-6 flex justify-center items-center mb-2">
                                <div className="w-20 h-1 bg-white/20 rounded-full"></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-white rounded-[2rem] overflow-hidden relative">
                                <iframe
                                    src={`/s/${tempDoc.id}`}
                                    className="w-full h-full border-0"
                                    title="Student Preview"
                                />
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowPreview(false)}
                                className="absolute -right-12 top-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

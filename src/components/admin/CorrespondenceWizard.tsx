'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, FileText, CheckCircle2, AlertCircle, Loader2,
    Sparkles, Plus, Trash2, ChevronRight, Layout, Check, AlignLeft,
    Copy, Search, MousePointer2, Wand2, PenTool, Smartphone, QrCode, Download,
    Users, Calendar, Clock, Share2, MessageCircle, FileImage, ExternalLink,
    Minus, Sheet, UserPlus, Table2, Send, ListChecks, ZoomIn,
    Heart, Phone, Map, ShieldCheck, HeartPulse
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SURVEY_PRESETS } from '@/lib/constants/surveyPresets';
import docStats from '@/lib/doc_stats.json';
import Tesseract from 'tesseract.js';
import { generateSheetId, createSheet } from '@/lib/gasClient';
import { uploadDocument } from '@/lib/docService';
import { getSchoolConfig } from '@/lib/schoolConfig';
import ActiveDocumentViewer from './ActiveDocumentViewer';

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
    onDraftUpdate?: (draft: any) => void;
    initialData?: any;
}

// --- Constants ---
const WARM_GREETINGS = [
    "학생의 꿈과 미래를 항상 응원합니다. ✨",
    "학교를 믿고 자녀를 맡겨주시는 학부모님께 깊은 감사를 드립니다. ❤️",
    "오늘도 우리 아이들의 성장을 위해 애쓰시는 학부모님, 정말 존경하고 감사합니다. 👏",
    "학교와 가정이 한마음으로 소통할 때, 우리 아이들은 더 크게 자라납니다. 🌱",
    "자녀의 행복한 학교 생활을 위해 최선을 다하겠습니다. 함께해주셔서 감사합니다. 🙏",
    "언제나 학교 교육에 적극적으로 참여해주시는 학부모님 덕분에 학교가 더욱 따뜻해집니다. 🏠",
    "꿈을 향해 나아가는 학생들의 든든한 버팀목이 되어주셔서 감사합니다. 💪",
    "우리 아이들이 더 좋은 환경에서 배울 수 있도록 늘 고민하고 노력하겠습니다. 🎓"
];

// --- Target Audience Definitions ---
// --- Constants removed in favor of schoolConfig ---

export default function CorrespondenceWizard({ onSuccess, onCancel, onDraftUpdate, initialData }: CorrespondenceWizardProps) {
    // --- State ---
    const [step, setStep] = useState<Step>('input');
    // Removed activeTab state as per user request (handled by column layout now)
    const [showFullPreview, setShowFullPreview] = useState(false); // Kept for modal preview if needed, but tabs removed

    // 1. File & Basic Info
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showTitleHint, setShowTitleHint] = useState(false);
    const [titleCandidates, setTitleCandidates] = useState<string[]>([]); // 추천 후보
    const [docType, setDocType] = useState<'notice' | 'action'>(initialData?.type === 'notice' ? 'notice' : 'action');

    // 2. Form Builder
    const [formItems, setFormItems] = useState<FormItem[]>(initialData?.formItems || [
        { id: '1', type: 'radio', label: '참가 여부', options: ['참가', '불참'], required: true },
        { id: '2', type: 'signature', label: '보호자 서명', required: true }
    ]);

    // 3. Settings (Target & Deadline)
    const [targetCategory, setTargetCategory] = useState<'group' | 'student'>(initialData?.targetCategory || 'group');
    const [selectedGrades, setSelectedGrades] = useState<number[]>(initialData?.selectedGrades || [1, 2, 3]);
    const [selectedClasses, setSelectedClasses] = useState<number[]>(initialData?.selectedClasses || [1, 2, 3, 4, 5, 6]);
    const [targetStudents, setTargetStudents] = useState<string>(initialData?.targetStudents || ''); // Comma separated

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
        if (initialData?.deadline) return new Date(initialData.deadline);
        const d = new Date();
        d.setDate(d.getDate() + 3); // Default +3 days
        d.setHours(8, 0, 0, 0); // Default 08:00 AM
        return d;
    });

    // 4. Final Processing
    const [isSheetCreating, setIsSheetCreating] = useState(false);
    const [tempDoc, setTempDoc] = useState<any>(null);

    // 5. Student List Verification
    const [showStudentListModal, setShowStudentListModal] = useState(false);

    // 6. Preview & Emotional Branding
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.path || null);
    const [randomGreeting] = useState(() => WARM_GREETINGS[Math.floor(Math.random() * WARM_GREETINGS.length)]);

    // --- Session Storage Persistence ---
    useEffect(() => {
        if (initialData) return; // Skip draft loading if we have initialData

        const loadDraft = () => {
            try {
                const saved = sessionStorage.getItem('gatong_wizard_draft');
                if (!saved) return;

                const draft = JSON.parse(saved);

                // Restore Basic Info
                if (draft.title) setTitle(draft.title);
                if (draft.content) setContent(draft.content);
                if (draft.docType) setDocType(draft.docType);
                if (draft.step) setStep(draft.step);

                // Restore Form Items
                if (draft.formItems) setFormItems(draft.formItems);

                // Restore Target Info
                if (draft.targetCategory) setTargetCategory(draft.targetCategory);
                if (draft.selectedGrades) setSelectedGrades(draft.selectedGrades);
                if (draft.selectedClasses) setSelectedClasses(draft.selectedClasses);
                if (draft.targetStudents) setTargetStudents(draft.targetStudents);

                // Restore Deadline
                if (draft.deadline) setDeadline(new Date(draft.deadline));

                // Restore File (if exists and valid)
                if (draft.fileData && draft.fileName && draft.fileType) {
                    // Convert Base64 back to File
                    const byteString = atob(draft.fileData.split(',')[1]);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: draft.fileType });
                    const restoredFile = new File([blob], draft.fileName, { type: draft.fileType });

                    setFile(restoredFile);
                    const url = URL.createObjectURL(restoredFile);
                    setPreviewUrl(url);
                }
            } catch (e) {
                console.error("Failed to load draft:", e);
                sessionStorage.removeItem('gatong_wizard_draft');
            }
        };

        loadDraft();
    }, []);

    // Save Draft on Change
    useEffect(() => {
        const saveDraft = async () => {
            const draft: any = {
                step,
                title,
                content,
                docType,
                formItems,
                targetCategory,
                selectedGrades,
                selectedClasses,
                targetStudents,
                deadline: deadline.toISOString(),
                previewUrl, // Include previewUrl for dashboard
            };

            // Notify parent
            if (onDraftUpdate) {
                onDraftUpdate(draft);
            }

            // If file exists, try to save it (with size check/limit handling implicitly by try-catch)
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        draft.fileData = e.target?.result;
                        draft.fileName = file.name;
                        draft.fileType = file.type;
                        sessionStorage.setItem('gatong_wizard_draft', JSON.stringify(draft));
                    } catch (err) {
                        console.warn("File too large for session storage, saving text only.");
                        // Retry without file
                        const { fileData, fileName, fileType, ...textDraft } = draft;
                        sessionStorage.setItem('gatong_wizard_draft', JSON.stringify(textDraft));
                    }
                };
                reader.readAsDataURL(file);
            } else {
                sessionStorage.setItem('gatong_wizard_draft', JSON.stringify(draft));
            }
        };

        const timeoutId = setTimeout(saveDraft, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [step, title, docType, formItems, targetCategory, selectedGrades, selectedClasses, targetStudents, deadline, file, previewUrl, onDraftUpdate]);


    const getMatchedStudents = () => {
        const ids = Array.from(new Set(targetStudents.split(/[\n, ]+/).filter(id => id.trim())));
        return ids.map(id => {
            const inputId = id.trim();
            const student = allStudents.find(s =>
                s.id === inputId ||
                s.student_num?.toString() === inputId
            );
            return {
                id: inputId,
                name: student ? student.name : '미등록 학생',
                isFound: !!student
            };
        });
    };

    // --- Handlers ---

    // ... OCR (omitted for brevity, keep existing) ...

    const calculateTotalTarget = () => {
        if (!schoolConfig) return 0;

        // 1. Individual
        if (targetCategory === 'student') {
            return Array.from(new Set(targetStudents.split(/[\n, ]+/).filter(id => id.trim()))).length;
        }

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
            setShowTitleHint(true);
        } catch (err) {
            console.error("OCR Error", err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ... Dropzone ...
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const f = acceptedFiles[0];
            setFile(f);

            // Generate preview URL
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            const url = URL.createObjectURL(f);
            setPreviewUrl(url);

            // Set title to filename automatically for all files
            const filenameTitle = f.name === 'image.png' ? `문서_${new Date().getHours()}시${new Date().getMinutes()}분` : f.name.replace(/\.[^/.]+$/, "");
            setTitle(filenameTitle);

            // AI Title Recommendation (OCR) is skipped for file uploads per user request.
            // It only runs for pasted 'captures' where the filename is generic.
        }
    }, [previewUrl]); // Added previewUrl to dependencies for cleanup

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected: () => alert('지원되지 않는 파일 형식입니다.\nPDF 또는 이미지(JPG, PNG) 파일만 업로드해주세요.'),
        accept: { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
        multiple: false
    });

    const titleInputRef = useRef<HTMLTextAreaElement>(null);
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

                        // Generate preview URL
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        const url = URL.createObjectURL(blob);
                        setPreviewUrl(url);

                        // Set title from filename
                        const filenameTitle = blob.name === 'image.png' ? `문서_${new Date().getHours()}시${new Date().getMinutes()}분` : blob.name.replace(/\.[^/.]+$/, "");
                        setTitle(filenameTitle);

                        if (blob.type.startsWith('image/')) analyzeImage(blob);
                    }
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [step, title, previewUrl]);

    // Auto-resize title textarea for vertical centering
    useEffect(() => {
        if (titleInputRef.current) {
            titleInputRef.current.style.height = 'auto';
            titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
        }
    }, [title, step]);

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // ... Type Selection ...

    // ... Form Builder Helpers ...
    const addFormItem = (type: FormItem['type']) => {
        setFormItems(prev => {
            const newItem = {
                id: Date.now().toString(),
                type,
                label: type === 'text' ? '새 주관식 질문' : '새 객관식 질문',
                options: type === 'radio' ? ['옵션1', '옵션2'] : undefined,
                required: true
            };
            const sig = prev.find(i => i.type === 'signature');
            const others = prev.filter(i => i.type !== 'signature');
            return [...others, newItem, ...(sig ? [sig] : [])];
        });
    };
    const updateFormItem = (id: string, update: Partial<FormItem>) => {
        setFormItems(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
    };
    const removeFormItem = (id: string) => {
        setFormItems(prev => prev.filter(item => item.id !== id));
    };

    const applyPreset = (presetId: string) => {
        const preset = SURVEY_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const newItems = preset.items.map(item => ({
            ...item,
            id: (Date.now() + Math.random()).toString(),
        }));

        setFormItems(prev => {
            // Keep signature at the bottom
            const sig = prev.find(i => i.type === 'signature');
            const others = prev.filter(i => i.type !== 'signature');
            return [...others, ...newItems, ...(sig ? [sig] : [])];
        });
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
        let finalDocData = null;
        if (file) {
            const uploadResult = await uploadDocument(
                file,
                deadline.toISOString(),
                formItems,
                title,
                docType === 'action' ? 'action' : 'notice',
                content
            );
            if (uploadResult.success) {
                finalDocData = uploadResult.data;
            } else {
                console.error("Supabase upload failed, falling back to local storage only:", uploadResult.error);
            }
        }

        const newDoc = {
            id: finalDocData?.id || Date.now().toString(),
            title: title,
            content: content,
            type: docType === 'action' ? 'action' : 'notice',
            created_at: finalDocData?.created_at || new Date().toISOString(),
            status: 'ongoing',
            submitted_count: 0,
            total_count: calculateTotalTarget(),
            deadline: deadline.toISOString(),
            formItems: formItems,
            sheetUrl: "https://docs.google.com/spreadsheets/d/mock-sheet-id",
            targetSummary: getTargetSummary(),
            path: finalDocData?.path || fileData as string, // Use Supabase URL if available, else Base64
            fileData: fileData,
            fileType: file?.type,
            sheetId: generateSheetId('school_2025', new Date().getFullYear(), (finalDocData?.id || Date.now().toString()).slice(0, 8))
        };

        // Create Sheet in GAS (Async, don't block)
        const schoolCfg = getSchoolConfig();
        createSheet(newDoc.sheetId, newDoc.formItems.map(i => i.label), schoolCfg.submissionSpreadsheetId).catch(console.error);

        const savedDocs = JSON.parse(localStorage.getItem('gatong_docs') || '[]');
        savedDocs.push(newDoc);
        localStorage.setItem('gatong_docs', JSON.stringify(savedDocs));

        // Auto-register to dashboard IMMEDIATELY
        onSuccess(newDoc);

        setTempDoc(newDoc);
        setIsSheetCreating(false);
        setStep('completed');

        // Clear Draft
        sessionStorage.removeItem('gatong_wizard_draft');
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
        const text = `[가정통신문] ${title}\n\n${randomGreeting}\n\n${content}\n\n📅 마감: ${formattedDeadline}까지\n📄 내용 확인 및 서명하기:\n${url}\n\n늘 감사드립니다 🙏`;
        navigator.clipboard.writeText(text);
        alert("쿨알림톡용 텍스트가 복사되었습니다.");
    };

    return (
        <div className="h-full flex flex-col bg-[var(--color-background)]/50 backdrop-blur-md overflow-hidden relative text-[var(--color-foreground)]">


            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
                <AnimatePresence mode="wait">

                    {/* PROCESSING VIEW */}
                    {step === 'processing' && (
                        <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-20">
                            <div className="w-20 h-20 relative">
                                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                <Sheet className="absolute inset-0 m-auto text-emerald-500" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-[var(--color-foreground)] mt-8 mb-2">통신문 생성 중...</h3>
                            <p className="text-[var(--color-muted-foreground)] text-center font-medium">
                                잠시만 기다려 주세요.
                            </p>
                        </motion.div>
                    )}

                    {/* COMPLETED VIEW */}
                    {step === 'completed' && tempDoc && (
                        <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 relative max-w-2xl mx-auto">
                            <button
                                onClick={() => setStep('input')}
                                className="absolute left-0 top-0 p-2 hover:bg-[var(--color-background)]/[0.05] rounded-full text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                            >
                                <ChevronRight className="rotate-180" size={20} />
                            </button>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)] mb-4 animate-bounce">
                                    <Check size={32} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-[var(--color-foreground)]">{[
                                    "💌 학부모님께 전달 준비가 완료되었습니다!",
                                    "✨ 따뜻한 소통이 곧 시작됩니다!",
                                    "🎉 가정과의 연결이 준비되었습니다!",
                                    "💝 소중한 마음을 전할 준비가 끝났습니다!"
                                ][Math.floor(Math.random() * 4)]}</h3>
                                <p className="text-sm text-[var(--color-muted-foreground)] mt-2">학부모님께 따뜻한 안내를 전달해보세요</p>
                            </div>

                            {/* Link Box */}
                            <div className="bg-[var(--color-background)]/[0.03] border border-[var(--color-border)] rounded-2xl p-6 space-y-6 text-left">
                                <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
                                    <Sparkles size={14} /> 생성된 통신문 요약
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">인사말</span>
                                        <p className="text-sm font-medium text-[var(--color-foreground)]">{randomGreeting}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">제목</span>
                                        <p className="text-sm font-black text-indigo-500">{title}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">내용</span>
                                        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">{content || '내용이 입력되지 않았습니다.'}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">제출 마감</span>
                                        <p className="text-sm font-bold text-rose-500 flex items-center gap-1.5"><Clock size={12} /> {formattedDeadline}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">신청 링크</span>
                                        <p className="text-[11px] font-mono text-indigo-400 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10 truncate">
                                            {typeof window !== 'undefined' ? window.location.origin : ''}/s/${tempDoc.id}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
                                    <p className="text-[11px] text-[var(--color-muted-foreground)] flex items-center gap-2">
                                        <Copy size={12} /> 쿨알림톡 전달용 메시지 구성
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={handleCopyText} className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all">
                                            <Copy size={14} /> 메시지 복사
                                        </button>
                                        <button onClick={() => setShowFullPreview(true)} className="py-3 bg-[var(--color-background)]/[0.05] hover:bg-[var(--color-background)]/[0.1] text-[var(--color-foreground)] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border border-[var(--color-border)]">
                                            <Smartphone size={14} /> 모바일 미리보기
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleFinalize} className="w-full py-4 bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90 rounded-2xl font-black transition-all">
                                닫기
                            </button>
                        </motion.div>
                    )}

                    {/* INPUT FORM (WATERFALL) */}
                    {(step !== 'processing' && step !== 'completed') && (
                        <div className="h-full">

                            <motion.div
                                key="edit-form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="space-y-12 pb-20 max-w-[95%] mx-auto"
                            >
                                {/* SECTION 1: UPLOAD & TITLE */}
                                <section className="space-y-8">
                                    <div {...getRootProps()} className={cn(
                                        "border-2 border-dashed rounded-[2rem] p-4 text-center cursor-pointer transition-all duration-500 group relative overflow-hidden w-full mx-auto",
                                        isDragActive ? "border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/20" :
                                            file ? "border-emerald-500/50 bg-emerald-500/5" : "border-[var(--color-border)] hover:border-indigo-500/50 hover:bg-[var(--color-background)]/[0.02]"
                                    )}>
                                        <input {...getInputProps()} />
                                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-background)]/[0.05] mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                            {file ? <CheckCircle2 size={24} className="text-emerald-400" /> : <Upload size={24} className="text-[var(--color-muted-foreground)] group-hover:text-indigo-400" />}
                                        </div>
                                        {file ? (
                                            <>
                                                <p className="text-[var(--color-foreground)] font-black text-lg tracking-tight">{file.name}</p>
                                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mt-1">업로드 완료!</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[var(--color-foreground)] font-bold text-lg mb-0.5 tracking-tight">문서 파일을 업로드하세요</p>
                                                <p className="text-[var(--color-muted-foreground)] text-xs mb-3">PDF, JPG, PNG 형식을 지원합니다</p>
                                                <div className="text-indigo-300 text-[10px] font-bold bg-indigo-500/10 px-3 py-1.5 rounded-full inline-flex items-center gap-2 border border-indigo-500/20">
                                                    <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                    캡처했다면 이곳 클릭하지 말고 <strong>Ctrl + V</strong>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            <h3 className="text-xl font-black text-[var(--color-foreground)] tracking-tight">가정통신문 제목</h3>
                                        </div>
                                        <div className={cn(
                                            "relative group bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-2xl transition-all h-[75px] flex items-center focus-within:border-indigo-600 shadow-sm",
                                            isAnalyzing && "animate-pulse"
                                        )}>
                                            <textarea
                                                ref={titleInputRef}
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                placeholder={isAnalyzing ? "AI가 제목을 분석하고 있습니다..." : "예: 2024학년도 체험학습 신청 안내"}
                                                className={cn(
                                                    "w-full bg-transparent border-none px-6 py-0 text-[var(--color-foreground)] outline-none transition-all font-bold placeholder:text-[var(--color-muted-foreground)] resize-none h-auto block leading-tight",
                                                    isAnalyzing && "text-[var(--color-muted-foreground)]"
                                                )}
                                                readOnly={isAnalyzing}
                                                rows={1}
                                            />
                                            <AnimatePresence>
                                                {showTitleHint && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute left-0 right-0 top-full mt-4 bg-[var(--color-card)] border border-indigo-500/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 overflow-hidden"
                                                    >
                                                        <div className="px-5 py-4 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                                <Sparkles size={12} /> AI 추천 검색 결과
                                                            </span>
                                                            <button onClick={() => setShowTitleHint(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                        <div className="p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                                                            {titleCandidates.map((cand, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setTitle(cand);
                                                                        setShowTitleHint(false);
                                                                    }}
                                                                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-[var(--color-background)]/[0.05] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-all text-sm font-medium flex items-center gap-3 group"
                                                                >
                                                                    <span className="w-5 h-5 rounded-md bg-[var(--color-background)]/[0.05] flex items-center justify-center text-[10px] text-[var(--color-muted-foreground)] group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                                                                        {idx + 1}
                                                                    </span>
                                                                    {cand}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                            <h3 className="text-xl font-black text-[var(--color-foreground)] tracking-tight">전달 내용 (선택)</h3>
                                        </div>
                                        <div className="bg-[var(--color-background)]/[0.03] border border-[var(--color-border)] rounded-2xl focus-within:border-indigo-600/50 transition-all p-4">
                                            <textarea
                                                value={content}
                                                onChange={e => setContent(e.target.value)}
                                                placeholder="학부모님께 전달할 간단한 메시지를 입력해주세요. (예: 이번 현장체험학습은 안전을 최우선으로 진행됩니다.)"
                                                className="w-full bg-transparent border-none outline-none text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] resize-none h-24"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* SECTION 2: FORM BUILDER */}
                                {true && (
                                    <motion.section
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6 pt-4 border-t border-[var(--color-border)]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                                <h3 className="text-xl font-black text-[var(--color-foreground)] tracking-tight">항목 구성 설정</h3>
                                            </div>
                                        </div>

                                        {/* Quick Presets */}
                                        <div className="space-y-4">
                                            <p className="text-[12px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <Wand2 size={14} /> 전문가 추천 프리셋 (한 번에 추가)
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {SURVEY_PRESETS.map((preset) => {
                                                    const Icon = {
                                                        CheckCircle2,
                                                        Stethoscope: HeartPulse,
                                                        Phone,
                                                        Map,
                                                        ShieldCheck
                                                    }[preset.icon] || Sparkles;

                                                    return (
                                                        <button
                                                            key={preset.id}
                                                            onClick={() => applyPreset(preset.id)}
                                                            className="flex flex-col items-start p-4 bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
                                                        >
                                                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform">
                                                                <Icon size={18} />
                                                            </div>
                                                            <div className="text-[13px] font-black text-[var(--color-foreground)] mb-1">{preset.name}</div>
                                                            <div className="text-[10px] text-[var(--color-muted-foreground)] leading-tight">{preset.description}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {formItems
                                                .sort((a, b) => (a.type === 'signature' ? 1 : b.type === 'signature' ? -1 : 0))
                                                .map((item) => (
                                                    <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-[var(--color-background)]/[0.03] border border-[var(--color-border)] rounded-2xl p-6 space-y-4 hover:border-indigo-600/30 transition-all shadow-sm group/item relative">
                                                        {item.type !== 'signature' && (
                                                            <button
                                                                onClick={() => removeFormItem(item.id)}
                                                                className="absolute top-4 right-4 p-2 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                        <div className="flex items-center gap-4">
                                                            <div className="p-3 bg-indigo-600/10 rounded-2xl text-indigo-600">
                                                                {item.type === 'text' ? <AlignLeft size={20} /> : item.type === 'signature' ? <PenTool size={20} /> : <ListChecks size={20} />}
                                                            </div>
                                                            <input
                                                                value={item.label}
                                                                onChange={(e) => updateFormItem(item.id, { label: e.target.value })}
                                                                placeholder="질문 내용을 입력하세요"
                                                                className="flex-1 bg-transparent border-none outline-none text-[var(--color-foreground)] font-black text-lg placeholder:text-[var(--color-muted-foreground)]"
                                                                readOnly={item.type === 'signature'}
                                                            />
                                                        </div>
                                                        {item.options && (
                                                            <div className="ml-16 space-y-3">
                                                                {item.options.map((opt, optIdx) => (
                                                                    <div key={optIdx} className="flex items-center gap-3 group">
                                                                        <div className="w-2 h-2 rounded-full bg-[var(--color-border)] group-focus-within:bg-indigo-600 transition-colors" />
                                                                        <input
                                                                            value={opt}
                                                                            onChange={(e) => {
                                                                                const newOptions = [...(item.options || [])];
                                                                                newOptions[optIdx] = e.target.value;
                                                                                updateFormItem(item.id, { options: newOptions });
                                                                            }}
                                                                            className="flex-1 bg-transparent text-sm text-[var(--color-muted-foreground)] outline-none border-b border-[var(--color-border)] focus:border-indigo-500/50 py-1 transition-colors placeholder:text-[var(--color-muted-foreground)]/50"
                                                                            placeholder={`옵션 ${optIdx + 1}`}
                                                                        />
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    onClick={() => {
                                                                        const newOptions = [...(item.options || []), ''];
                                                                        updateFormItem(item.id, { options: newOptions });
                                                                    }}
                                                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-widest mt-2 flex items-center gap-1.5"
                                                                >
                                                                    <Plus size={12} /> 옵션 추가
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ))}
                                        </div>
                                        <div className="flex items-center gap-3 px-1 text-[13px] text-indigo-600 font-black">
                                            <AlertCircle size={16} />
                                            <span>모든 회신형 문서에는 &apos;서명&apos;란이 기본으로 포함됩니다.</span>
                                        </div>
                                    </motion.section>
                                )}

                                {/* SECTION 4: TARGET & DEADLINE & SUBMIT */}
                                {docType && (
                                    <motion.section
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-8 pt-4 border-t border-[var(--color-border)]"
                                    >
                                        {/* Target */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                                                    <h3 className="text-xl font-black text-[var(--color-foreground)] tracking-tight">발송 대상 설정</h3>
                                                </div>
                                                <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-full flex items-center gap-2 shadow-sm">
                                                    <Users size={14} />
                                                    <span className="text-sm font-black">
                                                        총 <span className="">{calculateTotalTarget()}</span>명 선택됨
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="flex p-1.5 bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] rounded-2xl">
                                                    <button
                                                        onClick={() => setTargetCategory('group')}
                                                        className={cn(
                                                            "flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300",
                                                            targetCategory === 'group'
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                                                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)]/[0.05]"
                                                        )}
                                                    >
                                                        그룹 선택
                                                    </button>
                                                    <button
                                                        onClick={() => setTargetCategory('student')}
                                                        className={cn(
                                                            "flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300",
                                                            targetCategory === 'student'
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                                                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-background)]/[0.05]"
                                                        )}
                                                    >
                                                        개별 입력
                                                    </button>
                                                </div>

                                                {targetCategory === 'group' && schoolConfig ? (
                                                    <div className="space-y-4">
                                                        {/* Quick Selection (Total & Departments) */}
                                                        <div className="flex gap-2.5">
                                                            <button
                                                                onClick={selectAllStudents}
                                                                className={cn(
                                                                    "flex-1 py-4 px-2 rounded-2xl text-[13px] font-black transition-all duration-300 border backdrop-blur-md",
                                                                    (selectedGrades.length === schoolConfig.grades.length && selectedClasses.length === 6)
                                                                        ? "bg-indigo-600 text-white border-indigo-400 shadow-xl shadow-indigo-600/30 ring-2 ring-indigo-500/20"
                                                                        : "bg-[var(--color-background)]/[0.05] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]/[0.1] hover:border-[var(--color-border)]"
                                                                )}
                                                            >
                                                                전체 학생
                                                            </button>
                                                            {schoolConfig.departments.map((dept: any) => {
                                                                const isIoT = dept.id === 'iot';
                                                                const isActive = selectedClasses.length === (dept.classRange.end - dept.classRange.start + 1) &&
                                                                    selectedClasses.every(c => c >= dept.classRange.start && c <= dept.classRange.end);

                                                                return (
                                                                    <button
                                                                        key={dept.id}
                                                                        onClick={() => selectDept(dept)}
                                                                        className={cn(
                                                                            "flex-[1.5] py-4 px-2 rounded-2xl text-[13px] font-black transition-all duration-300 border backdrop-blur-md",
                                                                            isActive
                                                                                ? isIoT
                                                                                    ? "bg-emerald-600 text-white border-emerald-400 shadow-xl shadow-emerald-500/30 ring-2 ring-emerald-500/20"
                                                                                    : "bg-rose-600 text-white border-rose-400 shadow-xl shadow-rose-500/30 ring-2 ring-rose-500/20"
                                                                                : "bg-[var(--color-background)]/[0.05] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]/[0.1] hover:border-[var(--color-border)]"
                                                                        )}
                                                                    >
                                                                        {dept.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Grade Selection */}
                                                        <div className="space-y-4">
                                                            <div className="space-y-3">
                                                                <p className="text-[13px] font-black text-[var(--color-foreground)] uppercase tracking-tight ml-1">학년 선택</p>
                                                                <div className="flex gap-2">
                                                                    {schoolConfig.grades.map((grade: number) => (
                                                                        <button
                                                                            key={grade}
                                                                            onClick={() => toggleGrade(grade)}
                                                                            className={cn(
                                                                                "flex-1 h-12 rounded-xl text-sm font-black transition-all duration-300 border backdrop-blur-md",
                                                                                selectedGrades.includes(grade)
                                                                                    ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20"
                                                                                    : "bg-[var(--color-background)]/[0.05] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]/[0.1]"
                                                                            )}
                                                                        >
                                                                            {grade}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <p className="text-[13px] font-black text-[var(--color-foreground)] uppercase tracking-tight ml-1">반 선택</p>
                                                                <div className="flex gap-2">
                                                                    {Array.from({ length: 6 }, (_, i) => i + 1).map((c) => {
                                                                        const isSelected = selectedClasses.includes(c);
                                                                        const dept = schoolConfig?.departments.find((d: any) => c >= d.classRange.start && c <= d.classRange.end);
                                                                        const isIoT = dept?.id === 'iot';
                                                                        return (
                                                                            <button
                                                                                key={c}
                                                                                onClick={() => toggleClass(c)}
                                                                                className={cn(
                                                                                    "flex-1 h-12 rounded-xl text-sm font-black transition-all duration-300 border backdrop-blur-md flex flex-col items-center justify-center gap-0.5",
                                                                                    isSelected
                                                                                        ? isIoT
                                                                                            ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/20"
                                                                                            : "bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/30 ring-2 ring-rose-500/20"
                                                                                        : "bg-[var(--color-background)]/[0.05] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-background)]/[0.1]"
                                                                                )}
                                                                            >
                                                                                <span className="leading-none text-base">{c}</span>
                                                                                <span className={cn(
                                                                                    "text-[9px] font-bold opacity-0 transition-opacity leading-none mt-0.5",
                                                                                    isSelected ? "opacity-60" : "group-hover:opacity-40"
                                                                                )}>
                                                                                    {dept?.shortName || '일반'}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : targetCategory === 'student' ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-sm text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest">개별 학번 입력</label>
                                                            {targetStudents.trim() && (
                                                                <button
                                                                    onClick={() => setShowStudentListModal(true)}
                                                                    className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2 text-sm font-black text-indigo-400 hover:bg-indigo-500/20 transition-all"
                                                                >
                                                                    <Users size={14} />
                                                                    <span className="text-indigo-400">명단 확인</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <textarea
                                                            value={targetStudents}
                                                            onChange={e => setTargetStudents(e.target.value)}
                                                            placeholder="학번 입력 (예: 1101, 1102 ... 줄바꿈 가능)"
                                                            className={cn(
                                                                "w-full h-24 bg-[var(--color-background)]/[0.05] border rounded-2xl p-4 text-sm text-[var(--color-foreground)] outline-none resize-none font-mono transition-all duration-300",
                                                                targetStudents.split(/[\n, ]+/).filter(id => id.trim()).some(id => schoolConfig && id.trim().length !== schoolConfig.studentIdLength)
                                                                    ? "border-rose-500/50 focus:border-rose-500 focus:bg-rose-500/[0.02]"
                                                                    : "border-[var(--color-border)] focus:border-indigo-500/50 focus:bg-[var(--color-background)]/[0.07]"
                                                            )}
                                                        />
                                                        {targetStudents.split(/[\n, ]+/).filter(id => id.trim()).some(id => schoolConfig && id.trim().length !== schoolConfig.studentIdLength) && (
                                                            <p className="text-[12px] text-rose-500 font-bold flex items-center gap-1 animate-pulse">
                                                                <AlertCircle size={14} /> {schoolConfig?.studentIdLength || 4}자리 학번이 아닌 입력이 포함되어 있습니다. 확인 부탁드립니다.
                                                            </p>
                                                        )}
                                                        <p className="text-[12px] text-[var(--color-muted-foreground)]">콤마(,), 줄바꿈, 또는 공백으로 학번을 구분하세요.</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Deadline */}
                                        <div className="space-y-4">
                                            <h3 className="text-[var(--color-foreground)] font-bold text-lg flex items-center gap-2">
                                                <Clock size={20} className="text-indigo-500" /> 제출 마감
                                                <span className="text-xs text-indigo-500 font-normal ml-1">
                                                    (오늘로부터 {Math.ceil((new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))}일 뒤)
                                                </span>
                                            </h3>
                                            <div className="flex items-center justify-between bg-[var(--color-background)]/[0.05] border border-[var(--color-border)] p-4 rounded-2xl">
                                                <button onClick={() => adjustDeadline(-1)} className="w-10 h-10 rounded-xl bg-[var(--color-background)]/[0.05] hover:bg-[var(--color-background)]/[0.1] flex items-center justify-center text-[var(--color-foreground)]"><Minus size={18} /></button>
                                                <div className="text-center">
                                                    <div className="text-xl font-black text-[var(--color-foreground)]">{formattedDeadline}</div>
                                                    <div className="text-xs text-[var(--color-muted-foreground)] font-bold mt-1">
                                                        오전 8시 마감
                                                    </div>
                                                </div>
                                                <button onClick={() => adjustDeadline(1)} className="w-10 h-10 rounded-xl bg-[var(--color-background)]/[0.05] hover:bg-[var(--color-background)]/[0.1] flex items-center justify-center text-[var(--color-foreground)]"><Plus size={18} /></button>
                                            </div>
                                        </div>

                                        {/* Final Action Button */}
                                        <div className="pt-8 mb-10">
                                            <button
                                                onClick={startProcessing}
                                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group"
                                            >
                                                <Send size={28} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                                {initialData ? '변동 사항 저장' : '취합 등록'}
                                            </button>
                                        </div>
                                    </motion.section>
                                )}
                            </motion.div>
                        </div>
                    )}

                </AnimatePresence>
            </div>

            {/* Student List Verification Modal */}
            <AnimatePresence>
                {
                    showStudentListModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                            onClick={() => setShowStudentListModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
                            >
                                {/* Header */}
                                <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-background)]/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                            <Users size={18} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--color-foreground)] flex items-center gap-2">
                                            입력 명단 확인
                                            <span className="text-sm font-black text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                                {getMatchedStudents().length}명
                                            </span>
                                        </h3>
                                    </div>
                                    <button onClick={() => setShowStudentListModal(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    <div className="space-y-2">
                                        {getMatchedStudents().map((student, idx) => (
                                            <div
                                                key={idx}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                                                    student.isFound
                                                        ? "bg-white/[0.03] border-white/5"
                                                        : "bg-rose-500/5 border-rose-500/20"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-mono text-[var(--color-muted-foreground)]">{student.id}</span>
                                                    <span className={cn(
                                                        "text-sm font-bold",
                                                        student.isFound ? "text-[var(--color-foreground)]" : "text-rose-500"
                                                    )}>
                                                        {student.name}
                                                    </span>
                                                </div>
                                                {student.isFound ? (
                                                    <CheckCircle2 size={14} className="text-emerald-500/50" />
                                                ) : (
                                                    <AlertCircle size={14} className="text-rose-500/50" />
                                                )}
                                            </div>
                                        ))}
                                        {getMatchedStudents().length === 0 && (
                                            <div className="text-center py-12 text-[var(--color-muted-foreground)] text-sm">
                                                입력된 학번이 없습니다.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/[0.01] flex justify-center text-[11px] text-[var(--color-muted-foreground)] font-medium">
                                    등록되지 않은 학번은 빨간색으로 표시됩니다.
                                </div>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>

            {/* FULL PREVIEW MODAL (Smartphone Frame) */}
            <AnimatePresence>
                {
                    showFullPreview && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4"
                            onClick={() => setShowFullPreview(false)}
                        >
                            <div className="absolute top-6 right-6 z-[110]">
                                <button
                                    onClick={() => setShowFullPreview(false)}
                                    className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            <motion.div
                                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                className="w-full h-full max-w-lg flex flex-col items-center justify-center"
                                onClick={e => e.stopPropagation()}
                            >
                                {tempDoc || initialData ? (
                                    <div className="w-full h-full">
                                        <ActiveDocumentViewer
                                            document={tempDoc || initialData}
                                            students={[]}
                                            submissions={[]}
                                            activeTab="preview"
                                            hideHeader={true}
                                        />
                                    </div>
                                ) : previewUrl ? (
                                    <div className="w-full h-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                                        <div className="flex-1 overflow-auto">
                                            {file?.type.startsWith('image/') ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-auto" />
                                            ) : (
                                                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full border-0" title="PDF Preview" />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-white">미리보기 데이터를 불러올 수 없습니다.</div>
                                )}
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence>
        </div >
    );
}

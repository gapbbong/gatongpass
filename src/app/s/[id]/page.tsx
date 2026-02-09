'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, User, PenTool, Calendar, ShieldCheck, AlertCircle, Heart, ThermometerSun, TrendingUp, Download, ZoomIn, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import SignatureCanvas from 'react-signature-canvas';
import { submitToGAS, generateSheetId } from '@/lib/gasClient';

const GREETINGS_MAP: Record<string, string[]> = {
    high: [
        "학생의 꿈과 미래를 항상 응원합니다. ✨",
        "학교를 믿고 자녀를 맡겨주시는 학부모님께 깊은 감사를 드립니다. ❤️",
        "오늘도 학생들의 성장을 위해 애쓰시는 학부모님, 진심으로 존경합니다. 👏",
        "학교와 가정이 한마음으로 소통할 때, 학생들은 더 높이 비상합니다. 🚀",
        "자녀의 성공적인 학교 생활과 미래를 위해 최선을 다하겠습니다. 🙏",
        "언제나 학교 교육에 적극적으로 협조해주시는 학부모님 덕분에 학교가 더욱 발전합니다. 🏫",
        "꿈을 향해 도전하는 학생들의 든든한 조력자가 되어주셔서 감사합니다. 💪",
        "학생들이 더 나은 미래를 설계할 수 있도록 늘 고민하고 지도하겠습니다. 🎓"
    ],
    default: [
        "우리 아이의 꿈과 미래를 항상 응원합니다. ✨",
        "학교를 믿고 아이를 맡겨주시는 학부모님께 깊은 감사를 드립니다. ❤️",
        "오늘도 우리 아이들의 성장을 위해 애쓰시는 학부모님, 정말 존경하고 감사합니다. 👏",
        "학교와 가정이 한마음으로 소통할 때, 우리 아이들은 더 크게 자라납니다. 🌱",
        "자녀의 행복한 학교 생활을 위해 최선을 다하겠습니다. 함께해주셔서 감사합니다. 🙏",
        "언제나 학교 교육에 적극적으로 참여해주시는 학부모님 덕분에 학교가 더욱 따뜻해집니다. 🏠",
        "꿈을 향해 나아가는 학생들의 든든한 버팀목이 되어주셔서 감사합니다. 💪",
        "우리 아이들이 더 좋은 환경에서 배울 수 있도록 늘 고민하고 노력하겠습니다. 🎓"
    ]
};

// Types (Should match Admin types)
interface FormItem {
    id: string;
    type: 'select' | 'radio' | 'text' | 'checkbox' | 'signature';
    label: string;
    options?: string[];
    required: boolean;
}

interface DocumentData {
    id: string;
    title: string;
    content?: string; // Optional text content
    deadline: string;
    formItems: FormItem[];
    fileData?: string | null;
    fileType?: string | null;
    sheetId?: string; // Google Sheet ID for this document
}

// Mock Data for Demo (If no local storage found)
const MOCK_DOC: DocumentData = {
    id: 'demo',
    title: '2025학년도 1학기 현장체험학습 참가 신청서',
    deadline: '2025-05-20 16:30',
    formItems: [
        { id: '1', type: 'radio', label: '참가 여부', options: ['참가함', '불참함'], required: true },
        { id: '2', type: 'text', label: '학생 전화번호', required: true },
        { id: '3', type: 'signature', label: '보호자 서명', required: true }
    ],
    fileData: null,
    fileType: null
};

export default function SubmissionPage() {
    const params = useParams();
    const id = params?.id as string;
    const [doc, setDoc] = useState<DocumentData | null>(null);
    const [step, setStep] = useState<'intro' | 'student' | 'survey' | 'completed'>('intro');

    // Form States
    const [studentInfo, setStudentInfo] = useState({
        grade: '1',
        classNum: '1',
        studentNum: '',
        name: '',
        authPhone: '' // Parent phone last 4 digits
    });
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [isVerifying, setIsVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [engagementPoints, setEngagementPoints] = useState(36.5);
    const [schoolLevel, setSchoolLevel] = useState<'elementary' | 'middle' | 'high'>('high');
    const [randomGreeting, setRandomGreeting] = useState('');
    const [showFullPreview, setShowFullPreview] = useState(false);
    const sigPadRef = useRef<SignatureCanvas>(null);

    useEffect(() => {
        if (!id) return;

        // Load School Config for Phrasing
        const storedConfig = localStorage.getItem('school_config');
        let level: 'elementary' | 'middle' | 'high' = 'high';
        if (storedConfig) {
            const config = JSON.parse(storedConfig);
            level = config.schoolLevel || 'high';
            setSchoolLevel(level);
        }

        const greetings = GREETINGS_MAP[level] || GREETINGS_MAP.default;
        setRandomGreeting(greetings[Math.floor(Math.random() * greetings.length)]);

        // Load document from LocalStorage (Shared with Admin Demo)
        const savedDocs = localStorage.getItem('gatong_docs');
        if (savedDocs) {
            const docs = JSON.parse(savedDocs);
            const found = docs.find((d: any) => d.id === id);
            if (found) {
                setDoc(found);
            } else {
                setDoc(MOCK_DOC);
            }
        } else {
            setDoc(MOCK_DOC);
        }

        // Load Global Demo Temperature (for initial view)
        const savedStats = localStorage.getItem('gatong_stats_demo');
        if (savedStats) {
            setEngagementPoints(parseFloat(savedStats));
        }
    }, [id]);

    const handleNext = async () => {
        if (step === 'intro') setStep('student');
        else if (step === 'student') {
            if (!isStudentInfoValid) return;
            await verifyStudent();
        } else if (step === 'survey') {
            if (!isSurveyValid) return;
            submitForm();
        }
    };

    const isStudentInfoValid = !!(studentInfo.studentNum && studentInfo.name && studentInfo.authPhone && studentInfo.authPhone.length === 4);

    const isSurveyValid = doc?.formItems.every(item => {
        if (!item.required) return true;
        const resp = responses[item.id];
        if (item.type === 'signature') return !!resp;
        if (item.type === 'text') return !!resp && resp.trim().length > 0;
        return !!resp;
    }) ?? false;

    const verifyStudent = async () => {
        setIsVerifying(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/students/import');
            const data = await res.json();

            if (!data.success) throw new Error('학생 정보를 확인 중 오류가 발생했습니다.');

            // 3-point Verification Logic
            const student = data.students.find((s: any) =>
                s.grade === parseInt(studentInfo.grade) &&
                s.class_num === parseInt(studentInfo.classNum) &&
                s.student_num === parseInt(studentInfo.studentNum) &&
                s.name === studentInfo.name
            );

            if (!student) {
                setErrorMsg('학생 정보를 찾을 수 없습니다. 정보를 다시 확인해주세요.');
                return;
            }

            // Check Parent Phone (last 4 digits)
            const fatherPhone = student.parents?.father?.replace(/[^0-9]/g, '');
            const motherPhone = student.parents?.mother?.replace(/[^0-9]/g, '');

            const fatherLast4 = fatherPhone?.slice(-4);
            const motherLast4 = motherPhone?.slice(-4);

            if (studentInfo.authPhone === fatherLast4 || studentInfo.authPhone === motherLast4) {
                setStep('survey');
            } else {
                setErrorMsg('학부모 연락처 뒷 4자리가 일치하지 않습니다.');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('인증 과정에서 서버 오류가 발생했습니다.');
        } finally {
            setIsVerifying(false);
        }
    };

    const submitForm = async () => {
        setIsVerifying(true);

        try {
            // 1. Prepare Data for GAS
            const sheetId = doc?.sheetId || generateSheetId('default', new Date().getFullYear(), doc?.id || 'demo');

            // Extract response values in order of form items
            const responseValues = doc?.formItems.map(item => {
                const val = responses[item.id];
                // If signature, maybe just send "Signed" or upload separately (GAS has limit)
                // For now, sending full data URL (might hit limits, but okay for MVP)
                return val || '';
            }) || [];

            // 2. Send to GAS
            const result = await submitToGAS({
                sheetId: sheetId,
                values: responseValues,
                studentInfo: {
                    grade: parseInt(studentInfo.grade),
                    class: parseInt(studentInfo.classNum),
                    number: parseInt(studentInfo.studentNum || '0'),
                    name: studentInfo.name
                },
                formFields: doc?.formItems.map(i => i.label) // Only send form fields, let backend handle full headers
            });

            if (!result.success) {
                // If fails (e.g. rate limit), throw error
                throw new Error(result.message || '제출 중 오류가 발생했습니다.');
            }

            // 3. Local Updates (Engagement Points)
            const studentKey = `temp_${studentInfo.grade}_${studentInfo.classNum}_${studentInfo.studentNum}_${studentInfo.name}`;
            const currentPoints = parseFloat(localStorage.getItem(studentKey) || "36.5");
            const newPoints = Math.min(100, currentPoints + 1.5);

            setEngagementPoints(newPoints);
            localStorage.setItem(studentKey, newPoints.toString());
            localStorage.setItem('gatong_stats_demo', newPoints.toString());

            // Save Signature for Reuse
            const sigItem = doc?.formItems.find(i => i.type === 'signature');
            if (sigItem && responses[sigItem.id]) {
                localStorage.setItem('gatong_saved_signature', responses[sigItem.id]);
            }

            setStep('completed');
        } catch (err) {
            console.error(err);
            setErrorMsg(err instanceof Error ? err.message : '제출에 실패했습니다. 다시 시도해주세요.');
            // Shake effect or visual feedback could be added here
        } finally {
            setIsVerifying(false);
        }
    };

    if (!doc) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div>;

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100">
            <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl shadow-slate-200 overflow-hidden flex flex-col relative">

                {/* Header */}
                <header className="h-14 border-b border-slate-100 flex items-center justify-center bg-white/80 backdrop-blur sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold italic text-xs">G</div>
                        <span className="font-bold text-slate-800 tracking-tight">GatongPass</span>
                    </div>
                </header>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full">
                    <motion.div
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{
                            width: step === 'intro' ? '25%' :
                                step === 'student' ? '50%' :
                                    step === 'survey' ? '90%' : '100%'
                        }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <AnimatePresence mode="wait">

                        {/* 1. INTRO */}
                        {step === 'intro' && (
                            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 py-8">
                                <div className="space-y-4 text-center">
                                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">가정통신문 도착</span>
                                    {/* Emotional Greeting */}
                                    <p className="text-[14px] font-bold text-indigo-500/60 leading-relaxed italic animate-pulse break-keep px-4 pb-2">
                                        &quot;{randomGreeting}&quot;
                                    </p>
                                    <h1 className="text-2xl font-black text-slate-900 leading-snug break-keep">
                                        {doc.title}
                                    </h1>

                                    {/* PREVIEW FILE (Image or PDF) */}
                                    {doc.fileData && (
                                        <div className="space-y-4">
                                            <div
                                                className="group relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white min-h-[150px] flex items-center justify-center cursor-zoom-in hover:border-indigo-500 transition-all"
                                                onClick={() => setShowFullPreview(true)}
                                            >
                                                {doc.fileType?.startsWith('image/') ? (
                                                    <img src={doc.fileData} alt="가정통신문 미리보기" className="w-full h-auto" />
                                                ) : (
                                                    <iframe
                                                        src={`${doc.fileData}#toolbar=0`}
                                                        className="w-full h-[300px] border-0 pointer-events-none"
                                                        title="PDF Preview"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-indigo-900/0 flex flex-col items-center justify-center opacity-100">
                                                    <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                                                        <div className="animate-pulse w-2 h-2 rounded-full bg-indigo-500" />
                                                        <span className="text-[12px] font-black text-indigo-600">터치해서 크게 보기</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Download Action */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!doc.fileData) return;
                                                        const link = document.createElement('a');
                                                        link.href = doc.fileData;
                                                        link.download = doc.title || '가정통신문';
                                                        link.click();
                                                    }}
                                                    className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    <Download size={18} /> 문서 다운로드 및 저장
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-slate-500">참여 부탁드리는 시간</div>
                                                <div className="text-sm font-bold text-slate-800">
                                                    {new Date(doc.deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} 오전 8:00
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-slate-500">보안 안내</div>
                                                <div className="text-xs text-slate-600 leading-relaxed">
                                                    이 문서는 암호화되어 안전하게 전송됩니다.<br />
                                                    본인 확인을 위해 학생 정보를 정확히 입력해주세요.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* 2. STUDENT INFO */}
                        {step === 'student' && (
                            <motion.div key="student" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                                <div className="space-y-2 mb-8">
                                    <h2 className="text-xl font-bold text-slate-900">학생 정보를 입력해주세요</h2>
                                    <p className="text-sm text-slate-500">정확한 출석 확인을 위해 필요합니다.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-black text-slate-500 ml-1 italic underline decoration-indigo-200">학년</label>
                                        <select
                                            value={studentInfo.grade}
                                            onChange={(e) => setStudentInfo({ ...studentInfo, grade: e.target.value })}
                                            className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl font-black text-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all appearance-none"
                                        >
                                            {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-black text-slate-500 ml-1 italic underline decoration-indigo-200">반</label>
                                        <select
                                            value={studentInfo.classNum}
                                            onChange={(e) => setStudentInfo({ ...studentInfo, classNum: e.target.value })}
                                            className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl font-black text-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all appearance-none"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-black text-slate-500 ml-1 italic underline decoration-indigo-200">번호 (Student No.)</label>
                                    <input
                                        type="tel"
                                        maxLength={2}
                                        value={studentInfo.studentNum}
                                        onChange={(e) => setStudentInfo({ ...studentInfo, studentNum: e.target.value.replace(/[^0-9]/g, '') })}
                                        placeholder="번호 입력"
                                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl font-black text-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-black text-slate-500 ml-1 italic underline decoration-indigo-200">이름 (Student Name)</label>
                                    <input
                                        type="text"
                                        value={studentInfo.name}
                                        onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                                        placeholder="이름 (예: 홍길동)"
                                        className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl font-black text-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-1 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                        <label className="text-sm font-black text-slate-500 select-none">학부모 연락처 뒷 4자리 (Verification)</label>
                                    </div>
                                    <input
                                        type="tel"
                                        maxLength={4}
                                        value={studentInfo.authPhone}
                                        onChange={(e) => setStudentInfo({ ...studentInfo, authPhone: e.target.value.replace(/[^0-9]/g, '') })}
                                        placeholder="연락처 뒷 번호 4자리 입력"
                                        className="w-full p-5 bg-indigo-50/30 border-2 border-indigo-100/50 rounded-2xl font-black text-2xl tracking-[0.3em] text-indigo-600 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all text-center placeholder:text-indigo-200 placeholder:tracking-normal placeholder:text-base"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-2 ml-1">학교에 등록된 보호자 연락처 뒷자리를 입력해주세요.</p>
                                </div>

                                {errorMsg && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-bold mt-4"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {errorMsg}
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* 3. SURVEY & SIGNATURE */}
                        {step === 'survey' && (
                            <motion.div key="survey" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-8 pb-20">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-bold text-slate-900">내용을 확인하고 응답해주세요</h2>
                                    <p className="text-sm text-slate-500">필수 항목은 꼭 작성해야 합니다.</p>
                                </div>

                                {doc.formItems.map((item) => (
                                    <div key={item.id} className="space-y-3 bg-white p-1 rounded-xl">
                                        <label className="flex items-center gap-2 text-[17px] font-black text-slate-800 leading-tight">
                                            {item.required && <span className="text-rose-500">*</span>}
                                            <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center text-[12px] shrink-0">Q</span>
                                            {item.label}
                                        </label>

                                        {item.type === 'radio' && (
                                            <div className="grid grid-cols-1 gap-3">
                                                {item.options?.map((opt) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setResponses({ ...responses, [item.id]: opt })}
                                                        className={cn(
                                                            "p-5 rounded-2xl text-[16px] font-black transition-all border-2 flex items-center justify-between group",
                                                            responses[item.id] === opt
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100"
                                                                : "bg-white text-slate-600 border-slate-100 hover:border-indigo-200"
                                                        )}
                                                    >
                                                        {opt}
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
                                                            responses[item.id] === opt ? "border-white bg-white/20" : "border-slate-200"
                                                        )}>
                                                            {responses[item.id] === opt && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {item.type === 'text' && (
                                            <textarea
                                                value={responses[item.id] || ''}
                                                onChange={(e) => setResponses({ ...responses, [item.id]: e.target.value })}
                                                placeholder="여기에 답변을 입력해 주세요..."
                                                className="w-full p-5 bg-white border-2 border-slate-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none resize-none h-40 transition-all placeholder:text-slate-300"
                                            />
                                        )}

                                        {item.type === 'signature' && (
                                            <div className="space-y-3">
                                                <div className="border-2 border-dashed border-indigo-100 rounded-2xl overflow-hidden bg-white relative h-56 touch-none shadow-inner">
                                                    <SignatureCanvas
                                                        ref={sigPadRef}
                                                        canvasProps={{ className: 'w-full h-full' }}
                                                        onEnd={() => setResponses({ ...responses, [item.id]: sigPadRef.current?.toDataURL() })}
                                                    />
                                                    {!responses[item.id] && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-indigo-300 pointer-events-none space-y-2">
                                                            <PenTool className="w-8 h-8 opacity-30" />
                                                            <span className="text-[15px] font-black opacity-40">이곳에 서명해 주세요</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center px-1">
                                                    <button
                                                        onClick={() => {
                                                            sigPadRef.current?.clear();
                                                            setResponses({ ...responses, [item.id]: null });
                                                        }}
                                                        className="text-xs text-slate-400 underline"
                                                    >
                                                        서명 다시하기
                                                    </button>

                                                    {localStorage.getItem('gatong_saved_signature') && !responses[item.id] && (
                                                        <button
                                                            onClick={() => {
                                                                const saved = localStorage.getItem('gatong_saved_signature');
                                                                if (saved) {
                                                                    setResponses({ ...responses, [item.id]: saved });
                                                                    // We can't easily "draw" back to canvas from dataURL without more logic, 
                                                                    // but setting the responsive state is enough for submission.
                                                                    // Optional: Add a preview of the loaded signature if needed.
                                                                }
                                                            }}
                                                            className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse"
                                                        >
                                                            <Sparkles size={12} /> 이전 서명 불러오기
                                                        </button>
                                                    )}
                                                </div>
                                                {responses[item.id] && responses[item.id].startsWith('data:image') && !sigPadRef.current?.isEmpty() === false && (
                                                    <div className="mt-2 p-2 border border-indigo-50 rounded-xl bg-indigo-50/30 flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-lg border border-indigo-100 overflow-hidden">
                                                            <img src={responses[item.id]} alt="Saved Sig" className="w-full h-full object-contain" />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-indigo-500">이전 서명이 불러와졌습니다.</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* 4. COMPLETED */}
                        {step === 'completed' && (
                            <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                                    <Check className="w-10 h-10" strokeWidth={3} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 mb-2">제출 완료!</h2>
                                    <p className="text-slate-500 text-sm">소중한 의견 감사합니다.<br />안전하게 학교로 전송되었습니다.</p>
                                </div>
                                <div className="w-full max-w-xs bg-slate-50 p-6 rounded-2xl text-left space-y-4 border border-slate-100 mt-8">
                                    {/* Engagement Meter */}
                                    <div className="space-y-2 pb-2 border-b border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                <TrendingUp className="w-3.5 h-3.5" /> {schoolLevel === 'high' ? '학생의 꿈 응원 온도' : '우리 아이 응원 온도'}
                                            </span>
                                            <span className="text-sm font-black text-rose-500">{engagementPoints.toFixed(1)}°C</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${engagementPoints}%` }}
                                                className="h-full bg-gradient-to-r from-orange-400 to-rose-500"
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 text-center pt-1">
                                            {schoolLevel === 'high' ? '참여해주실수록 학생의 미래가 더 따뜻해집니다 ❤️' : '참여해주실수록 자녀를 향한 온도가 높아집니다 ❤️'}
                                        </p>
                                    </div>

                                    <div className="flex justify-between text-sm pt-2">
                                        <span className="text-slate-500">제출자</span>
                                        <span className="font-bold text-slate-900">{studentInfo.grade}학년 {studentInfo.classNum}반 {studentInfo.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">제출일시</span>
                                        <span className="font-bold text-slate-900">{new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer Button */}
                {step !== 'completed' && (
                    <div className="p-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 w-full max-w-md mx-auto">
                        <button
                            onClick={handleNext}
                            disabled={isVerifying || (step === 'student' && !isStudentInfoValid) || (step === 'survey' && !isSurveyValid)}
                            className={cn(
                                "w-full py-5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2",
                                (isVerifying || (step === 'student' && !isStudentInfoValid) || (step === 'survey' && !isSurveyValid)) && "opacity-50 cursor-not-allowed grayscale-[0.5]"
                            )}
                        >
                            {isVerifying ? (
                                <div className="animate-spin w-5 h-5 border-3 border-white/50 border-t-white rounded-full" />
                            ) : (
                                <>
                                    {step === 'intro' ? '인증 후 열람하기' : step === 'student' ? '인증 및 다음으로' : step === 'survey' ? '제출하기' : '다음으로'}
                                    <ChevronRight className="w-6 h-6 opacity-80" strokeWidth={3} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* FULL PREVIEW MODAL */}
            <AnimatePresence>
                {showFullPreview && doc.fileData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex flex-col p-4"
                        onClick={() => setShowFullPreview(false)}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-black text-lg truncate max-w-[250px]">{doc.title}</h3>
                            <button
                                onClick={() => setShowFullPreview(false)}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 w-full rounded-2xl overflow-hidden bg-white shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            {doc.fileType?.startsWith('image/') ? (
                                <div className="w-full h-full overflow-auto flex items-start justify-center p-2">
                                    <img src={doc.fileData} alt="Full Preview" className="max-w-none w-full h-auto" />
                                </div>
                            ) : (
                                <iframe
                                    src={`${doc.fileData}#toolbar=0`}
                                    className="w-full h-full border-0"
                                    title="Full PDF Preview"
                                />
                            )}
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const link = document.createElement('a');
                                    link.href = doc.fileData || '';
                                    link.download = doc.title || 'document';
                                    link.click();
                                }}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl active:scale-[0.95] transition-all"
                            >
                                <Download size={24} /> 기기에 저장하기 (다운로드)
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

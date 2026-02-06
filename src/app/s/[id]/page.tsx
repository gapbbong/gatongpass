'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, User, PenTool, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SignatureCanvas from 'react-signature-canvas';

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
        name: ''
    });
    const [responses, setResponses] = useState<Record<string, any>>({});
    const sigPadRef = useRef<SignatureCanvas>(null);

    useEffect(() => {
        if (!id) return;

        // Load document from LocalStorage (Shared with Admin Demo)
        const savedDocs = localStorage.getItem('gatong_docs');
        if (savedDocs) {
            const docs = JSON.parse(savedDocs);
            const found = docs.find((d: any) => d.id === id);
            if (found) {
                setDoc(found);
                return;
            }
        }
        // Fallback to mock if not found (for testing URL directly)
        setDoc(MOCK_DOC);
    }, [id]);

    const handleNext = () => {
        if (step === 'intro') setStep('student');
        else if (step === 'student') {
            if (!studentInfo.studentNum || !studentInfo.name) {
                alert('번호와 이름을 모두 입력해주세요.');
                return;
            }
            setStep('survey');
        } else if (step === 'survey') {
            // Validate required fields
            const missing = doc?.formItems.filter(item => item.required && !responses[item.id]);
            if (missing && missing.length > 0) {
                alert('모든 필수 항목에 응답해주세요.');
                return;
            }
            submitForm();
        }
    };

    const submitForm = async () => {
        // Simulate API submission
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStep('completed');
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
                                    <h1 className="text-2xl font-black text-slate-900 leading-snug break-keep">
                                        {doc.title}
                                    </h1>

                                    {/* PREVIEW IMAGE */}
                                    {(doc as any).fileData && (doc as any).fileType?.startsWith('image/') && (
                                        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <img src={(doc as any).fileData} alt="가정통신문 미리보기" className="w-full h-auto" />
                                        </div>
                                    )}
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-left space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs font-bold text-slate-500">제출 기한</div>
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
                                        <label className="text-xs font-bold text-slate-500 ml-1">학년</label>
                                        <select
                                            value={studentInfo.grade}
                                            onChange={(e) => setStudentInfo({ ...studentInfo, grade: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none"
                                        >
                                            {[1, 2, 3].map(g => <option key={g} value={g}>{g}학년</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 ml-1">반</label>
                                        <select
                                            value={studentInfo.classNum}
                                            onChange={(e) => setStudentInfo({ ...studentInfo, classNum: e.target.value })}
                                            className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all appearance-none"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(c => <option key={c} value={c}>{c}반</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">번호</label>
                                    <input
                                        type="tel"
                                        maxLength={2}
                                        value={studentInfo.studentNum}
                                        onChange={(e) => setStudentInfo({ ...studentInfo, studentNum: e.target.value.replace(/[^0-9]/g, '') })}
                                        placeholder="번호 (예: 15)"
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:font-medium"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 ml-1">이름</label>
                                    <input
                                        type="text"
                                        value={studentInfo.name}
                                        onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                                        placeholder="이름 (예: 홍길동)"
                                        className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:font-medium"
                                    />
                                </div>
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
                                        <label className="flex items-center gap-1 text-sm font-bold text-slate-800">
                                            {item.required && <span className="text-rose-500">*</span>}
                                            Q. {item.label}
                                        </label>

                                        {item.type === 'radio' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                {item.options?.map((opt) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setResponses({ ...responses, [item.id]: opt })}
                                                        className={cn(
                                                            "p-4 rounded-xl text-sm font-bold transition-all border",
                                                            responses[item.id] === opt
                                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                                                                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                                        )}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {item.type === 'text' && (
                                            <textarea
                                                value={responses[item.id] || ''}
                                                onChange={(e) => setResponses({ ...responses, [item.id]: e.target.value })}
                                                placeholder="답변을 입력하세요..."
                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 outline-none resize-none h-24"
                                            />
                                        )}

                                        {item.type === 'signature' && (
                                            <div className="space-y-2">
                                                <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative h-40 touch-none">
                                                    <SignatureCanvas
                                                        ref={sigPadRef}
                                                        canvasProps={{ className: 'w-full h-full' }}
                                                        onEnd={() => setResponses({ ...responses, [item.id]: sigPadRef.current?.toDataURL() })}
                                                    />
                                                    {!responses[item.id] && (
                                                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none text-sm">
                                                            <PenTool className="w-4 h-4 mr-2" /> 여기에 서명하세요
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        sigPadRef.current?.clear();
                                                        setResponses({ ...responses, [item.id]: null });
                                                    }}
                                                    className="text-xs text-slate-400 underline pl-1"
                                                >
                                                    서명 다시하기
                                                </button>
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
                                <div className="w-full max-w-xs bg-slate-50 p-6 rounded-2xl text-left space-y-3 border border-slate-100 mt-8">
                                    <div className="flex justify-between text-sm">
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
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            {step === 'intro' ? '제출하기' : step === 'survey' ? '제출하기' : '다음으로'}
                            <ChevronRight className="w-5 h-5 opacity-80" strokeWidth={3} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

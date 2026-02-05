'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, Suspense } from 'react';
import {
    LayoutDashboard, Users, FileText, Send, Upload,
    Settings, Bell, Search, CheckCircle, XCircle, MoreVertical, AlertTriangle,
    Keyboard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';

// Mock Data
const CLASS_STATS = [
    { id: 1, name: '1반', submitted: 28, total: 30, rate: 93 },
    { id: 2, name: '2반', submitted: 15, total: 30, rate: 50 },
    { id: 3, name: '3반', submitted: 29, total: 29, rate: 100 },
    { id: 4, name: '4반', submitted: 20, total: 30, rate: 66 },
    { id: 5, name: '5반', submitted: 30, total: 30, rate: 100 },
];

const STUDENT_LIST = [
    { num: 1, name: '김가통', status: 'submitted', time: '03-05 10:23' },
    { num: 2, name: '이패스', status: 'unsubmitted', time: '-' },
    { num: 3, name: '박디지털', status: 'submitted', time: '03-05 11:01' },
    { num: 4, name: '최종이', status: 'unsubmitted', time: '-' },
    { num: 5, name: '정서명', status: 'submitted', time: '03-06 09:12' },
    { num: 6, name: '강미래', status: 'submitted', time: '03-06 09:15' },
    { num: 7, name: '문서만', status: 'unsubmitted', time: '-' },
];

interface UploadedFile {
    file: File;
    preview?: string;
    analysis: {
        grade: string;
        dept: string;
        type: string;
        title: string;
    } | null;
}

function AdminDashboardContent() {
    const searchParams = useSearchParams();
    const role = searchParams.get('role') || 'teacher';
    const school = searchParams.get('school') || 'kyungsung';

    const [activeTab, setActiveTab] = useState('dashboard');
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

    const handleDeploy = () => {
        alert('성공적으로 배포되었습니다.\n각 학급 담임 선생님 대시보드에 등록되었습니다.');
        setUploadedFile(null);
        setActiveTab('dashboard');
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Allow shortcut only when there is no active input focus (to allow typing)
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

            if (e.key === 'Escape') {
                if (uploadedFile) {
                    setUploadedFile(null); // Close upload modal
                }
            }

            if (e.key === 'Enter') {
                if (uploadedFile) {
                    handleDeploy(); // Confirm upload
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [uploadedFile]);

    // Mock Parser Logic
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        const name = file.name;
        let grade = '전체';
        if (name.includes('1학년')) grade = '1학년';
        if (name.includes('2학년')) grade = '2학년';

        let type = '안내';
        if (name.includes('신청') || name.includes('동의')) type = '서명/제출';

        setUploadedFile({
            file,
            analysis: {
                grade,
                dept: name.includes('반도체') ? '반도체과' : '공통',
                type,
                title: name.replace('.pdf', '').replace('.hwp', '')
            }
        });
        setActiveTab('upload');
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });


    return (
        <div className="min-h-screen bg-[#0f1116] flex text-gray-300 font-sans">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-[#15181e] hidden md:flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm text-white shadow-lg shadow-indigo-900/50">A</div>
                        <span>Gatong<span className="text-indigo-400">Admin</span></span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-2 ml-10">
                        {school === 'kyungsung' ? '경성전자고등학교' : school}
                        <br />
                        <span className="text-indigo-300 capitalize font-medium">{role === 'head' ? '학년 부장' : '담임 교사'}</span>
                    </p>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavItem icon={<LayoutDashboard />} label="대시보드" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    <NavItem icon={<FileText />} label="가정통신문 관리" active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} />
                    {role === 'head' && <NavItem icon={<Users />} label="학년 전체 통계" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />}
                    <NavItem icon={<Upload />} label="문서 업로드" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
                    <NavItem icon={<Settings />} label="설정" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>

                <div className="p-4 border-t border-white/5">
                    {/* Shortcut Hint */}
                    <div className="mb-4 px-2">
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Keyboard className="w-3 h-3" />
                            <span className="bg-white/10 px-1 rounded">ESC</span> 취소
                            <span className="bg-white/10 px-1 rounded">Enter</span> 확인
                        </p>
                    </div>

                    <div className="bg-[#1a1d24] rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-gray-400 mb-2">저장 공간</p>
                        <div className="w-full bg-[#0f1116] rounded-full h-1.5 mb-2">
                            <div className="bg-indigo-500 h-1.5 rounded-full w-[45%]"></div>
                        </div>
                        <p className="text-xs text-gray-500">45GB / 100GB</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header */}
                <header className="h-16 border-b border-white/5 bg-[#0f1116]/80 backdrop-blur sticky top-0 z-20 px-8 flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-100">
                        {activeTab === 'dashboard' && '우리 반 현황판'}
                        {activeTab === 'upload' && '스마트 문서 등록'}
                        {activeTab === 'stats' && '2026학년도 전체 통계'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500 group-focus-within:text-indigo-400" />
                            <input type="text" placeholder="학생 이름 검색 (Cmd+K)" className="bg-[#1a1d24] border border-white/5 rounded-full pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 w-64 transition-all" />
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-100 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 border border-white/10 shadow-inner"></div>
                    </div>
                </header>

                <div className="p-8">
                    <div className="max-w-6xl mx-auto space-y-8"> {/* Container for stability */}

                        {activeTab === 'dashboard' && (
                            <div className="space-y-8 animate-fade-in">
                                {/* Alerts Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <ActionCard
                                        icon={<AlertTriangle className="w-5 h-5" />}
                                        colorClass="text-rose-400 bg-rose-400/10 border-rose-400/20"
                                        label="긴급 (마감 임박)"
                                        value="5명"
                                        subtext="수학여행 동의서 미제출"
                                    />
                                    <ActionCard
                                        icon={<FileText className="w-5 h-5" />}
                                        colorClass="text-blue-400 bg-blue-400/10 border-blue-400/20"
                                        label="진행 중 문서"
                                        value="3건"
                                        subtext="현재 취합 중"
                                    />
                                    {role === 'head' && (
                                        <ActionCard
                                            icon={<Users className="w-5 h-5" />}
                                            colorClass="text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                                            label="학년 전체 제출율"
                                            value="88%"
                                            subtext="전주 대비 +5% 상승"
                                        />
                                    )}
                                </div>

                                {/* Student List Table */}
                                <div className="bg-[#15181e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1d24]/50">
                                        <h3 className="font-semibold text-gray-100">수학여행 참가 동의서 (신청)</h3>
                                        <div className="flex gap-2">
                                            <button className="px-4 py-2 bg-[#252830] hover:bg-[#2d313a] text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors border border-white/5">
                                                <Send className="w-4 h-4" /> 전체 독촉
                                            </button>
                                            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg shadow-lg shadow-indigo-900/30 transition-all">
                                                엑셀 다운로드
                                            </button>
                                        </div>
                                    </div>
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-[#1a1d24] text-gray-500 uppercase text-xs tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4 font-medium">번호</th>
                                                <th className="px-6 py-4 font-medium">이름</th>
                                                <th className="px-6 py-4 font-medium">상태</th>
                                                <th className="px-6 py-4 font-medium">제출 시간</th>
                                                <th className="px-6 py-4 font-medium text-right">관리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-[#15181e]">
                                            {STUDENT_LIST.map((student) => (
                                                <tr key={student.num} className="hover:bg-[#1a1d24] transition-colors group">
                                                    <td className="px-6 py-4 text-gray-500">{student.num}번</td>
                                                    <td className="px-6 py-4 text-gray-200 font-medium">{student.name}</td>
                                                    <td className="px-6 py-4">
                                                        {student.status === 'submitted' ? (
                                                            <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-400/10">
                                                                <CheckCircle className="w-3.5 h-3.5" /> 제출 완료
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-400/10">
                                                                <XCircle className="w-3.5 h-3.5" /> 미제출
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">{student.time}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {student.status === 'unsubmitted' && (
                                                            <button className="text-indigo-400 hover:text-indigo-300 text-xs border border-indigo-500/20 hover:border-indigo-500/50 bg-indigo-500/5 px-3 py-1.5 rounded transition-all">
                                                                재알림 보내기
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'upload' && (
                            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in py-8">
                                {!uploadedFile ? (
                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-300 group ${isDragActive
                                                ? 'border-indigo-500 bg-indigo-500/10 transform scale-[1.02]'
                                                : 'border-white/10 hover:border-white/20 hover:bg-[#1a1d24] bg-[#15181e]'
                                            }`}
                                    >
                                        <input {...getInputProps()} />
                                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-colors ${isDragActive ? 'bg-indigo-500 text-white' : 'bg-[#1a1d24] text-gray-400 group-hover:text-indigo-400'
                                            }`}>
                                            <Upload className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-200 mb-2">업로드할 파일을 드래그하세요</h3>
                                        <p className="text-sm text-gray-500">PDF 파일을 권장합니다 (최대 10MB)</p>
                                        <div className="mt-8 flex flex-wrap justify-center gap-2">
                                            <Badge label="자동 분류" />
                                            <Badge label="서명 인식" />
                                            <Badge label="대상 지정" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#15181e] border border-white/5 rounded-2xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

                                        <div className="flex items-start gap-5 border-b border-white/5 pb-6">
                                            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xl font-bold text-gray-100 truncate">{uploadedFile.file.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{(uploadedFile.file.size / 1024).toFixed(1)} KB • 자동 분석 완료</p>
                                            </div>
                                            <button
                                                onClick={() => setUploadedFile(null)}
                                                title="취소 (ESC)"
                                                className="text-gray-500 hover:text-gray-300 p-2 hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <XCircle className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <InputGroup label="문서 제목" value={uploadedFile.analysis?.title} />
                                            <div className="bg-[#1a1d24] p-4 rounded-xl border border-white/5">
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">유형</label>
                                                <div className="flex gap-2">
                                                    <span className={cn("px-2.5 py-1 rounded-md text-sm font-medium",
                                                        uploadedFile.analysis?.type === '서명/제출'
                                                            ? "bg-rose-400/20 text-rose-400 border border-rose-400/20"
                                                            : "bg-gray-700/50 text-gray-300"
                                                    )}>
                                                        {uploadedFile.analysis?.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <SelectGroup label="대상 학년" value={uploadedFile.analysis?.grade} options={['1학년', '2학년', '3학년', '전체']} />
                                            <SelectGroup label="대상 학과" value={uploadedFile.analysis?.dept} options={['공통', '반도체과', 'IoT전기과', '게임콘텐츠과']} />
                                        </div>

                                        <div className="pt-6 flex justify-end gap-3">
                                            <button
                                                className="px-6 py-3.5 bg-[#1a1d24] text-gray-400 hover:text-white rounded-xl font-medium transition-colors border border-white/5"
                                                onClick={() => setUploadedFile(null)}
                                            >
                                                취소 <span className="text-xs opacity-50 ml-1">ESC</span>
                                            </button>
                                            <button
                                                onClick={handleDeploy}
                                                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98] flex items-center gap-2"
                                            >
                                                배포하기 <span className="bg-indigo-500/50 px-1.5 py-0.5 rounded text-xs text-indigo-100">Enter</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-semibold text-gray-100">학급별 제출 경쟁 현황</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {CLASS_STATS.map((cls) => (
                                        <div key={cls.id} className="bg-[#15181e] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all hover:bg-[#1a1d24]">
                                            <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 group-hover:h-1.5" style={{ width: `${cls.rate}%` }}></div>
                                            <div className="flex justify-between items-end mb-4">
                                                <div>
                                                    <h4 className="text-xl font-bold text-gray-200 group-hover:text-white">{cls.name}</h4>
                                                    <p className="text-xs text-gray-500">담임: 선생님{cls.id}</p>
                                                </div>
                                                <span className={cn("text-3xl font-bold", cls.rate >= 90 ? 'text-emerald-400' : cls.rate >= 50 ? 'text-indigo-400' : 'text-rose-400')}>
                                                    {cls.rate}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-[#0a0a0a] rounded-full h-2 mb-4">
                                                <div className={cn("h-2 rounded-full transition-all duration-1000", cls.rate >= 90 ? 'bg-emerald-500' : 'bg-indigo-500')} style={{ width: `${cls.rate}%` }}></div>
                                            </div>
                                            <div className="flex justify-between text-sm text-gray-500">
                                                <span>제출 {cls.submitted}명</span>
                                                <span className="opacity-50">/ {cls.total}명</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// UI Components
const ActionCard = ({ icon, colorClass, label, value, subtext }: any) => (
    <div className={cn("bg-[#15181e] border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:bg-[#1a1d24] transition-colors group cursor-pointer", colorClass.replace('text-', 'border-l-4 border-'))}>
        <div className="flex justify-between items-start">
            <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", colorClass)}>{icon}</div>
        </div>
        <div>
            <h3 className="text-3xl font-bold text-gray-100 mt-5 mb-1">{value}</h3>
            <p className="text-sm font-medium text-gray-400">{label}</p>
            <p className="text-xs text-gray-600 mt-2">{subtext}</p>
        </div>
    </div>
);

const Badge = ({ label }: { label: string }) => (
    <span className="bg-[#1a1d24] border border-white/5 px-3 py-1.5 rounded-full text-xs text-gray-400 font-medium">
        {label}
    </span>
);

const InputGroup = ({ label, value }: any) => (
    <div className="bg-[#1a1d24] p-4 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
        <input type="text" defaultValue={value} className="w-full bg-transparent text-gray-200 font-medium focus:outline-none" />
    </div>
);

const SelectGroup = ({ label, value, options }: any) => (
    <div className="bg-[#1a1d24] p-4 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-colors">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">{label}</label>
        <select className="w-full bg-transparent text-gray-200 font-medium focus:outline-none cursor-pointer" defaultValue={value}>
            {options.map((opt: string) => <option key={opt} value={opt} className="bg-[#1a1d24]">{opt}</option>)}
        </select>
    </div>
);

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm group",
                active
                    ? "bg-indigo-600/10 text-indigo-400"
                    : "text-gray-400 hover:bg-[#1a1d24] hover:text-gray-200"
            )}
        >
            <span className={cn("transition-colors", active ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300")}>{icon}</span>
            <span>{label}</span>
            {active && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
        </button>
    )
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0f1116] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
            </div>
        }>
            <AdminDashboardContent />
        </Suspense>
    );
}

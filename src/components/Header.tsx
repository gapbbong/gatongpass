'use client';

import { Bell, Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">G</span>
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">
                            Gatong<span className="text-blue-400">Pass</span>
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                        <nav className="flex gap-4 text-sm font-medium text-gray-300">
                            <a href="#" className="hover:text-white transition-colors">홈</a>
                            <a href="#" className="hover:text-white transition-colors">통신문</a>
                            <a href="#" className="hover:text-white transition-colors">설정</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-400 hover:text-white transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        </button>
                        <button
                            className="md:hidden p-2 text-gray-400 hover:text-white"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="md:hidden border-t border-white/10 bg-black/90 backdrop-blur-xl"
                >
                    <div className="px-4 py-4 flex flex-col gap-4">
                        <a href="#" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md hover:bg-white/5">홈</a>
                        <a href="#" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md hover:bg-white/5">전체 통신문</a>
                        <a href="#" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md hover:bg-white/5">내 서명 내역</a>
                    </div>
                </motion.div>
            )}
        </header>
    );
}

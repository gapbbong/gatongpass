'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, MoveHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  list: React.ReactNode;
  viewer: React.ReactNode;
  stats?: React.ReactNode;
  showList?: boolean;
  showStats?: boolean;
}

export default function DashboardLayout({
  sidebar,
  list,
  viewer,
  stats,
  showList = true,
  showStats = true
}: DashboardLayoutProps) {
  const [listWidth, setListWidth] = useState(340);
  const [isResizing, setIsResizing] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const startResizingSidebar = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsSidebarResizing(true);

    const startX = mouseDownEvent.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newWidth = startWidth + (mouseMoveEvent.clientX - startX);
      if (newWidth > 180 && newWidth < 400) {
        setSidebarWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      setIsSidebarResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    setShowHint(false);

    const startX = mouseDownEvent.clientX;
    const startWidth = listWidth;

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newWidth = startWidth + (mouseMoveEvent.clientX - startX);
      // Min width 80px (collapsed icon mode idea), Max 600px
      if (newWidth > 80 && newWidth < 600) {
        setListWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-indigo-500/20" onMouseUp={() => { setIsResizing(false); setIsSidebarResizing(false); }}>
      {/* Resizing Overlay */}
      {(isResizing || isSidebarResizing) && (
        <div className="fixed inset-0 z-[100] cursor-col-resize" />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "border-r border-white-[0.05] bg-secondary/50 backdrop-blur-xl hidden lg:flex flex-col shrink-0 z-30 relative transition-all duration-75 ease-out",
          sidebarWidth < 200 && "sidebar-compact"
        )}
        style={{ width: sidebarWidth }}
      >
        {sidebar}
        {/* Sidebar Resize Handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-3 translate-x-1/2 z-50 cursor-col-resize flex items-center justify-center group"
          onMouseDown={startResizingSidebar}
        >
          <div className={cn(
            "w-[3px] h-12 rounded-full transition-all duration-300 transform scale-y-90 group-hover:scale-y-100 opacity-0 group-hover:opacity-100",
            isSidebarResizing ? "h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] opacity-100" : "bg-white/10"
          )} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden min-w-0 bg-background/30 relative">
        {/* Column 1: Document List (Resizable) */}
        {showList && (
          <section
            className={cn(
              "border-r border-white-[0.02] bg-background/10 flex flex-col shrink-0 min-w-0 z-20 shadow-[20px_0_30px_-20px_rgba(0,0,0,0.5)] relative transition-all duration-75 ease-out",
              listWidth < 240 && "list-compact"
            )}
            style={{ width: listWidth }}
          >
            {/* Collapse visual if too small */}
            {listWidth < 120 ? (
              <div className="flex-1 flex flex-col items-center pt-8 gap-4 opacity-50">
                <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                <div className="w-1 h-32 rounded-full bg-white/5" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
                {list}
              </div>
            )}

            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-6 translate-x-1/2 z-50 cursor-col-resize flex items-center justify-center group"
              onMouseDown={startResizing}
            >
              <div className={cn(
                "w-[4px] h-12 rounded-full transition-all duration-300 transform scale-y-90 group-hover:scale-y-100",
                isResizing || "group-hover:h-full group-hover:bg-indigo-500/50",
                isResizing ? "h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]" : "bg-transparent"
              )} />

              {/* Visual Cue/Hint */}
              <AnimatePresence>
                {showHint && !isResizing && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 20 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-full top-1/2 -translate-y-1/2 flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-xl pointer-events-none"
                  >
                    <MoveHorizontal size={12} />
                    <span>Drag to Resize</span>
                    <div className="absolute left-0 top-1/2 -translate-x-1 border-[6px] border-transparent border-r-indigo-600 -translate-y-1/2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Column 2: Main Workspace (Viewer + Integrated Stats if needed) */}
        <section className="flex-1 bg-secondary/[0.03] flex flex-col min-w-0 overflow-hidden relative z-10">
          <div className="flex-1 flex flex-col overflow-hidden">
            {viewer}
          </div>
        </section>

        {/* Column 3: Stats Panel (Optional/Side) */}
        {showStats && stats && (
          <section className="w-96 border-l border-white-[0.02] bg-secondary/20 backdrop-blur-sm hidden xl:flex flex-col shrink-0 overflow-y-auto z-20 custom-scrollbar shadow-[-20px_0_30px_-20px_rgba(0,0,0,0.5)]">
            {stats}
          </section>
        )}
      </main>
    </div>
  );
}

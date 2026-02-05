import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  list: React.ReactNode;
  viewer: React.ReactNode;
  stats: React.ReactNode;
}

export default function DashboardLayout({ sidebar, list, viewer, stats }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-indigo-500/20">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white-[0.05] bg-secondary/50 backdrop-blur-xl hidden lg:flex flex-col shrink-0 z-30">
        {sidebar}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden min-w-0 bg-background/30">
        {/* Column 1: Document List */}
        <section className="w-80 border-r border-white/[0.05] bg-background/20 flex flex-col shrink-0 min-w-0 z-20">
          {list}
        </section>

        {/* Column 2: Document Viewer */}
        <section className="flex-1 bg-secondary/10 flex flex-col min-w-0 overflow-hidden relative z-10">
          {viewer}
        </section>

        {/* Column 3: Stats & Controls */}
        <section className="w-96 border-l border-white/[0.05] bg-secondary/30 backdrop-blur-md hidden xl:flex flex-col shrink-0 overflow-y-auto z-20 custom-scrollbar">
          {stats}
        </section>
      </main>
    </div>
  );
}

import Header from "@/components/Header";
import DocumentList from "@/components/DocumentList";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <Header />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            모든 가정통신문을<br />
            <span className="gradient-text">빠르고 간편하게.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            종이 없는 학교, 더 편리한 소통. GatongPass에서 확인하고 서명하세요.
          </p>
        </div>

        <DocumentList />
      </main>

      <footer className="relative z-10 py-8 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>© 2025 GatongPass. All rights reserved.</p>
      </footer>
    </div>
  );
}

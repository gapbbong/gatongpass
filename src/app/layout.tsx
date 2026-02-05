import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "GatongPass | 선생님 전용 스마트 대시보드",
  description: "가정통신문 통합 관리 솔루션, 가통패스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${outfit.variable} font-sans antialiased mesh-gradient min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

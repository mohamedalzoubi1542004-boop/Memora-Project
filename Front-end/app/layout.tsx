import type { Metadata } from "next";
import { Tajawal, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memora | الكشف المبكر عن الزهايمر بالذكاء الاصطناعي",
  description:
    "Memora — نظام طبي ذكي للكشف المبكر عن مرض الزهايمر من خلال تحليل صور الرنين المغناطيسي ثلاثية الأبعاد. اكتشف التغيرات الدماغية المبكرة قبل ظهور الأعراض بسنوات.",
  keywords: [
    "Memora",
    "Alzheimer",
    "الزهايمر",
    "الكشف المبكر",
    "الذكاء الاصطناعي",
    "MRI",
    "الحصين",
    "الفص الصدغي",
    "تشخيص طبي",
    "Brain Analysis",
    "ضعف إدراكي خفيف",
    "MCI",
  ],
  openGraph: {
    title: "Memora — الكشف المبكر عن الزهايمر",
    description:
      "اكتشف التغيرات الدماغية المبكرة قبل ظهور الأعراض السريرية بسنوات. لأن كل ذكرى تستحق الحماية.",
    type: "website",
    locale: "ar_SA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Memora — الكشف المبكر عن الزهايمر",
    description:
      "اكتشف التغيرات الدماغية المبكرة قبل ظهور الأعراض السريرية بسنوات.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <body
        className={`${tajawal.variable} ${outfit.variable} font-sans antialiased relative min-h-screen bg-white text-slate-900`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

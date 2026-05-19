"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  BrainCircuit, Menu, X, Upload, Cpu, Microscope,
  BarChart3, Shield, Activity, Building2, Phone, Mail,
  ArrowLeft, Plus, Minus, MessageCircle, Clock,
  Zap, CheckCircle, Calendar, Brain, Users, BookOpen,
  Gamepad2, Layers, Grid3X3, ListOrdered,
} from "lucide-react";
import Link from "next/link";

/* ═══════════════════════════════════════
   DATA
   ═══════════════════════════════════════ */
const stats = [
  { value: "15-20", label: "نافذة الكشف المبكر", description: "سنة قبل الأعراض السريرية", icon: Clock, color: "cyan" },
  { value: "3 محاور", label: "تحليل تشريحي دقيق", description: "محوري • إكليلي • سهمي", icon: Brain, color: "amber" },
  { value: "98%", label: "دقة الخوارزميات", description: "في تصنيف مراحل الضمور", icon: Activity, color: "cyan" },
  { value: "+55M", label: "حالة حول العالم", description: "يعانون من مرض الزهايمر", icon: Users, color: "amber" },
];

const features = [
  {
    icon: Microscope,
    title: "تحليل الضمور البنيوي",
    description: "قياس دقيق لحجم المنطقة الحصينية والفص الصدغي مع مقارنة بقواعد بيانات عمرية معتمدة.",
    highlight: false,
  },
  {
    icon: Cpu,
    title: "التصنيف الآلي الذكي",
    description: "تصنيف فوري وموثوق للحالة إلى: سليم إدراكياً (CN) أو ضعف إدراكي خفيف (MCI) أو زهايمر (AD).",
    highlight: true,
  },
  {
    icon: BarChart3,
    title: "تتبع التدهور الزمني",
    description: "مقارنة الفحوصات الدورية لقياس معدل التغير البنيوي ورصد أي تسارع في الضمور.",
    highlight: false,
  },
  {
    icon: Shield,
    title: "دعم القرار السريري",
    description: "تقارير طبية تفصيلية تشمل خرائط حرارية للمناطق المتأثرة وتوصيات للتدخل العلاجي المبكر.",
    highlight: false,
  },
];

const steps = [
  { number: "01", icon: Brain, title: "فحص الرنين المغناطيسي", description: "يُجرى فحص MRI ثلاثي الأبعاد T1 للدماغ. هذا الفحص غير مؤلم تماماً ويستغرق 15-20 دقيقة.", color: "cyan" },
  { number: "02", icon: Upload, title: "رفع الصور على المنصة", description: "يرفع الطبيب المتخصص صور الرنين بصيغة NIfTI أو DICOM مباشرة إلى منصة Memora الآمنة.", color: "amber" },
  { number: "03", icon: Cpu, title: "التحليل بالذكاء الاصطناعي", description: "يحلل نظامنا 96 شريحة دماغية عبر المحاور الثلاثة مع التركيز على منطقة الحصين والفص الصدغي.", color: "cyan" },
  { number: "04", icon: CheckCircle, title: "التدخل المبكر والرعاية", description: "يستلم الطبيب تقريراً تفصيلياً مع خطة متابعة مخصصة تمنح المريض وعائلته النافذة الذهبية.", color: "amber" },
];


const faqs = [
  { q: "ما مدى دقة تشخيص نظام Memora؟", a: "يحقق نظام Memora دقة تشخيصية تتجاوز 98% في تصنيف مراحل الضمور الدماغي (CN/MCI/AD)، مدعومة بالتحقق السريري على بيانات ADNI التي تضم أكثر من 3,182 فحص من 675 مريضاً." },
  { q: "كم من الوقت يستغرق تحليل صور الرنين المغناطيسي؟", a: "يتم تحليل الصور خلال ثوانٍ معدودة بعد الرفع. يتضمن النظام معالجة 96 شريحة دماغية عبر المحاور الثلاثة (المحوري والإكليلي والسهمي) للحصول على صورة تشخيصية شاملة." },
  { q: "هل يمكن للنظام اكتشاف الزهايمر قبل ظهور الأعراض الملحوظة؟", a: "نعم، هذه هي القيمة الجوهرية لـ Memora. التغيرات البنيوية في الحصين والفص الصدغي تبدأ قبل 15-20 عاماً من ظهور أي أعراض سريرية. نظامنا يرصد هذه التغيرات المبكرة جداً في مرحلة ما قبل السريرية." },
  { q: "ما هو الضعف الإدراكي الخفيف (MCI) ولماذا هو مهم؟", a: "MCI هو مرحلة وسيطة بين الشيخوخة الطبيعية والزهايمر. إنها 'النافذة الذهبية' للتدخل العلاجي — فليس كل حالات MCI تتطور إلى زهايمر، وبالتدخل المناسب يمكن إبطاء التدهور بشكل كبير." },
  { q: "هل البيانات الطبية للمريض محمية وآمنة؟", a: "يطبّق Memora تشفيراً شاملاً لجميع البيانات الطبية مع الالتزام الكامل بمعايير HIPAA الدولية. لا تُشارك بيانات المريض مع أي طرف ثالث." },
];

const blogPosts = [
  { title: "لويحات الأميلويد: العدو الصامت الذي يبدأ قبل عقود", category: "علم الأعصاب", date: "15 مارس 2026", author: "د. سارة الخالدي", bg: "from-cyan-100 to-blue-50" },
  { title: "الحصين: لماذا هو أول ضحايا الزهايمر؟", category: "تشريح الدماغ", date: "22 مارس 2026", author: "د. فاطمة الزهراني", bg: "from-amber-50 to-yellow-50" },
  { title: "MCI: النافذة الذهبية للتدخل قبل فوات الأوان", category: "التشخيص المبكر", date: "1 أبريل 2026", author: "د. محمد العلي", bg: "from-purple-50 to-violet-50" },
];


/* ═══════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════ */
function SectionHeader({ label: _label, title, subtitle, icon: Icon, inView }: { label: string; title: string; subtitle?: string; icon: React.ElementType; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="mb-12 md:mb-16 text-center"
    >
      <div className="flex justify-center mb-4 md:mb-5">
        <div className="p-3 bg-cyan-50 rounded-full">
          <Icon size={32} className="text-cyan-600" strokeWidth={1.75} />
        </div>
      </div>
      <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{title}</h2>
      <div className="mt-4 h-[3px] w-20 md:w-28 bg-cyan-500 rounded-full mx-auto" />
      {subtitle && <p className="mt-4 text-gray-500 text-sm md:text-base max-w-2xl mx-auto">{subtitle}</p>}
    </motion.div>
  );
}



/* ═══════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════ */
function Navbar({ scrolled, mobileOpen, setMobileOpen }: { scrolled: boolean; mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const navLinks = [
    { label: "الرئيسية", href: "#home" },
    { label: "كيف يعمل النظام", href: "#how-it-works" },
    { label: "التكنولوجيا", href: "#technology" },
    { label: "الألعاب المعرفية", href: "#games" },
    { label: "أهمية الكشف المبكر", href: "#early-detection" },
    { label: "اتصل بنا", href: "#contact" },
  ];
  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-gray-100 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="container mx-auto flex justify-between items-center h-[70px] md:h-[80px] px-4 lg:px-8">
          <div className="mr-2 md:mr-6 origin-right">
            <a href="#home" className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/images/logo.png" 
                alt="شعار ميمورا - Memora Logo" 
                className="h-[56px] md:h-[70px] w-auto object-contain transition-transform duration-300 hover:scale-105" 
              />
            </a>
          </div>
          <nav className="hidden lg:flex items-center">
            <ul className="flex gap-1 text-sm font-medium text-slate-600">
              {navLinks.map((link, i) => (
                <li key={i} className="relative group">
                  {link.href.startsWith("/") ? (
                    <Link href={link.href} className="flex items-center px-3 py-2 rounded-lg transition-colors duration-200 hover:text-blue-600 hover:bg-blue-50">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="flex items-center px-3 py-2 rounded-lg transition-colors duration-200 hover:text-blue-600 hover:bg-blue-50">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden lg:flex gap-3 items-center">
            <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-slate-600 rounded-full border border-gray-200 hover:border-blue-600 hover:text-blue-600 transition-all duration-200">تسجيل الدخول</Link>
            <Link href="/register" className="px-5 py-2.5 text-sm font-bold text-white rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all duration-200">ابدأ التحليل</Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-slate-600 hover:text-blue-600 transition">
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="absolute top-0 right-0 w-[80%] max-w-sm h-full bg-white border-r border-gray-100 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo.png" alt="Memora" className="h-8 w-auto object-contain" />
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={22} /></button>
              </div>
              <ul className="flex flex-col py-4 flex-1">
                {navLinks.map((link, i) => (
                  <li key={i}>
                    {link.href.startsWith("/") ? (
                      <Link href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center px-8 py-4 text-base font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">{link.label}</Link>
                    ) : (
                      <a href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center px-8 py-4 text-base font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
              <div className="p-6 border-t border-gray-100 flex flex-col gap-3">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full py-3 text-sm font-semibold text-blue-600 border border-blue-500/40 rounded-xl hover:bg-blue-50 transition-all text-center">تسجيل الدخول</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all text-center">ابدأ التحليل</Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════ */
function HeroSection() {
  return (
    <section id="home" className="relative w-full min-h-screen flex items-center bg-[#F8FAFC] lg:bg-white pt-[100px] pb-10 overflow-hidden">
      {/* Very clean minimalist background like Shifaa'k */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] right-[-10%] w-[800px] h-[800px] bg-blue-50/60 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-8 relative z-10">

        {/* ── Text Side ── */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full lg:w-1/2 text-center lg:text-right order-2 lg:order-1"
        >
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-100 shadow-sm mb-6 mx-auto lg:mx-0 -mt-12">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
            </span>
            <span className="text-sm font-bold text-slate-700">الكشف المبكر يبدأ هنا</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-[3rem] font-black text-slate-900 leading-[1.15] mb-6 tracking-tight">
            <span className="whitespace-nowrap">الكشف المبكر عن الزهايمر</span>
            <br />
            <span className="text-blue-600 whitespace-nowrap mt-4 inline-block">بالذكاء الاصطناعي</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-500 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
            نحمي ذكرياتك قبل أن تتلاشى. تحليل دقيق لصور الرنين المغناطيسي لاكتشاف التغيرات الدماغية قبل ظهور الأعراض بسنوات.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
            <Link href="/register" className="flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold text-white rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all duration-200">
              <Upload size={20} />
              ابدأ تحليل صورة MRI
            </Link>
            <a href="#technology" className="flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold text-blue-600 rounded-xl bg-white border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all duration-200">
              تعرف على التقنية
              <ArrowLeft size={18} />
            </a>
          </div>

        </motion.div>

        {/* ── Visual Side — 3D Brain Image ── */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full lg:w-1/2 relative flex justify-center items-center order-1 lg:order-2"
        >
          <div className="relative w-[300px] md:w-[420px] lg:w-[560px]">

            {/* ── Animated Solid Blue Organic Blob ── */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[95%] lg:w-[110%] lg:h-[110%] z-0">
              <motion.div 
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="w-full h-full bg-[#2563EB]"
                style={{
                  borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%'
                }}
              />
            </div>

            {/* Brain image clearly displayed (Static) */}
            <div
              className="relative z-10 w-full flex justify-center items-center"
              style={{ perspective: "1000px" }}
            >
              <div className="relative w-full flex justify-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/brain-isolated.png"
                  alt="تحليل الدماغ ثلاثي الأبعاد — الحصين والفص الصدغي"
                  className="w-full max-w-[500px] lg:max-w-xl h-auto object-contain mx-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:brightness-110 transition-all duration-700 hover:scale-105"
                />
              </div>
            </div>

            {/* Static card — Clean White (top-right) */}
            <div
              className="absolute top-[8%] -right-4 lg:-right-10 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 p-4 z-20 flex items-center gap-4"
            >
              <div className="bg-amber-100 p-2.5 rounded-full text-amber-500 shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium tracking-wide">دقة التشخيص</p>
                <p className="text-sm font-extrabold text-slate-900">98% دقة</p>
              </div>
            </div>

            {/* Static card — Clean White (bottom-left) */}
            <div
              className="absolute bottom-[16%] -left-4 lg:-left-12 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 p-4 z-20 flex items-center gap-4"
            >
              <div className="bg-blue-50 p-2.5 rounded-full text-blue-600 shrink-0">
                <BrainCircuit size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">الحصين والفص الصدغي</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs text-slate-500">يتم التحليل الآن</p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   STATS SECTION
   ═══════════════════════════════════════ */
function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <section className="relative z-20 pt-5 pb-5 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="-mt-10 md:-mt-20 relative bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-6 md:p-10 border border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 md:gap-8 divide-x-0 md:divide-x divide-gray-100 rtl:divide-x-reverse">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              const amber = stat.color === "amber";
              return (
                <div key={i} className="flex flex-col items-center justify-center text-center group">
                  <div className={`mb-4 p-3 md:p-4 rounded-2xl transform group-hover:scale-110 transition-transform duration-300 ${amber ? "bg-amber-50 text-amber-500" : "bg-cyan-50 text-cyan-500"}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className={`text-2xl md:text-3xl font-extrabold mb-1 ${amber ? "text-amber-500" : "text-gray-900"}`}>{stat.value}</h3>
                  <p className="text-xs md:text-sm font-bold text-gray-700 uppercase tracking-wide">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-tight">{stat.description}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   FEATURES SECTION
   ═══════════════════════════════════════ */
function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="technology" className="relative z-10 bg-gray-50 py-24 md:py-32" ref={ref}>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-50/60 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-50/60 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader label="Technology" title="التكنولوجيا التي تحمي الذاكرة" subtitle="أربعة محاور تقنية متكاملة لتحليل دقيق وشامل للتغيرات الدماغية" icon={Zap} inView={inView} />
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                className="group relative p-8 md:p-10 rounded-[2rem] border bg-white border-gray-100 hover:bg-cyan-600 hover:border-cyan-600 hover:shadow-xl hover:shadow-cyan-600/20 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300 bg-cyan-50 text-cyan-600 group-hover:bg-white/20 group-hover:text-white group-hover:rotate-6 group-hover:scale-110">
                  <Icon size={32} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-white transition-colors duration-300">{feat.title}</h3>
                  <p className="text-base leading-relaxed text-gray-500 group-hover:text-cyan-100 transition-colors duration-300">{feat.description}</p>
                </div>
                <a href="#how-it-works" className="mt-auto pt-4 flex items-center gap-2 text-sm font-bold cursor-pointer w-fit text-cyan-600 group-hover:text-white transition-colors duration-300">
                  <span>اكتشف المزيد</span>
                  <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-2" />
                </a>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-0 transition-opacity duration-500 rounded-t-[2rem]" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════ */
function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#06B6D4_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader label="رحلة التشخيص" title="أربع خطوات نحو التشخيص المبكر" subtitle="آلية شفافة وسريعة تمنح الطبيب والمريض صورة واضحة خلال دقائق" icon={CheckCircle} inView={inView} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-12 md:mt-16">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const amber = step.color === "amber";
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.15 + i * 0.15 }}
                className="group relative bg-white border border-gray-100 rounded-[2rem] p-7 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100/40 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                <div className={`text-5xl font-black mb-4 ${amber ? "text-amber-200" : "text-cyan-100"}`}>{step.number}</div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${amber ? "bg-amber-50 text-amber-500" : "bg-cyan-50 text-cyan-600"}`}>
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">{step.description}</p>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-[2rem]" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   PARTNERS / ADVISORY BOARD
   ═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   FAQ SECTION
   ═══════════════════════════════════════ */
function FaqSection({ openFaq, setOpenFaq }: { openFaq: number; setOpenFaq: (i: number) => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="early-detection" className="py-20 md:py-28 bg-white relative overflow-hidden" ref={ref}>
      <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-cyan-50/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] bg-amber-50/50 rounded-full blur-[80px] pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader label="الأسئلة الشائعة" title="إجابات على أسئلتك" subtitle="كل ما تريد معرفته عن نظام Memora وآلية عمله" icon={MessageCircle} inView={inView} />
        <div className="max-w-3xl mx-auto mt-12 flex flex-col gap-4">
          {faqs.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className={`group rounded-[2rem] border transition-all duration-300 overflow-hidden ${openFaq === i ? "bg-white border-cyan-300 shadow-lg shadow-cyan-100/50" : "bg-white border-gray-100 hover:border-cyan-100 hover:shadow-md"}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex items-center justify-between w-full p-6 text-right focus:outline-none">
                <span className={`text-base md:text-lg font-bold transition-colors duration-300 ${openFaq === i ? "text-cyan-600" : "text-slate-800 group-hover:text-cyan-600"}`}>{faq.q}</span>
                <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 shrink-0 mr-4 ${openFaq === i ? "bg-cyan-600 text-white rotate-180" : "bg-gray-100 text-slate-500 group-hover:bg-cyan-50 group-hover:text-cyan-600"}`}>
                  {openFaq === i ? <Minus size={18} /> : <Plus size={18} />}
                </div>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-dashed border-gray-100 pt-4 text-sm md:text-base">{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-slate-500 mb-4">لم تجد الإجابة التي تبحث عنها؟</p>
          <a href="#contact" className="px-8 py-3 rounded-xl bg-white border border-gray-200 text-slate-700 font-bold hover:border-cyan-400 hover:text-cyan-600 transition-all duration-300 shadow-sm hover:shadow-md inline-block">تواصل مع فريقنا</a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   PARTNER CTA SECTION
   ═══════════════════════════════════════ */
function PartnerCTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section className="py-10 md:py-20 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600 via-cyan-500 to-teal-500" />
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%"><defs><pattern id="cta-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#cta-grid)" /></svg>
      </div>
      <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-3xl animate-pulse" />
      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="mb-8">
            <Building2 size={64} className="mx-auto text-white opacity-80" />
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 }} className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white mb-6 leading-tight">
            هل تدير مركزاً للأشعة أو مستشفى متقدم؟
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.4 }} className="md:text-lg text-white/90 mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed">
            انضم إلى شبكتنا لإنقاذ الذاكرة. قدّم لمرضاك أحدث تكنولوجيا تشخيص الزهايمر المبكر وكن جزءاً من ثورة الرعاية العصبية الرقمية.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5 }}>
            <a href="#">
              <button className="inline-flex items-center gap-3 px-8 md:px-12 py-4 text-base font-bold text-cyan-600 bg-white hover:bg-slate-50 rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 group">
                <span>سجّل مركزك الآن</span>
                <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   BLOG SECTION
   ═══════════════════════════════════════ */
function BlogSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section className="py-16 bg-cyan-50" ref={ref}>
      <div className="container mx-auto px-4">
        <SectionHeader label="المدونة الطبية" title="آخر المقالات العلمية" subtitle="محتوى طبي موثوق عن الزهايمر والصحة العصبية" icon={BookOpen} inView={inView} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {blogPosts.map((post, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 + i * 0.15 }}
              className="group h-full bg-white rounded-[2rem] border border-gray-100 overflow-hidden hover:shadow-xl hover:shadow-cyan-100/40 transition-all duration-300 flex flex-col">
              <div className={`relative h-48 overflow-hidden bg-gradient-to-br ${post.bg} flex items-center justify-center`}>
                <BrainCircuit size={72} className="text-cyan-300 opacity-40 group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-cyan-600 shadow-sm">{post.category}</div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  <div className="flex items-center gap-1.5"><Calendar size={12} /><span>{post.date}</span></div>
                  <span>{post.author}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-cyan-600 transition-colors">{post.title}</h3>
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-cyan-100 flex items-center justify-center text-xs font-bold text-cyan-700">{post.author.charAt(3)}</div>
                    <span className="text-xs font-bold text-slate-700">{post.author}</span>
                  </div>
                  <button className="text-sm font-bold text-cyan-600 flex items-center gap-1 group/btn">
                    <span>اقرأ</span>
                    <ArrowLeft size={14} className="transition-transform duration-300 group-hover/btn:-translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   REVIEWS SECTION
   ═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   GAMES SECTION
   ═══════════════════════════════════════ */
const gamesPreview = [
  { icon: Layers,      label: "تذكّر التسلسل",  domain: "الذاكرة العاملة",     bg: "bg-cyan-50",    color: "text-cyan-600"    },
  { icon: Grid3X3,     label: "أزواج الصور",     domain: "الذاكرة البصرية",     bg: "bg-purple-50",  color: "text-purple-600"  },
  { icon: BookOpen,    label: "كلمات مترابطة",   domain: "الذاكرة الدلالية",    bg: "bg-emerald-50", color: "text-emerald-600" },
  { icon: BrainCircuit,label: "إكمال الأنماط",   domain: "التفكير المنطقي",     bg: "bg-amber-50",   color: "text-amber-600"   },
  { icon: ListOrdered, label: "ترتيب الخطوات",   domain: "الوظائف التنفيذية",   bg: "bg-rose-50",    color: "text-rose-600"    },
  { icon: Users,       label: "وجوه وأسماء",     domain: "الذاكرة الترابطية",   bg: "bg-blue-50",    color: "text-blue-600"    },
];

function GamesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section id="games" className="py-20 md:py-28 bg-white relative overflow-hidden" ref={ref}>
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-50/60 rounded-full blur-[100px] -translate-x-1/2 pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <SectionHeader
          label="الألعاب المعرفية"
          title="تمارين تقوية الذاكرة"
          subtitle="6 ألعاب تفاعلية تستهدف نطاقات إدراكية مختلفة. العب يومياً واتبع تقدّمك مع طبيبك."
          icon={Gamepad2}
          inView={inView}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10"
        >
          {gamesPreview.map(({ icon: Icon, label, domain, bg, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.07 }}
              className="group relative bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col items-center text-center hover:border-blue-100 hover:shadow-xl hover:shadow-gray-200/60 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color} strokeWidth={1.75} />
              </div>
              <p className="text-sm font-bold text-slate-800 leading-tight mb-1">{label}</p>
              <p className="text-xs text-slate-400 leading-tight">{domain}</p>
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-[1.5rem]" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 transition-all duration-200 active:scale-95"
          >
            <Gamepad2 size={20} /> ابدأ التمارين المعرفية
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════ */
function Footer() {
  return (
    <footer id="contact" className="relative mt-0 bg-slate-900 pt-20 pb-8 rounded-t-[3rem] overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-900/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="Memora" className="h-10 w-auto object-contain brightness-0 invert" />
            </div>
            <p className="text-gray-400 leading-relaxed text-sm max-w-xs">نظام طبي ذكي للكشف المبكر عن مرض الزهايمر باستخدام الذكاء الاصطناعي وتحليل صور الرنين المغناطيسي.</p>
            <p className="text-amber-400 font-bold text-sm italic">"لأن كل ذكرى تستحق الحماية"</p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-gray-400 text-sm"><Phone size={14} className="text-cyan-500 shrink-0" /><span>+962 7 0000 0000</span></div>
              <div className="flex items-center gap-3 text-gray-400 text-sm"><Mail size={14} className="text-cyan-500 shrink-0" /><span>support@memora.ai</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              {["f", "t", "in", "yt"].map((label, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 hover:bg-cyan-600 hover:text-white transition-all duration-300 hover:-translate-y-1 border border-slate-700 text-xs font-bold uppercase">
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 lg:col-start-6">
            <h4 className="text-base font-bold text-white mb-6 relative inline-block">روابط سريعة<span className="absolute -bottom-2 right-0 w-8 h-1 bg-cyan-500 rounded-full" /></h4>
            <ul className="space-y-3">
              {[["الرئيسية", "#home"], ["كيف يعمل", "#how-it-works"], ["التكنولوجيا", "#technology"]].map(([l, h]) => (
                <li key={l}><a href={h} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm font-medium flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-cyan-500 transition-colors" />{l}</a></li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <h4 className="text-base font-bold text-white mb-6 relative inline-block">للأطباء والمراكز<span className="absolute -bottom-2 right-0 w-8 h-1 bg-cyan-500 rounded-full" /></h4>
            <ul className="space-y-3">
              {[["سجّل مركزك", "/register"], ["الأسئلة الشائعة", "#early-detection"], ["تسجيل الدخول", "/login"], ["إنشاء حساب", "/register"]].map(([l, h]) => (
                <li key={l}>
                  {h.startsWith("/") ? (
                    <Link href={h} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm font-medium flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-cyan-500 transition-colors" />{l}</Link>
                  ) : (
                    <a href={h} className="text-gray-400 hover:text-cyan-400 transition-colors text-sm font-medium flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-cyan-500 transition-colors" />{l}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3 bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50">
            <h4 className="text-base font-bold text-white mb-2">النشرة العلمية</h4>
            <p className="text-gray-400 text-xs mb-4">اشترك للحصول على آخر الأبحاث عن الزهايمر والعروض الحصرية.</p>
            <div className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" placeholder="بريدك الإلكتروني" className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl pr-10 py-3 placeholder-gray-600 outline-none focus:border-cyan-500 transition-all" />
              </div>
              <button className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2">اشتراك <ArrowLeft size={14} /></button>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">© 2026 Memora. جميع الحقوق محفوظة.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">سياسة الخصوصية</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════
   FLOATING CHAT
   ═══════════════════════════════════════ */
function FloatingChat() {
  return (
    <button className="fixed bottom-6 right-6 z-50 group">
      <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-75 animate-ping" />
      <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-cyan-700 to-cyan-500 text-white rounded-full shadow-xl shadow-cyan-500/40 border-2 border-white">
        <MessageCircle size={26} strokeWidth={2.5} />
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
      </div>
      <span className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">مساعد الزهايمر الذكي</span>
    </button>
  );
}

/* ═══════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════ */
export default function MemoraPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number>(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div dir="rtl" className="relative min-h-screen font-sans">
      <Navbar scrolled={scrolled} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <GamesSection />
        <HowItWorksSection />
        <FaqSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
        <PartnerCTASection />
        <BlogSection />
      </main>
      <Footer />
      <FloatingChat />
    </div>
  );
}

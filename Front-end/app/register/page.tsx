"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Stethoscope, Users, Upload, Eye, EyeOff } from "lucide-react";
import { saveAuth } from "@/lib/auth";
import { authApi, verificationApi, ApiError } from "@/lib/api";
import { roleDashboard } from "@/lib/AuthContext";

const ROLES = [
  { value: "patient", label: "مريض",  desc: "متابعة الحالة الصحية",   Icon: Brain,        gradient: "from-blue-500 to-cyan-500",    shadow: "shadow-blue-500/30" },
  { value: "doctor",  label: "طبيب",   desc: "إدارة المرضى والتشخيص", Icon: Stethoscope,  gradient: "from-violet-500 to-blue-500",  shadow: "shadow-violet-500/30" },
  { value: "family",  label: "عائلة",  desc: "متابعة ذوي المريض",      Icon: Users,        gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/30" },
];

const fieldBase = "px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm";
const fieldClass = `w-full ${fieldBase}`;
const labelClass = "block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2";

// Common dial codes — default is Jordan (+962)
const COUNTRY_CODES = ["+962", "+966", "+971", "+970", "+965", "+974", "+973", "+968", "+20", "+961", "+963", "+964"];

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole]                   = useState("patient");
  const [fullName, setFullName]           = useState("");
  const [email, setEmail]                 = useState("");
  const [countryCode, setCountryCode]     = useState("+962");
  const [phoneNumber, setPhoneNumber]     = useState("");
  const [password, setPassword]           = useState("");
  const [confirm, setConfirm]             = useState("");
  const [specialization, setSpecialization] = useState("طب الأعصاب");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExp, setYearsExp]           = useState("");
  const [cvFile, setCvFile]               = useState<File | null>(null);
  const [showPass, setShowPass]           = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [rememberMe, setRememberMe]       = useState(true);
  const [error, setError]                 = useState("");
  const [loading, setLoading]             = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (password.length < 6)  { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (role === "doctor" && !licenseNumber.trim()) {
      setError("رقم الترخيص الطبي مطلوب للأطباء"); return;
    }

    // Merge country code + number into one unified phone string for the backend.
    // Strip non-digits and any leading national-trunk zero (e.g. 079... → 79...).
    const cleanNumber = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    const phone = cleanNumber ? `${countryCode}${cleanNumber}` : "";

    setLoading(true);
    try {
      let result: any;
      if (role === "doctor") {
        const form = new FormData();
        form.append("full_name", fullName);
        form.append("email", email);
        form.append("password", password);
        form.append("phone", phone);
        form.append("specialization", specialization);
        form.append("license_number", licenseNumber);
        form.append("years_experience", yearsExp || "0");
        if (cvFile) form.append("cv_file", cvFile);
        result = await authApi.registerDoctor(form);
      } else {
        result = await authApi.register({ email, password, full_name: fullName, phone, role, remember_me: rememberMe });
      }
      saveAuth({
        user_id: result.user_id,
        full_name: result.full_name,
        role: result.role,
        access_token: result.access_token,
        is_approved: result.is_approved,
        is_verified: result.is_verified ?? false,
      });

      // Send OTP (best-effort) then always go to verify page
      // The verify page has a resend button if sending failed
      try {
        await verificationApi.sendOtp(email, "email", "verify");
      } catch {
        // ignore — user can resend from the verify page
      }
      const params = new URLSearchParams({ contact: email, method: "email" });
      if (phone) params.set("phone", phone);
      router.replace(`/verify?${params.toString()}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حدث خطأ — حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href="/" aria-label="الصفحة الرئيسية" className="inline-block mb-4 hover:opacity-80 transition-opacity">
            <img src="/images/logo.png" alt="Memora" className="h-12 w-auto object-contain" />
          </Link>
          <h1 className="text-3xl font-black text-slate-900">إنشاء حساب</h1>
          <p className="text-slate-500 mt-1">انضم إلى منصة Memora الطبية</p>
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-10">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

            {/* Role selection */}
            <div>
              <label className={labelClass}>نوع الحساب</label>
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`group p-4 rounded-2xl text-center transition-all border relative overflow-hidden ${
                      role === r.value
                        ? "border-transparent bg-gradient-to-br " + r.gradient + " shadow-lg " + r.shadow
                        : "bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/40"
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 transition-all ${
                      role === r.value ? "bg-white/20" : "bg-gray-100"
                    }`}>
                      <r.Icon size={18} className={role === r.value ? "text-white" : "text-slate-500"} strokeWidth={2} />
                    </div>
                    <div className={`font-extrabold text-sm ${role === r.value ? "text-white" : "text-slate-700"}`}>{r.label}</div>
                    <div className={`text-xs mt-0.5 ${role === r.value ? "text-white/80" : "text-slate-400"}`}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Common fields */}
            <div>
              <label className={labelClass}>الاسم الكامل</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="محمد أحمد" autoComplete="off" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>البريد الإلكتروني</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com" autoComplete="off" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>رقم الجوال (اختياري)</label>
              <div className="flex gap-2" dir="ltr">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                  className={`${fieldBase} w-28 shrink-0 text-center`}>
                  {COUNTRY_CODES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="7xxxxxxxx" autoComplete="off" className={`${fieldBase} flex-1 min-w-0`} />
              </div>
            </div>

            {/* Doctor-specific fields */}
            <AnimatePresence>
              {role === "doctor" && (
                <motion.div
                  key="doctor-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-extrabold text-violet-600 uppercase tracking-wider">بيانات الطبيب</p>
                    <div>
                      <label className={labelClass}>التخصص</label>
                      <input type="text" required value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="طب الأعصاب" autoComplete="off" className={fieldClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>رقم الترخيص الطبي</label>
                        <input type="text" required value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                          placeholder="LIC-XXXXX" autoComplete="off" className={fieldClass} />
                      </div>
                      <div>
                        <label className={labelClass}>سنوات الخبرة</label>
                        <input type="number" min="0" max="60" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)}
                          placeholder="0" className={fieldClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>السيرة الذاتية (اختياري)</label>
                      <label className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-violet-400 hover:bg-violet-50/40 transition-all cursor-pointer">
                        <Upload size={24} className="text-slate-400" strokeWidth={1.75} />
                        <span className="text-sm text-slate-500 font-medium">
                          {cvFile ? cvFile.name : "اضغط لرفع ملف PDF أو Word"}
                        </span>
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                          onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`${fieldClass} pl-10`}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPass((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>تأكيد كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`${fieldClass} pl-10`}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showConfirm ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember me — only patients get a long-lived session */}
            {role === "patient" && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-400/20 cursor-pointer"
                />
                <span className="text-sm text-slate-600 font-medium">تذكّرني</span>
              </label>
            )}

            {error && (
              <div className="p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">{error}</div>
            )}

            {role === "doctor" && (
              <div className="p-4 rounded-xl text-sm text-amber-700 bg-amber-50 border border-amber-200 font-medium">
                سيظهر حسابك في انتظار الموافقة — سيتم تفعيله بعد مراجعة المدير.
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري إنشاء الحساب...</>
              ) : "إنشاء الحساب"}
            </button>

            <p className="text-center text-slate-500 text-sm">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-blue-600 hover:text-cyan-600 font-bold transition-colors">
                تسجيل الدخول
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

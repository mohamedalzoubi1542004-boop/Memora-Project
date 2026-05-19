"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Mail, Phone, RefreshCw, ChevronRight, FlaskConical, Eye, EyeOff } from "lucide-react";
import { verificationApi, ApiError } from "@/lib/api";

type Step = "contact" | "otp" | "newpass";
type Method = "email" | "sms";

const RESEND_COOLDOWN = 60;

const fieldClass =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep]           = useState<Step>("contact");
  const [method, setMethod]       = useState<Method>("email");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits]       = useState<string[]>(Array(6).fill(""));
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirm] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);
  const [cooldown, setCooldown]     = useState(0);
  const [devCode, setDevCode]       = useState<string | null>(null);
  const [showNewPass, setShowNewPass]     = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<NodeJS.Timeout | null>(null);

  function startCountdown() {
    setCooldown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) { setError("أدخل بريدك الإلكتروني أو رقم هاتفك"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await verificationApi.sendOtp(identifier.trim(), method, "reset");
      setStep("otp");
      startCountdown();
      if (res.dev_code) {
        setDevCode(res.dev_code);
        const next = res.dev_code.split("").slice(0, 6);
        setDigits(next);
      } else {
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حدث خطأ — حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleDigit = useCallback((idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[idx] = val.slice(-1);
    setDigits(next);
    setError("");
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  }, [digits]);

  const handleKeyDown = useCallback((idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = Array(6).fill("");
    text.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  }, []);

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("أدخل الرمز المكوّن من 6 أرقام"); return; }
    // Don't consume the OTP here — reset_password will verify it in step 3.
    // Just advance the UI.
    setStep("newpass");
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    try {
      const res = await verificationApi.sendOtp(identifier.trim(), method, "reset");
      startCountdown();
      if (res.dev_code) {
        setDevCode(res.dev_code);
        setDigits(res.dev_code.split("").slice(0, 6));
      } else {
        setDigits(Array(6).fill(""));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر إعادة الإرسال");
    }
  }

  // ── Step 3: Reset Password ────────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPass.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (newPass !== confirmPass) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    setError("");
    try {
      await verificationApi.resetPassword(identifier.trim(), digits.join(""), newPass);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حدث خطأ — حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  const stepProgress = step === "contact" ? 1 : step === "otp" ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-80px] right-[-60px] w-[400px] h-[400px] rounded-full bg-blue-200/20 blur-[100px]" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[340px] h-[340px] rounded-full bg-violet-200/15 blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 bg-gradient-to-br from-violet-600 to-blue-500 shadow-xl shadow-violet-600/30">
            <KeyRound size={28} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black text-slate-900">استعادة كلمة المرور</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {step === "contact" ? "أدخل بريدك أو هاتفك لإرسال رمز التحقق"
            : step === "otp"    ? "أدخل الرمز الذي أُرسل إليك"
            :                    "أدخل كلمة المرور الجديدة"}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-2 rounded-full transition-all duration-300 ${
                n === stepProgress
                  ? "w-8 bg-blue-600"
                  : n < stepProgress
                  ? "w-2 bg-blue-400"
                  : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Contact ── */}
            {step === "contact" && (
              <motion.form
                key="contact"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSendOtp}
                className="space-y-5"
              >
                {/* Method toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                    طريقة الاستعادة
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { setMethod("email"); setIdentifier(""); setError(""); }}
                      className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all font-semibold text-sm ${
                        method === "email"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-slate-500 hover:border-blue-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        method === "email" ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <Mail size={15} strokeWidth={2} />
                      </div>
                      البريد الإلكتروني
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMethod("sms"); setIdentifier(""); setError(""); }}
                      className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all font-semibold text-sm ${
                        method === "sms"
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-gray-200 bg-white text-slate-500 hover:border-violet-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        method === "sms" ? "bg-violet-100" : "bg-gray-100"
                      }`}>
                        <Phone size={15} strokeWidth={2} />
                      </div>
                      رسالة SMS
                    </button>
                  </div>
                </div>

                {/* Identifier input */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                    {method === "email" ? "البريد الإلكتروني" : "رقم الهاتف"}
                  </label>
                  <input
                    type={method === "email" ? "email" : "tel"}
                    required
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
                    placeholder={method === "email" ? "example@email.com" : "+966 5xxxxxxxx"}
                    className={fieldClass}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الإرسال…</>
                  ) : "إرسال رمز التحقق"}
                </button>

                <p className="text-center text-slate-500 text-sm">
                  تذكّرت كلمة مرورك؟{" "}
                  <Link href="/login" className="text-blue-600 hover:text-cyan-600 font-bold transition-colors">
                    تسجيل الدخول
                  </Link>
                </p>
              </motion.form>
            )}

            {/* ── Step 2: OTP ── */}
            {step === "otp" && (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleVerifyOtp}
                className="space-y-6"
              >
                <p className="text-sm text-slate-500 text-center">
                  تم الإرسال إلى{" "}
                  <span className="font-bold text-slate-700">{identifier}</span>
                </p>

                {/* Dev mode banner */}
                {devCode && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <FlaskConical size={14} className="text-amber-600" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">وضع التطوير</div>
                      <div className="text-sm text-amber-800">
                        الرمز: <span className="font-black text-amber-900 text-base tracking-widest">{devCode}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* OTP boxes */}
                <div className="flex gap-2.5 justify-center" dir="ltr" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all
                        ${d ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-slate-800"}
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100 text-center">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading || digits.join("").length < 6}
                  className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري التحقق…</>
                  ) : "التحقق من الرمز"}
                </button>

                {/* Resend + back */}
                <div className="text-center space-y-2">
                  {cooldown > 0 ? (
                    <p className="text-sm text-slate-400">
                      إعادة الإرسال بعد{" "}
                      <span className="font-bold text-slate-600 tabular-nums">{cooldown}</span>
                      {" "}ثانية
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-cyan-600 font-bold transition-colors"
                    >
                      <RefreshCw size={13} strokeWidth={2.5} />
                      إعادة إرسال الرمز
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setStep("contact"); setDigits(Array(6).fill("")); setError(""); }}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mx-auto transition-colors"
                  >
                    <ChevronRight size={13} strokeWidth={2} />
                    تغيير طريقة الاستعادة
                  </button>
                </div>
              </motion.form>
            )}

            {/* ── Step 3: New Password ── */}
            {step === "newpass" && !success && (
              <motion.form
                key="newpass"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleResetPassword}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPass}
                      onChange={(e) => { setNewPass(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      className={`${fieldClass} pl-10`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowNewPass((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showNewPass ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmPass}
                      onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                      placeholder="••••••••"
                      className={`${fieldClass} pl-10`}
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showConfirm ? <EyeOff size={15} strokeWidth={2} /> : <Eye size={15} strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-violet-600 to-blue-500 hover:opacity-90 shadow-lg shadow-violet-600/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ…</>
                  ) : "تغيير كلمة المرور"}
                </button>
              </motion.form>
            )}

            {/* ── Success ── */}
            {success && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="text-6xl mb-4">🔐</div>
                <div className="text-2xl font-black text-slate-900 mb-2">تم التغيير بنجاح!</div>
                <div className="text-slate-500 text-sm">جاري التوجيه إلى صفحة تسجيل الدخول…</div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

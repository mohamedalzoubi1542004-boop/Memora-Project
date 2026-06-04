"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, RefreshCw, FlaskConical } from "lucide-react";
import { verificationApi, ApiError } from "@/lib/api";
import { getAuthUser, saveAuth } from "@/lib/auth";
import { roleDashboard } from "@/lib/AuthContext";

const RESEND_COOLDOWN = 60;

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router  = useRouter();
  const params  = useSearchParams();

  const contact = params.get("contact") ?? "";

  const [digits, setDigits]             = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);
  const [cooldown, setCooldown]         = useState(RESEND_COOLDOWN);
  const [devCode, setDevCode]           = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<NodeJS.Timeout | null>(null);

  // Trigger first OTP send on mount (the register page already did it, but
  // we still need the dev_code — so we call send-otp again silently)
  useEffect(() => {
    if (!contact) return;
    startCountdown();
    verificationApi.sendOtp(contact, "email", "verify")
      .then((res) => {
        if (res.dev_code) {
          setDevCode(res.dev_code);
          fillDigits(res.dev_code);
        }
      })
      .catch(() => {/* ignore — OTP was already sent by register page */});
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fillDigits(code: string) {
    setDigits(code.split("").slice(0, 6));
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) { setError("أدخل الرمز المكوّن من 6 أرقام"); return; }
    setLoading(true);
    setError("");
    try {
      await verificationApi.verifyOtp(contact, code, "verify");
      const stored = getAuthUser();
      if (stored) saveAuth({ ...stored, is_verified: true });
      setSuccess(true);
      setTimeout(() => router.replace(roleDashboard(stored?.role ?? "patient")), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "حدث خطأ — حاول مجدداً");
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    try {
      const res = await verificationApi.sendOtp(contact, "email", "verify");
      startCountdown();
      if (res.dev_code) { setDevCode(res.dev_code); fillDigits(res.dev_code); }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "تعذّر إعادة الإرسال");
    }
  }

  const label = `البريد الإلكتروني ${contact}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
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
          <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 bg-gradient-to-br from-blue-600 to-cyan-500 shadow-xl shadow-blue-600/30">
            <ShieldCheck size={28} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black text-slate-900">تحقق من هويتك</h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            تم إرسال رمز مكوّن من 6 أرقام إلى
            <br />
            <span className="font-bold text-slate-700">{label}</span>
          </p>
        </div>

        {/* Dev mode banner */}
        {devCode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <FlaskConical size={16} className="text-amber-600" strokeWidth={2} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">وضع التطوير</div>
              <div className="text-sm text-amber-800">
                الرمز: <span className="font-black text-amber-900 text-base tracking-widest">{devCode}</span>
                {" "}<span className="text-amber-600">(مُعبَّأ تلقائياً)</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="text-6xl mb-4">✅</div>
                <div className="text-2xl font-black text-slate-900 mb-2">تم التحقق بنجاح!</div>
                <div className="text-slate-500">جاري التوجيه إلى لوحة التحكم…</div>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-6">
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
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100 text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || digits.join("").length < 6}
                  className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري التحقق…</>
                  ) : "تحقق من الرمز"}
                </button>

                {/* Resend section */}
                <div className="text-center space-y-3">
                  {cooldown > 0 ? (
                    <p className="text-sm text-slate-400">
                      يمكنك إعادة الإرسال بعد{" "}
                      <span className="font-bold text-slate-600 tabular-nums">{cooldown}</span>
                      {" "}ثانية
                    </p>
                  ) : (
                    <button type="button" onClick={handleResend}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-cyan-600 font-bold transition-colors">
                      <RefreshCw size={13} strokeWidth={2.5} />
                      إعادة إرسال الرمز
                    </button>
                  )}
                  <p className="text-xs text-slate-400">الرمز صالح لمدة 10 دقائق فقط</p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

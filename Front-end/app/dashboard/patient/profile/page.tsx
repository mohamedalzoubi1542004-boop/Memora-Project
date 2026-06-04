"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Save, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { patientApi, authApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const fieldClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder-gray-400";

export default function PatientProfilePage() {
  const { user, loading } = useRequireAuth(["patient"]);
  const { refresh } = useAuth();
  const [profile, setProfile]       = useState<any>(null);
  const [fetching, setFetching]     = useState(true);
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState("");
  const [error, setError]           = useState("");

  const [fullName, setFullName]                 = useState("");
  const [dob, setDob]                           = useState("");
  const [gender, setGender]                     = useState("");
  const [bloodType, setBloodType]               = useState("");
  const [emergencyName, setEmergencyName]       = useState("");
  const [emergencyPhone, setEmergencyPhone]     = useState("");
  const [medicalHistory, setMedicalHistory]     = useState("");
  const [allergies, setAllergies]               = useState("");
  const [medications, setMedications]           = useState("");

  useEffect(() => {
    if (!user) return;
    patientApi.me().then((p: any) => {
      setProfile(p);
      setFullName(p.full_name ?? "");
      setDob(p.date_of_birth ?? "");
      setGender(p.gender ?? "");
      setBloodType(p.blood_type ?? "");
      setEmergencyName(p.emergency_contact_name ?? "");
      setEmergencyPhone(p.emergency_contact_phone ?? "");
      setMedicalHistory(p.medical_history ?? "");
      setAllergies(p.allergies ?? "");
      setMedications(p.medications ?? "");
    }).catch(() => {}).finally(() => setFetching(false));
  }, [user]);

  async function saveProfile() {
    setSaving(true); setSuccess(""); setError("");
    try {
      await patientApi.update({
        date_of_birth: dob || null,
        gender: gender || null,
        blood_type: bloodType || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        medical_history: medicalHistory || null,
        allergies: allergies || null,
        medications: medications || null,
      });
      if (fullName.trim() && fullName !== profile?.full_name) {
        await authApi.updateProfile({ full_name: fullName.trim() });
        await refresh();
      }
      setSuccess("تم حفظ التغييرات بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message ?? "حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  }

  if (loading || !user) return null;

  return (
    <DashboardLayout title="الملف الشخصي">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto space-y-6 py-2">

          {/* ── Header card ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-blue-700 to-cyan-500 shadow-xl shadow-blue-600/25 p-6 flex items-center gap-5">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white bg-white/20 border border-white/30 shadow-inner shrink-0">
                {(profile?.full_name ?? user.full_name).charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">{profile?.full_name ?? user.full_name}</h2>
                <p className="text-blue-100 text-sm mt-0.5 flex items-center gap-1.5">
                  <User size={12} strokeWidth={2} />
                  مريض
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Form ── */}
          {fetching ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-12 flex justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
          ) : (
            <motion.div {...fadeUp(0.12)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-5">
              <h3 className="text-slate-900 font-extrabold text-base border-b border-gray-100 pb-4">تعديل البيانات الشخصية</h3>

              {/* Full name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">الاسم الكامل</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">تاريخ الميلاد</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">الجنس</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={fieldClass}>
                    <option value="">— اختر —</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
              </div>

              {/* Blood type */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">فصيلة الدم</label>
                <div className="flex flex-wrap gap-2">
                  {BLOOD_TYPES.map((bt) => (
                    <button key={bt} onClick={() => setBloodType(bt === bloodType ? "" : bt)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                        bloodType === bt
                          ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white border-transparent shadow-md shadow-blue-600/25"
                          : "bg-white text-slate-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}>
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency contact */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">جهة الاتصال في الطوارئ</label>
                <div className="grid grid-cols-2 gap-4">
                  <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="الاسم" className={fieldClass} />
                  <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
                    type="tel" inputMode="tel" placeholder="رقم الهاتف" className={fieldClass} />
                </div>
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">الحساسية</label>
                <input value={allergies} onChange={(e) => setAllergies(e.target.value)}
                  placeholder="مثال: البنسلين، الغبار..." className={fieldClass} />
              </div>

              {/* Medications */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">الأدوية الحالية</label>
                <input value={medications} onChange={(e) => setMedications(e.target.value)}
                  placeholder="مثال: أسبرين 100mg، أملوديبين 5mg..." className={fieldClass} />
              </div>

              {/* Medical history */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">التاريخ الطبي</label>
                <textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)}
                  rows={3} placeholder="أمراض سابقة، عمليات جراحية..."
                  className={`${fieldClass} resize-none`} />
              </div>

              {/* Feedback */}
              {success && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold">
                  <CheckCircle size={16} strokeWidth={2.5} />
                  {success}
                </div>
              )}
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">{error}</div>
              )}

              <button onClick={saveProfile} disabled={saving}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-l from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><Save size={16} strokeWidth={2.5} /> حفظ التغييرات</>
                )}
              </button>
            </motion.div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

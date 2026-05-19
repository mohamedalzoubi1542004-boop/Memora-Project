"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Save, CheckCircle, Upload, FileText, Camera } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doctorApi, authApi, api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const SPECIALIZATIONS = [
  "طب الأعصاب", "الطب النفسي", "طب الشيخوخة", "الطب الباطني",
  "طب الأسرة", "علم الأعصاب السريري", "الطب العام",
];

const fieldClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/10 transition-all placeholder-gray-400";

export default function DoctorProfilePage() {
  const { user, loading } = useRequireAuth(["doctor"]);
  const { refresh } = useAuth();
  const cvInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]           = useState<any>(null);
  const [fetching, setFetching]         = useState(true);
  const [saving, setSaving]               = useState(false);
  const [uploadingCv, setUploadingCv]     = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [success, setSuccess]             = useState("");
  const [error, setError]                 = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName]               = useState("");
  const [specialization, setSpecialization]   = useState("");
  const [licenseNumber, setLicenseNumber]     = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio]                         = useState("");

  useEffect(() => {
    if (!user) return;
    doctorApi.me().then((d: any) => {
      setProfile(d);
      setFullName(d.full_name ?? "");
      setSpecialization(d.specialization ?? "");
      setLicenseNumber(d.license_number ?? "");
      setYearsExperience(d.years_experience != null ? String(d.years_experience) : "");
      setBio(d.bio ?? "");
      if (d.profile_image) setAvatarUrl(`/api/uploads/${d.profile_image}`);
    }).catch(() => {}).finally(() => setFetching(false));
  }, [user]);

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true); setSuccess(""); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await authApi.uploadAvatar(form);
      setAvatarUrl(URL.createObjectURL(file));
      setSuccess("تم تحديث صورة الملف الشخصي");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message ?? "فشل رفع الصورة");
    }
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    setSaving(true); setSuccess(""); setError("");
    try {
      await doctorApi.update({
        specialization: specialization || null,
        license_number: licenseNumber || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        bio: bio || null,
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

  async function uploadCv(file: File) {
    setUploadingCv(true); setSuccess(""); setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload("/doctors/me/cv", form);
      setSuccess("تم رفع السيرة الذاتية بنجاح");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message ?? "فشل رفع الملف");
    }
    setUploadingCv(false);
  }

  if (loading || !user) return null;

  return (
    <DashboardLayout title="الملف الشخصي">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[460px] h-[460px] rounded-full bg-violet-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full bg-blue-200/15 blur-[100px]" />
        </div>

        <div className="max-w-2xl mx-auto space-y-6 py-2">

          {/* ── Header card ── */}
          <motion.div {...fadeUp(0)} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-violet-700 to-blue-600 shadow-xl shadow-violet-600/25 p-6 flex items-center gap-5">
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="white" /></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
            <div className="relative z-10 flex items-center gap-4">
              {/* Avatar with upload button */}
              <div className="relative shrink-0 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="صورة الملف الشخصي"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-inner" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white bg-white/20 border border-white/30 shadow-inner">
                    {(profile?.full_name ?? user.full_name).charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar
                    ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera size={18} className="text-white" strokeWidth={2} />}
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
              <div>
                <h2 className="text-xl font-extrabold text-white">د. {profile?.full_name ?? user.full_name}</h2>
                <p className="text-violet-100 text-sm mt-0.5 flex items-center gap-1.5">
                  <Stethoscope size={12} strokeWidth={2} />
                  {profile?.specialization ?? "طبيب"}
                </p>
                <p className="text-violet-200/70 text-xs mt-1">اضغط على الصورة لتغييرها</p>
              </div>
            </div>
          </motion.div>

          {/* ── Form ── */}
          {fetching ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-12 flex justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              <motion.div {...fadeUp(0.12)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-5">
                <h3 className="text-slate-900 font-extrabold text-base border-b border-gray-100 pb-4">البيانات المهنية</h3>

                {/* Full name */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">الاسم الكامل</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
                </div>

                {/* Specialization chips */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">التخصص</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {SPECIALIZATIONS.map((s) => (
                      <button key={s} type="button" onClick={() => setSpecialization(s === specialization ? "" : s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          specialization === s
                            ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white border-transparent shadow-md shadow-violet-600/25"
                            : "bg-white text-slate-700 border-gray-200 hover:border-violet-300 hover:bg-violet-50"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <input value={specialization} onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="أو اكتب تخصصاً آخر..." className={fieldClass} />
                </div>

                {/* License + experience */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">رقم الترخيص</label>
                    <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">سنوات الخبرة</label>
                    <input type="number" min="0" max="60" value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)} className={fieldClass} />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">نبذة تعريفية</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                    placeholder="اكتب نبذة مختصرة عن خبرتك..."
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
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-l from-violet-600 to-blue-600 hover:opacity-90 shadow-lg shadow-violet-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><Save size={16} strokeWidth={2.5} /> حفظ التغييرات</>
                  )}
                </button>
              </motion.div>

              {/* ── CV upload ── */}
              <motion.div {...fadeUp(0.2)} className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 space-y-4">
                <h3 className="text-slate-900 font-extrabold text-base border-b border-gray-100 pb-4">السيرة الذاتية</h3>

                {profile?.cv_file ? (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50 border border-violet-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-sm shadow-violet-600/25 shrink-0">
                      <FileText size={16} className="text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">السيرة الذاتية المرفوعة</div>
                      <div className="text-xs text-slate-400 mt-0.5">{profile.cv_file}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                    لم يتم رفع سيرة ذاتية بعد
                  </div>
                )}

                <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadCv(file);
                    e.target.value = "";
                  }} />

                <button onClick={() => cvInputRef.current?.click()} disabled={uploadingCv}
                  className="w-full py-3 rounded-2xl text-sm font-bold border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {uploadingCv ? (
                    <><span className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /> جاري الرفع...</>
                  ) : (
                    <><Upload size={15} strokeWidth={2.5} /> {profile?.cv_file ? "تحديث السيرة الذاتية" : "رفع السيرة الذاتية"}</>
                  )}
                </button>
                <p className="text-xs text-slate-400 text-center">PDF أو Word — بحد أقصى 5 MB</p>
              </motion.div>
            </>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

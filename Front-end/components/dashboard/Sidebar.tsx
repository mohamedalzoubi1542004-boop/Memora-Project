"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  Home, Brain, Activity, Gamepad2, Calendar, MessageCircle,
  Upload, Users, FileText, User, Heart, LayoutDashboard,
  LogOut, BrainCircuit, ChevronRight, Smile,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

function NavLink({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard/patient" && href !== "/dashboard/doctor" && href !== "/dashboard/admin" && href !== "/dashboard/family" && pathname.startsWith(href + "/"));
  const exactActive = pathname === href;
  const isActive = active || exactActive;

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden ${
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      <Icon
        size={18}
        strokeWidth={isActive ? 2.5 : 1.75}
        className={`shrink-0 transition-transform duration-200 ${!isActive ? "group-hover:scale-110" : ""}`}
      />
      <span>{label}</span>
      {isActive && (
        <ChevronRight size={14} className="mr-auto opacity-60" />
      )}
    </Link>
  );
}

const PATIENT_NAV: NavItem[] = [
  { href: "/dashboard/patient",              label: "الرئيسية",         icon: Home },
  { href: "/dashboard/patient/checkin",      label: "تسجيل يومي",       icon: Smile },
  { href: "/dashboard/patient/mmse",         label: "اختبار MMSE",      icon: Brain },
  { href: "/dashboard/patient/symptoms",     label: "متابعة الأعراض",   icon: Activity },
  { href: "/dashboard/patient/games",        label: "الألعاب المعرفية", icon: Gamepad2 },
  { href: "/dashboard/patient/appointments", label: "المواعيد",         icon: Calendar },
  { href: "/dashboard/messages",             label: "الرسائل",          icon: MessageCircle },
  { href: "/dashboard/patient/profile",      label: "ملفي الشخصي",      icon: User },
];

const DOCTOR_NAV: NavItem[] = [
  { href: "/dashboard/doctor",               label: "الرئيسية",        icon: Home },
  { href: "/dashboard/doctor/patients",      label: "مرضاي",           icon: Users },
  { href: "/dashboard/doctor/upload-mri",    label: "رفع صورة MRI",    icon: Upload },
  { href: "/dashboard/doctor/appointments",  label: "المواعيد",        icon: Calendar },
  { href: "/dashboard/doctor/reports",       label: "التقارير",        icon: FileText },
  { href: "/dashboard/messages",             label: "الرسائل",         icon: MessageCircle },
  { href: "/dashboard/doctor/profile",       label: "ملفي الشخصي",     icon: User },
];

const FAMILY_NAV: NavItem[] = [
  { href: "/dashboard/family",         label: "الرئيسية",      icon: Home },
  { href: "/dashboard/family/burnout", label: "تقييم الإجهاد", icon: Heart },
  { href: "/dashboard/messages",       label: "الرسائل",       icon: MessageCircle },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin",    label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/dashboard/messages", label: "الرسائل",     icon: MessageCircle },
];

function navForRole(role: string): NavItem[] {
  switch (role) {
    case "doctor": return DOCTOR_NAV;
    case "family": return FAMILY_NAV;
    case "admin":  return ADMIN_NAV;
    default:       return PATIENT_NAV;
  }
}

const ROLE_LABELS: Record<string, string> = {
  patient: "مريض", doctor: "طبيب", family: "عائلة", admin: "مدير",
};

const ROLE_COLORS: Record<string, string> = {
  patient: "from-blue-500 to-cyan-500",
  doctor:  "from-violet-500 to-blue-600",
  family:  "from-emerald-500 to-teal-500",
  admin:   "from-amber-500 to-orange-500",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const navItems = navForRole(user.role);
  const gradientClass = ROLE_COLORS[user.role] ?? "from-blue-500 to-cyan-500";

  return (
    <aside
      className="hidden lg:flex flex-col w-64 min-h-screen shrink-0 bg-white border-l border-gray-100"
      dir="rtl"
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-gray-50">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 shadow-md shadow-blue-500/30">
          <BrainCircuit size={18} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <span className="text-base font-black text-slate-900 tracking-tight">Memora</span>
          <p className="text-[10px] text-slate-400 font-medium -mt-0.5">الكشف المبكر عن الزهايمر</p>
        </div>
      </div>

      {/* ── User card ── */}
      <div className="mx-3 mt-4 mb-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-50 border border-gray-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${gradientClass} shadow-sm`}>
            {user.full_name.charAt(0)}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 truncate">{user.full_name}</div>
            <div className={`text-[11px] font-semibold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          القائمة الرئيسية
        </p>
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* ── Logout ── */}
      <div className="px-3 pb-5 pt-2 border-t border-gray-50">
        <button
          onClick={logout}
          className="group flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-200"
        >
          <LogOut size={18} strokeWidth={1.75} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}

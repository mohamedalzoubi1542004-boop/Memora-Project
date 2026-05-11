"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle, ChevronDown, LogOut, User, Bell } from "lucide-react";

interface TopbarProps {
  title: string;
}

export default function Topbar({ title }: TopbarProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="flex items-center justify-between px-6 py-3.5 shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20"
      dir="rtl"
    >
      {/* Page title */}
      <div>
        <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h1>
        <div className="h-0.5 w-8 bg-gradient-to-l from-cyan-500 to-blue-600 rounded-full mt-0.5" />
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 transition-all duration-200">
          <Bell size={17} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500 border-2 border-white" />
        </button>

        {/* Messages */}
        <Link
          href="/dashboard/messages"
          className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-100 hover:border-blue-100 transition-all duration-200"
        >
          <MessageCircle size={17} strokeWidth={1.75} />
        </Link>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-100 bg-white hover:border-cyan-200 hover:bg-cyan-50/50 transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm shadow-blue-500/30">
              {user?.full_name?.charAt(0) ?? "؟"}
            </div>
            <span className="text-sm text-slate-700 hidden sm:block font-semibold max-w-[120px] truncate">
              {user?.full_name}
            </span>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute left-0 mt-2 w-52 rounded-2xl overflow-hidden shadow-xl shadow-gray-200/60 border border-gray-100 bg-white z-50">
                {/* User info */}
                <div className="px-4 py-3.5 bg-gradient-to-l from-blue-50 to-cyan-50 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm">
                      {user?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{user?.full_name}</p>
                      <p className="text-[10px] text-slate-400">{user?.role}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full text-right px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2.5"
                  >
                    <User size={14} strokeWidth={1.75} className="text-slate-400" />
                    الملف الشخصي
                  </button>
                  <div className="border-t border-gray-50 my-1" />
                  <button
                    onClick={() => { setOpen(false); logout(); }}
                    className="w-full text-right px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2.5"
                  >
                    <LogOut size={14} strokeWidth={1.75} />
                    تسجيل الخروج
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

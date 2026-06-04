"use client";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
interface DashboardLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function DashboardLayout({ title, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]" dir="rtl">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title={title} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Plus, X, Search } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { messageApi } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function MessagesPage() {
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activePartner, setActivePartner] = useState<any>(null);
  const [messages, setMessages]           = useState<any[]>([]);
  const [text, setText]                   = useState("");
  const [sending, setSending]             = useState(false);
  const [contacts, setContacts]           = useState<any[]>([]);
  const [showContacts, setShowContacts]   = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const activePartnerRef = useRef<any>(null);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    const c: any = await messageApi.conversations().catch(() => null);
    if (c) setConversations(c);
  }, [user]);

  const refreshMessages = useCallback(async () => {
    const partner = activePartnerRef.current;
    if (!partner) return;
    const msgs: any = await messageApi.with(partner.partner_id).catch(() => null);
    if (msgs) setMessages(msgs);
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshConversations();
    messageApi.contacts().then((cs: any) => setContacts(cs)).catch(() => {});
    const convTimer = setInterval(refreshConversations, 8000);
    return () => clearInterval(convTimer);
  }, [user, refreshConversations]);

  useEffect(() => {
    const msgTimer = setInterval(refreshMessages, 5000);
    return () => clearInterval(msgTimer);
  }, [refreshMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(partner: any) {
    setActivePartner(partner);
    activePartnerRef.current = partner;
    const msgs: any = await messageApi.with(partner.partner_id).catch(() => []);
    setMessages(msgs);
    setConversations((prev) =>
      prev.map((c) => c.partner_id === partner.partner_id ? { ...c, unread_count: 0 } : c)
    );
  }

  async function sendMessage() {
    if (!text.trim() || !activePartner) return;
    setSending(true);
    try {
      const msg: any = await messageApi.send(activePartner.partner_id, text);
      setMessages((prev) => [...prev, msg]);
      setText("");
    } catch {}
    setSending(false);
  }

  async function startConversationWith(contact: any) {
    // Reuse the existing conversation if one is already open with this contact
    const existing = conversations.find((c) => c.partner_id === contact.id);
    const partner = existing ?? {
      partner_id: contact.id,
      partner_name: contact.full_name,
      last_message: "",
      last_at: new Date().toISOString(),
      unread_count: 0,
    };
    setActivePartner(partner);
    activePartnerRef.current = partner;
    setShowContacts(false);
    setContactSearch("");
    const msgs: any = await messageApi.with(contact.id).catch(() => []);
    setMessages(msgs);
  }

  if (loading || !user) return null;

  return (
    <DashboardLayout title="الرسائل">
      <div className="relative min-h-full" dir="rtl">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-100px] right-[-80px] w-[440px] h-[440px] rounded-full bg-blue-200/20 blur-[120px]" />
          <div className="absolute bottom-[-60px] left-[-60px] w-[340px] h-[340px] rounded-full bg-cyan-200/15 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex gap-4 h-[74vh]"
        >
          {/* ── Conversations sidebar ── */}
          <div className="w-64 shrink-0 flex flex-col bg-white border border-gray-100 rounded-[1.75rem] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-slate-900 font-extrabold text-sm">
                {showContacts ? "محادثة جديدة" : "المحادثات"}
              </p>
              <button
                onClick={() => { setShowContacts((v) => !v); setContactSearch(""); }}
                title={showContacts ? "إغلاق" : "محادثة جديدة"}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all"
              >
                {showContacts
                  ? <X size={16} className="text-white" strokeWidth={2.5} />
                  : <Plus size={16} className="text-white" strokeWidth={2.5} />}
              </button>
            </div>

            {showContacts ? (
              /* ── Contacts picker ── */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-gray-50">
                  <div className="relative">
                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                    <input
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      placeholder="ابحث بالاسم..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl text-sm text-slate-900 placeholder-gray-400 border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {(() => {
                    const filtered = contacts.filter((c) =>
                      c.full_name.toLowerCase().includes(contactSearch.trim().toLowerCase())
                    );
                    if (contacts.length === 0) return (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-8 px-4">
                        <MessageCircle size={26} strokeWidth={1.5} className="text-slate-300" />
                        <p className="text-xs text-center">لا توجد جهات متاحة للمراسلة بعد</p>
                      </div>
                    );
                    if (filtered.length === 0) return (
                      <p className="text-xs text-slate-400 text-center py-8">لا نتائج مطابقة</p>
                    );
                    return filtered.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => startConversationWith(c)}
                        className="w-full p-3.5 text-right transition-all border-b border-gray-50 last:border-0 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-slate-400 to-slate-500 shrink-0">
                            {c.full_name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate text-slate-900">{c.full_name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {c.role_label}
                              {c.context && <span className="text-blue-500"> · {c.context}</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              /* ── Conversations list ── */
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-8">
                    <MessageCircle size={28} strokeWidth={1.5} className="text-slate-300" />
                    <p className="text-xs text-center">لا توجد محادثات بعد</p>
                  </div>
                ) : conversations.map((c) => {
                  const isActive = activePartner?.partner_id === c.partner_id;
                  return (
                    <button
                      key={c.partner_id}
                      onClick={() => openConversation(c)}
                      className={`w-full p-4 text-right transition-all border-b border-gray-50 last:border-0 ${
                        isActive ? "bg-blue-50 border-r-2 border-r-blue-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br ${isActive ? "from-blue-600 to-cyan-500" : "from-slate-400 to-slate-500"} shrink-0`}>
                          {c.partner_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isActive ? "text-blue-700" : "text-slate-900"}`}>
                            {c.partner_name}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{c.last_message}</div>
                        </div>
                        {c.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white bg-blue-600 flex items-center justify-center shrink-0">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Chat area ── */}
          <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-[1.75rem] shadow-sm overflow-hidden">
            {!activePartner ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/25">
                  <MessageCircle size={28} className="text-white" strokeWidth={1.75} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-500">اختر محادثة للبدء</p>
                  <p className="text-xs text-slate-400 mt-1">أو اضغط + لبدء محادثة جديدة مع إحدى جهاتك</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3.5 flex items-center gap-3 border-b border-gray-100 bg-slate-50/50">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-blue-600 to-cyan-500 shadow-sm shadow-blue-500/30">
                    {activePartner.partner_name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-slate-900 font-bold text-sm">{activePartner.partner_name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] text-slate-400">متصل</span>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40">
                  {messages.length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-8">لا توجد رسائل بعد — ابدأ المحادثة</div>
                  )}
                  {messages.map((m: any, i) => {
                    const mine = m.sender_id === authUser?.user_id;
                    return (
                      <div key={i} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-xs px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          mine
                            ? "bg-gradient-to-br from-blue-600 to-cyan-500 text-white rounded-[1rem_0.375rem_1rem_1rem] shadow-blue-500/20"
                            : "bg-white text-slate-900 border border-gray-100 rounded-[0.375rem_1rem_1rem_1rem]"
                        }`}>
                          {m.content}
                          <div className={`text-[10px] mt-1.5 ${mine ? "opacity-70 text-right" : "text-slate-400"}`}>
                            {new Date(m.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-4 flex gap-3 border-t border-gray-100 bg-white">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="اكتب رسالتك..."
                    className="flex-1 px-4 py-3 rounded-xl text-slate-900 placeholder-gray-400 border border-gray-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-sm bg-slate-50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !text.trim()}
                    className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 hover:opacity-90 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-40"
                  >
                    <Send size={16} className="text-white rotate-180" strokeWidth={2} />
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

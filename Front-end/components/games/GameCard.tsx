"use client";
import { motion } from "framer-motion";
import { Play, Trophy, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getLocalStats } from "@/services/gameApi";
import type { GameType } from "@/services/gameApi";

interface Props {
  gameType: GameType;
  href: string;
  name: string;
  domain: string;
  description: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  btnColor: string;
  index: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  return `منذ ${days} أيام`;
}

export default function GameCard({
  gameType, href, name, domain, description,
  icon: Icon, iconBg, iconColor, btnColor, index,
}: Props) {
  const [stats, setStats] = useState({ best: 0, lastPlayed: null as string | null });

  useEffect(() => {
    setStats(getLocalStats(gameType));
  }, [gameType]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="group relative bg-white border border-gray-100 rounded-[2rem] p-7 flex flex-col hover:border-blue-100 hover:shadow-xl hover:shadow-gray-200/60 transition-all duration-300"
    >
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-[2rem]" />

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={28} className={iconColor} strokeWidth={1.75} />
      </div>

      {/* Domain tag */}
      <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-3 self-start">
        {domain}
      </span>

      {/* Name */}
      <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
        {name}
      </h3>

      {/* Description */}
      <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1">{description}</p>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Trophy size={12} className="text-amber-500" />
          <span className="font-bold text-amber-600">
            {stats.best > 0 ? stats.best.toLocaleString("ar-EG") : "لم تلعب بعد"}
          </span>
        </div>
        {stats.lastPlayed && (
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span>{timeAgo(stats.lastPlayed)}</span>
          </div>
        )}
      </div>

      {/* CTA button — same style as landing page buttons */}
      <Link
        href={href}
        className={`flex items-center justify-center gap-2 py-3 rounded-full ${btnColor} text-white font-bold text-sm shadow-lg transition-all duration-200 hover:opacity-90 active:scale-95`}
      >
        <Play size={16} fill="white" /> ابدأ اللعب
      </Link>
    </motion.div>
  );
}

"use client";
import { Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  onChange?: (muted: boolean) => void;
}

export default function SoundToggle({ onChange }: Props) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("memora_muted");
    if (saved === "true") setMuted(true);
  }, []);

  const toggle = () => {
    setMuted((p) => {
      const next = !p;
      localStorage.setItem("memora_muted", String(next));
      onChange?.(next);
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all duration-200"
      title={muted ? "تشغيل الصوت" : "كتم الصوت"}
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );
}

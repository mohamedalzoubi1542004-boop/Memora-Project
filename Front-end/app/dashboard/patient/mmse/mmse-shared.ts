// Shared MMSE data — imported by both the page and the lazy-loaded chart module.

export const DOMAINS = [
  { key: "temporal_orientation",  label: "التوجه الزمني",      max: 5 },
  { key: "spatial_orientation",   label: "التوجه المكاني",      max: 5 },
  { key: "registration",          label: "التسجيل",            max: 3 },
  { key: "attention_calculation", label: "الانتباه والحساب",    max: 5 },
  { key: "recall",                label: "التذكر",             max: 3 },
  { key: "naming",                label: "التسمية",            max: 2 },
  { key: "repetition",            label: "التكرار",            max: 1 },
  { key: "three_stage_command",   label: "الأوامر الثلاثية",    max: 3 },
  { key: "reading",               label: "القراءة",            max: 1 },
  { key: "writing",               label: "الكتابة",            max: 1 },
  { key: "copying",               label: "النسخ",              max: 1 },
];

export function severityInfo(score: number) {
  if (score >= 24) return { text: "طبيعي", textClass: "text-green-600", ringClass: "border-green-400", bgClass: "bg-green-50" };
  if (score >= 18) return { text: "خفيف",  textClass: "text-amber-600", ringClass: "border-amber-400", bgClass: "bg-amber-50" };
  return              { text: "شديد",  textClass: "text-red-600",   ringClass: "border-red-400",   bgClass: "bg-red-50" };
}

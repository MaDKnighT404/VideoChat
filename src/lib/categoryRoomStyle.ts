import type { RoomCategory } from "@/types/videochat";

/** Визуальная тема категории комнат (Tailwind-классы). */
export const CATEGORY_VISUAL: Record<
  RoomCategory,
  {
    hint: string;
    sectionWrap: string;
    sectionTitleRow: string;
    iconWrap: string;
    titleAccent: string;
    subtitle: string;
    cardBorder: string;
    cardBorderHover: string;
    cardBg: string;
    progressFill: string;
    btn: string;
    btnHover: string;
    badge: string;
  }
> = {
  "video-audio": {
    hint: "До 2 человек — камера и микрофон",
    sectionWrap:
      "rounded-2xl border border-blue-500/20 bg-blue-950/35 p-6 sm:p-8",
    sectionTitleRow: "text-blue-100",
    iconWrap: "rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/30",
    titleAccent: "text-blue-200",
    subtitle: "text-blue-300/80",
    cardBorder: "border-blue-500/25",
    cardBorderHover: "hover:border-blue-400/45",
    cardBg: "bg-slate-900/60",
    progressFill: "bg-blue-500",
    btn: "bg-blue-600",
    btnHover: "hover:bg-blue-500",
    badge: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25",
  },
  "audio-only": {
    hint: "До 2 человек — только голос",
    sectionWrap:
      "rounded-2xl border border-violet-500/20 bg-violet-950/35 p-6 sm:p-8",
    sectionTitleRow: "text-violet-100",
    iconWrap: "rounded-xl bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/30",
    titleAccent: "text-violet-200",
    subtitle: "text-violet-300/80",
    cardBorder: "border-violet-500/25",
    cardBorderHover: "hover:border-violet-400/45",
    cardBg: "bg-slate-900/60",
    progressFill: "bg-violet-500",
    btn: "bg-violet-600",
    btnHover: "hover:bg-violet-500",
    badge: "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25",
  },
  "group-audio": {
    hint: "До 10 человек — групповой звонок",
    sectionWrap:
      "rounded-2xl border border-emerald-500/20 bg-emerald-950/35 p-6 sm:p-8",
    sectionTitleRow: "text-emerald-100",
    iconWrap: "rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30",
    titleAccent: "text-emerald-200",
    subtitle: "text-emerald-300/80",
    cardBorder: "border-emerald-500/25",
    cardBorderHover: "hover:border-emerald-400/45",
    cardBg: "bg-slate-900/60",
    progressFill: "bg-emerald-500",
    btn: "bg-emerald-600",
    btnHover: "hover:bg-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25",
  },
};

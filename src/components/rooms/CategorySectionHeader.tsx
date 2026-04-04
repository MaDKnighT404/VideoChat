import type { RoomCategory } from "@/types/videochat";
import { CATEGORY_LABELS } from "@/types/videochat";
import { CATEGORY_VISUAL } from "@/lib/categoryRoomStyle";

function CategoryIcon({ category }: { category: RoomCategory }) {
  const common = "h-6 w-6";
  if (category === "video-audio") {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (category === "audio-only") {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    );
  }
  return (
    <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

export function CategorySectionHeader({ category }: { category: RoomCategory }) {
  const v = CATEGORY_VISUAL[category];
  return (
    <div className={`mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${v.sectionTitleRow}`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center ${v.iconWrap}`}>
          <CategoryIcon category={category} />
        </div>
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${v.titleAccent}`}>
            {CATEGORY_LABELS[category]}
          </h2>
          <p className={`mt-1 max-w-xl text-sm ${v.subtitle}`}>{v.hint}</p>
        </div>
      </div>
      <span
        className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-medium sm:self-center ${v.badge}`}
      >
        {category === "group-audio" ? "Группа" : category === "audio-only" ? "1 на 1 · звук" : "1 на 1 · видео"}
      </span>
    </div>
  );
}

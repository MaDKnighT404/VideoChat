import { DEFAULT_QUALITY, type VideoQuality } from "@/constants/media";

export const DEVICE_PREFS_STORAGE_KEY = "device-prefs";

function parseVideoQuality(v: unknown): VideoQuality {
  if (v === "high" || v === "medium" || v === "low") return v;
  return DEFAULT_QUALITY;
}

export function readDevicePrefsFromStorage(): {
  camId: string;
  micId: string;
  videoQuality: VideoQuality;
} {
  if (typeof window === "undefined") {
    return { camId: "", micId: "", videoQuality: DEFAULT_QUALITY };
  }
  try {
    const raw = localStorage.getItem(DEVICE_PREFS_STORAGE_KEY);
    if (!raw) return { camId: "", micId: "", videoQuality: DEFAULT_QUALITY };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      camId: typeof parsed.camId === "string" ? parsed.camId : "",
      micId: typeof parsed.micId === "string" ? parsed.micId : "",
      videoQuality: parseVideoQuality(parsed.videoQuality),
    };
  } catch {
    return { camId: "", micId: "", videoQuality: DEFAULT_QUALITY };
  }
}

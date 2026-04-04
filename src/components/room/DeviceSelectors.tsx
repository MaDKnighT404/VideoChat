import type { ReactNode } from "react";
import { QUALITY_ORDER, QUALITY_PRESETS, type VideoQuality } from "@/constants/media";

interface DeviceSelectorsProps {
  cameras: MediaDeviceInfo[];
  mics: MediaDeviceInfo[];
  selCam: string;
  selMic: string;
  onSwitch: (kind: "cam" | "mic", deviceId: string) => void;
  showCamera?: boolean;
  videoQuality?: VideoQuality;
  onQualityChange?: (q: VideoQuality) => void;
  className?: string;
}

const selectCls =
  "rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-sm text-white outline-none focus:border-blue-500";

export function DeviceSelectors({
  cameras,
  mics,
  selCam,
  selMic,
  onSwitch,
  showCamera = true,
  videoQuality,
  onQualityChange,
  className = "mx-auto flex max-w-6xl flex-wrap justify-between items-center gap-4 text-sm",
}: DeviceSelectorsProps) {
  return (
    <div className={className}>
      {showCamera && (
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Камера:</span>
          <select
            value={selCam}
            onChange={(e) => onSwitch("cam", e.target.value)}
            className={selectCls}
          >
            {cameras.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Камера ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex items-center gap-2">
        <span className="text-slate-400">Микрофон:</span>
        <select
          value={selMic}
          onChange={(e) => onSwitch("mic", e.target.value)}
          className={selectCls}
        >
          {mics.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Микрофон ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
      {videoQuality !== undefined && onQualityChange && (
        <label className="flex items-center gap-2">
          <span className="text-slate-400">Качество видео:</span>
          <select
            value={videoQuality}
            onChange={(e) => onQualityChange(e.target.value as VideoQuality)}
            className={selectCls}
          >
            {QUALITY_ORDER.map((q) => (
              <option key={q} value={q}>
                {QUALITY_PRESETS[q].label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function DeviceSelectorsPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function CallControlsPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex justify-center border-t border-white/10 bg-black/55 px-4 py-4 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

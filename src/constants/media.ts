/** Размер буфера ScriptProcessorNode для захвата аудио. */
export const AUDIO_BUF_SIZE = 4096;

/** Интервал захвата и отправки видеокадров, мс. */
export const FRAME_MS = 100;

export type VideoQuality = "high" | "medium" | "low";

export interface QualityPreset {
  label: string;
  captureWidth: number;
  captureHeight: number;
  maxSendDim: number;
  jpegQuality: number;
}

export const QUALITY_PRESETS: Record<VideoQuality, QualityPreset> = {
  high: { label: "Высокое (1080p)", captureWidth: 1920, captureHeight: 1080, maxSendDim: 1080, jpegQuality: 0.85 },
  medium: { label: "Среднее (720p)", captureWidth: 1280, captureHeight: 720, maxSendDim: 720, jpegQuality: 0.7 },
  low: { label: "Низкое (480p)", captureWidth: 854, captureHeight: 480, maxSendDim: 480, jpegQuality: 0.55 },
};

export const QUALITY_ORDER: VideoQuality[] = ["low", "medium", "high"];

export const DEFAULT_QUALITY: VideoQuality = "medium";

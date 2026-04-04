import type { RefObject } from "react";

interface HiddenCaptureVideoProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

/** Скрытое видео для захвата кадров (не размонтировать при смене UI). */
export function HiddenCaptureVideo({ videoRef }: HiddenCaptureVideoProps) {
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{ position: "fixed", top: "-9999px", left: "-9999px", width: "1px", height: "1px" }}
    />
  );
}

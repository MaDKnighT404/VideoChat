"use client";

import { useRef, useCallback, useMemo, type RefObject } from "react";
import { FRAME_MS, MAX_SEND_DIM } from "@/constants/media";
import type { Socket } from "socket.io-client";

export function useVideoFrameSender(
  roomId: string,
  localVideoRef: RefObject<HTMLVideoElement | null>
) {
  const jpegQRef = useRef(0.85);
  const frameTimerRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const stop = useCallback(() => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = 0;
    }
  }, []);

  const start = useCallback(
    (socket: Socket) => {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
        canvasCtxRef.current = canvasRef.current.getContext("2d");
      }

      const cvs = canvasRef.current!;
      const ctx = canvasCtxRef.current!;
      let prevCW = 0;
      let prevCH = 0;

      stop();
      frameTimerRef.current = window.setInterval(() => {
        const video = localVideoRef.current;
        if (!video || video.readyState < 2) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw === 0 || vh === 0) return;

        const scale = Math.min(1, MAX_SEND_DIM / Math.max(vw, vh));
        const cw = Math.round(vw * scale);
        const ch = Math.round(vh * scale);

        if (cw !== prevCW || ch !== prevCH) {
          cvs.width = cw;
          cvs.height = ch;
          prevCW = cw;
          prevCH = ch;
        }

        ctx.drawImage(video, 0, 0, cw, ch);
        cvs.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              blob.arrayBuffer().then((buf) => {
                socket.emit("video-frame", { roomId, frame: buf });
              });
            }
          },
          "image/jpeg",
          jpegQRef.current
        );
      }, FRAME_MS);
    },
    [roomId, localVideoRef, stop]
  );

  return useMemo(() => ({ start, stop, jpegQRef }), [start, stop, jpegQRef]);
}

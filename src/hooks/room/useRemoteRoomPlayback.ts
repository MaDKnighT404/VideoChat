"use client";

import { useRef, useState, useCallback, useEffect, useMemo, type RefObject } from "react";
import type { AudioDataPayload } from "@/types/videochat";

export function useRemoteRoomPlayback(remoteImgRef: RefObject<HTMLImageElement | null>) {
  const [hasRemoteFrame, setHasRemoteFrame] = useState(false);
  const playCtxRef = useRef<AudioContext | null>(null);
  const nextPlayRef = useRef(0);
  const prevBlobUrlRef = useRef("");

  const ensurePlayContext = useCallback(() => {
    if (!playCtxRef.current) {
      playCtxRef.current = new AudioContext();
    }
    return playCtxRef.current;
  }, []);

  const handleVideoFrame = useCallback(
    (frame: ArrayBuffer) => {
      const blob = new Blob([frame], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = remoteImgRef.current;
      if (img) {
        img.src = url;
      }
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
      prevBlobUrlRef.current = url;
      setHasRemoteFrame(true);
    },
    [remoteImgRef]
  );

  const handleAudioData = useCallback(({ audio, sampleRate }: AudioDataPayload) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    let int16: Int16Array;
    if (audio instanceof ArrayBuffer) {
      int16 = new Int16Array(audio);
    } else {
      const u8 = audio as unknown as Uint8Array;
      int16 = new Int16Array(u8.buffer, u8.byteOffset, u8.byteLength / 2);
    }

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buf = ctx.createBuffer(1, float32.length, sampleRate);
    buf.getChannelData(0).set(float32);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    let t = nextPlayRef.current;
    if (t < now) t = now + 0.05;
    if (t - now > 1.0) t = now + 0.05;

    src.start(t);
    nextPlayRef.current = t + buf.duration;
  }, []);

  const softResetRemoteFrame = useCallback(() => {
    setHasRemoteFrame(false);
  }, []);

  const clearRemoteVideo = useCallback(() => {
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = "";
    }
    setHasRemoteFrame(false);
  }, []);

  const dispose = useCallback(() => {
    if (playCtxRef.current) {
      playCtxRef.current.close().catch(() => {});
      playCtxRef.current = null;
    }
    nextPlayRef.current = 0;
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = "";
    }
    setHasRemoteFrame(false);
  }, []);

  useEffect(() => {
    const resume = () => {
      playCtxRef.current?.resume().catch(() => {});
    };
    document.addEventListener("click", resume, { once: true });
    document.addEventListener("touchstart", resume, { once: true });
    return () => {
      document.removeEventListener("click", resume);
      document.removeEventListener("touchstart", resume);
    };
  }, []);

  const socketApi = useMemo(
    () => ({
      ensurePlayContext,
      handleVideoFrame,
      handleAudioData,
      softResetRemoteFrame,
      clearRemoteVideo,
      dispose,
    }),
    [
      ensurePlayContext,
      handleVideoFrame,
      handleAudioData,
      softResetRemoteFrame,
      clearRemoteVideo,
      dispose,
    ]
  );

  return { socketApi, hasRemoteFrame, playCtxRef };
}

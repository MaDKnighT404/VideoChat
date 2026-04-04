"use client";

import { useRef, useCallback, useMemo, type RefObject } from "react";
import { AUDIO_BUF_SIZE } from "@/constants/media";
import type { Socket } from "socket.io-client";

export function useRoomAudioCaptureSender(
  roomId: string,
  localStreamRef: RefObject<MediaStream | null>
) {
  const captureCtxRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const stop = useCallback(() => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
  }, []);

  const start = useCallback(
    (socket: Socket) => {
      const stream = localStreamRef.current;
      if (!stream || stream.getAudioTracks().length === 0) {
        console.log("[Audio] No audio tracks to send");
        return;
      }

      stop();

      const actx = new AudioContext();
      captureCtxRef.current = actx;

      const source = actx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
      const processor = actx.createScriptProcessor(AUDIO_BUF_SIZE, 1, 1);
      processorNodeRef.current = processor;

      const silentGain = actx.createGain();
      silentGain.gain.value = 0;
      gainNodeRef.current = silentGain;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(actx.destination);

      const sr = actx.sampleRate;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        socket.emit("audio-data", {
          roomId,
          audio: int16.buffer,
          sampleRate: sr,
        });
      };
      console.log("[Audio] Sending started, sampleRate:", sr);
    },
    [roomId, localStreamRef, stop]
  );

  return useMemo(() => ({ start, stop }), [start, stop]);
}

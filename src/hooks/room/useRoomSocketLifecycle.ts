"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { getSocket } from "@/lib/socket";
import { acquireRoomMediaStream } from "@/lib/media/acquireRoomMediaStream";
import type { ReadyToCallPayload } from "@/types/videochat";
import type { Socket } from "socket.io-client";

interface LocalMediaApi {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  localDisplayRef: RefObject<HTMLVideoElement | null>;
  attachStreamToElements: (stream: MediaStream) => void;
  syncDeviceIdsFromStream: (stream: MediaStream) => Promise<void>;
}

interface RemotePlaybackApi {
  ensurePlayContext: () => AudioContext;
  handleVideoFrame: (frame: ArrayBuffer) => void;
  handleAudioData: (p: { audio: ArrayBuffer; sampleRate: number }) => void;
  softResetRemoteFrame: () => void;
  clearRemoteVideo: () => void;
  dispose: () => void;
}

interface UseRoomSocketLifecycleArgs {
  roomId: string;
  username: string;
  hydrated: boolean;
  local: LocalMediaApi;
  startVideoSending: (socket: Socket) => void;
  stopVideoSending: () => void;
  startAudioSending: (socket: Socket) => void;
  stopAudioSending: () => void;
  remotePlayback: RemotePlaybackApi;
  setPartnerName: (name: string) => void;
  setWaiting: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setRemoteUiOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  socketRef: MutableRefObject<Socket | null>;
  sendingRef: MutableRefObject<boolean>;
  cleanupSession: () => void;
}

export function useRoomSocketLifecycle({
  roomId,
  username,
  hydrated,
  local,
  startVideoSending,
  stopVideoSending,
  startAudioSending,
  stopAudioSending,
  remotePlayback,
  setPartnerName,
  setWaiting,
  setConnected,
  setRemoteUiOpen,
  socketRef,
  sendingRef,
  cleanupSession,
}: UseRoomSocketLifecycleArgs) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !username || initRef.current) return;
    initRef.current = true;

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    remotePlayback.ensurePlayContext();

    async function init() {
      const stream = await acquireRoomMediaStream();
      local.attachStreamToElements(stream);
      await local.syncDeviceIdsFromStream(stream);

      socket.on("ready-to-call", ({ partnerName: partner }: ReadyToCallPayload) => {
        console.log("[Signal] ready-to-call, partner:", partner);
        setPartnerName(partner);
        setWaiting(false);
        setConnected(true);
        remotePlayback.softResetRemoteFrame();
        setRemoteUiOpen(false);

        sendingRef.current = true;
        startVideoSending(socket);
        startAudioSending(socket);
      });

      socket.on("video-frame", remotePlayback.handleVideoFrame);

      socket.on("audio-data", remotePlayback.handleAudioData);

      socket.on("user-left", () => {
        console.log("[Signal] user-left");
        setConnected(false);
        setWaiting(true);
        setPartnerName("");
        remotePlayback.clearRemoteVideo();
        setRemoteUiOpen(false);
        sendingRef.current = false;
        stopVideoSending();
        stopAudioSending();
      });

      socket.emit("join-room", { roomId, username });
      console.log("[Signal] Emitted join-room for", roomId);
    }

    init();

    return () => {
      initRef.current = false;
      socket.off("ready-to-call");
      socket.off("video-frame", remotePlayback.handleVideoFrame);
      socket.off("audio-data", remotePlayback.handleAudioData);
      socket.off("user-left");
      socket.emit("leave-room", { roomId });
      cleanupSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, username, roomId]);
}

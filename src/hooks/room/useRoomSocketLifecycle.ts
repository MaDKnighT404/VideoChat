"use client";

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { getSocket } from "@/lib/socket";
import { acquireRoomMediaStream } from "@/lib/media/acquireRoomMediaStream";
import { ensureMediaPermissions } from "@/lib/media/checkMediaPermissions";
import { reconcileDeviceStoreWithDevices } from "@/lib/reconcileDeviceIds";
import { useDeviceStore } from "@/store/useDeviceStore";
import type {
  RoomCategory,
  RoomInfoPayload,
  ReadyToCallPayload,
  ParticipantsUpdatePayload,
  RoomParticipant,
} from "@/types/videochat";
import type { StoredUser } from "@/store/useUserStore";
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
  user: StoredUser | null;
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
  setCategory: (c: RoomCategory) => void;
  setParticipants: (p: RoomParticipant[]) => void;
  socketRef: MutableRefObject<Socket | null>;
  sendingRef: MutableRefObject<boolean>;
  cleanupSession: () => void;
}

export function useRoomSocketLifecycle({
  roomId,
  user,
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
  setCategory,
  setParticipants,
  socketRef,
  sendingRef,
  cleanupSession,
}: UseRoomSocketLifecycleArgs) {
  const initRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !user?.username || !user?.id || initRef.current) return;
    const me = user;
    initRef.current = true;

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();

    remotePlayback.ensurePlayContext();

    async function init() {
      socket.emit("get-room-info", { roomId });
      const info = await new Promise<RoomInfoPayload>((resolve) => {
        socket.once("room-info", resolve);
      });

      const category = info.category;
      setCategory(category);

      const isVideoRoom = category === "video-audio";
      const isGroupRoom = category === "group-audio";
      const audioOnly = !isVideoRoom;

      await ensureMediaPermissions();
      const devs = await navigator.mediaDevices.enumerateDevices();
      reconcileDeviceStoreWithDevices(devs);
      const prefs = useDeviceStore.getState();
      const stream = await acquireRoomMediaStream(
        audioOnly ? undefined : prefs.camId || undefined,
        prefs.micId || undefined,
        audioOnly,
        prefs.videoQuality,
      );
      local.attachStreamToElements(stream);
      await local.syncDeviceIdsFromStream(stream);

      if (isGroupRoom) {
        setConnected(true);
        setWaiting(true);

        socket.on(
          "participants-update",
          ({ participants }: ParticipantsUpdatePayload) => {
            setParticipants(participants);
            const others = participants.filter((p) => p.id !== me.id);

            if (others.length > 0 && !sendingRef.current) {
              sendingRef.current = true;
              startAudioSending(socket);
              setWaiting(false);
            } else if (others.length === 0 && sendingRef.current) {
              sendingRef.current = false;
              stopAudioSending();
              setWaiting(true);
            } else if (others.length > 0) {
              setWaiting(false);
            }
          },
        );
      } else {
        socket.on(
          "ready-to-call",
          ({ partnerName: partner }: ReadyToCallPayload) => {
            console.log("[Signal] ready-to-call, partner:", partner);
            setPartnerName(partner);
            setWaiting(false);
            setConnected(true);
            remotePlayback.softResetRemoteFrame();
            setRemoteUiOpen(false);

            sendingRef.current = true;
            if (isVideoRoom) {
              startVideoSending(socket);
            }
            startAudioSending(socket);
          },
        );

        if (isVideoRoom) {
          socket.on("video-frame", remotePlayback.handleVideoFrame);
        }

        socket.on("user-left", () => {
          console.log("[Signal] user-left");
          setConnected(false);
          setWaiting(true);
          setPartnerName("");
          remotePlayback.clearRemoteVideo();
          setRemoteUiOpen(false);
          sendingRef.current = false;
          if (isVideoRoom) {
            stopVideoSending();
          }
          stopAudioSending();
        });
      }

      socket.on("audio-data", remotePlayback.handleAudioData);

      socket.emit("join-room", {
        roomId,
        username: me.username,
        userId: me.id,
      });
      console.log("[Signal] Emitted join-room for", roomId);
    }

    init();

    return () => {
      initRef.current = false;
      socket.off("ready-to-call");
      socket.off("video-frame", remotePlayback.handleVideoFrame);
      socket.off("audio-data", remotePlayback.handleAudioData);
      socket.off("user-left");
      socket.off("participants-update");
      socket.emit("leave-room", { roomId });
      cleanupSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, roomId]);
}

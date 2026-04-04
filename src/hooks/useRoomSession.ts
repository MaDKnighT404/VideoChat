"use client";

import { useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { acquireRoomMediaStream } from "@/lib/media/acquireRoomMediaStream";
import { reconcileDeviceStoreWithDevices } from "@/lib/reconcileDeviceIds";
import { useDeviceStore } from "@/store/useDeviceStore";
import { useRedirectWhenNoUsername } from "@/hooks/room/useRedirectWhenNoUsername";
import { useLocalRoomMedia } from "@/hooks/room/useLocalRoomMedia";
import { useRemoteRoomPlayback } from "@/hooks/room/useRemoteRoomPlayback";
import { useVideoFrameSender } from "@/hooks/room/useVideoFrameSender";
import { useRoomAudioCaptureSender } from "@/hooks/room/useRoomAudioCaptureSender";
import { useRoomSocketLifecycle } from "@/hooks/room/useRoomSocketLifecycle";
import type { RoomSessionRouter } from "@/hooks/room/types";
import type { StoredUser } from "@/store/useUserStore";
import type { VideoQuality } from "@/constants/media";
import type { RoomCategory, RoomParticipant } from "@/types/videochat";

interface UseRoomSessionArgs {
  roomId: string;
  user: StoredUser | null;
  hydrated: boolean;
  router: RoomSessionRouter;
}

export function useRoomSession({ roomId, user, hydrated, router }: UseRoomSessionArgs) {
  useRedirectWhenNoUsername(hydrated, user, router);

  const [partnerName, setPartnerName] = useState("");
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [remoteUiOpen, setRemoteUiOpen] = useState(false);
  const [category, setCategory] = useState<RoomCategory | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);

  const remoteImgRef = useRef<HTMLImageElement>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const sendingRef = useRef(false);

  const hasVideo = category === "video-audio";
  const isGroup = category === "group-audio";

  const local = useLocalRoomMedia(connected);
  const {
    selCam,
    selMic,
    setSelCam,
    setSelMic,
    attachStreamToElements,
    localStreamRef,
    localVideoRef,
    localDisplayRef,
    stopTracks,
    toggleMic,
    toggleCam,
    micOn,
    camOn,
    devices,
    syncDeviceIdsFromStream,
  } = local;

  const { socketApi: remoteSocketApi, hasRemoteFrame } = useRemoteRoomPlayback(remoteImgRef);
  const video = useVideoFrameSender(roomId, localVideoRef);
  const audio = useRoomAudioCaptureSender(roomId, localStreamRef);

  const cleanupSession = useCallback(() => {
    video.stop();
    audio.stop();
    remoteSocketApi.dispose();
    stopTracks();
  }, [video, audio, remoteSocketApi, stopTracks]);

  useRoomSocketLifecycle({
    roomId,
    user,
    hydrated,
    local: {
      localVideoRef,
      localDisplayRef,
      attachStreamToElements,
      syncDeviceIdsFromStream,
    },
    startVideoSending: video.start,
    stopVideoSending: video.stop,
    startAudioSending: audio.start,
    stopAudioSending: audio.stop,
    remotePlayback: remoteSocketApi,
    setPartnerName,
    setWaiting,
    setConnected,
    setRemoteUiOpen,
    setCategory,
    setParticipants,
    socketRef,
    sendingRef,
    cleanupSession,
  });

  const switchDevice = useCallback(
    async (kind: "cam" | "mic", deviceId: string) => {
      const store = useDeviceStore.getState();
      if (kind === "cam") {
        setSelCam(deviceId);
        store.setCamId(deviceId);
      } else {
        setSelMic(deviceId);
        store.setMicId(deviceId);
      }

      const devs = await navigator.mediaDevices.enumerateDevices();
      reconcileDeviceStoreWithDevices(devs);
      const p = useDeviceStore.getState();
      setSelCam(p.camId);
      setSelMic(p.micId);

      const newCam = kind === "cam" ? deviceId : p.camId;
      const newMic = kind === "mic" ? deviceId : p.micId;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await acquireRoomMediaStream(newCam, newMic, !hasVideo, p.videoQuality);
      attachStreamToElements(stream);

      if (sendingRef.current && socketRef.current) {
        video.stop();
        audio.stop();
        if (hasVideo) {
          video.start(socketRef.current);
        }
        audio.start(socketRef.current);
      }
    },
    [setSelCam, setSelMic, attachStreamToElements, localStreamRef, video, audio, hasVideo],
  );

  const switchQuality = useCallback(
    async (q: VideoQuality) => {
      const store = useDeviceStore.getState();
      store.setVideoQuality(q);

      if (!hasVideo) return;

      const devs = await navigator.mediaDevices.enumerateDevices();
      reconcileDeviceStoreWithDevices(devs);
      const p = useDeviceStore.getState();
      setSelCam(p.camId);
      setSelMic(p.micId);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await acquireRoomMediaStream(p.camId || undefined, p.micId || undefined, false, q);
      attachStreamToElements(stream);

      if (sendingRef.current && socketRef.current) {
        video.stop();
        video.start(socketRef.current);
      }
    },
    [setSelCam, setSelMic, attachStreamToElements, localStreamRef, video, hasVideo],
  );

  const videoQuality = useDeviceStore((s) => s.videoQuality);

  const handleLeave = useCallback(() => {
    const socket = getSocket();
    socket.emit("leave-room", { roomId });
    cleanupSession();
    router.push("/rooms");
  }, [roomId, cleanupSession, router]);

  const cameras = devices.filter((d) => d.kind === "videoinput");
  const mics = devices.filter((d) => d.kind === "audioinput");

  return {
    category,
    hasVideo,
    isGroup,
    partnerName,
    connected,
    waiting,
    micOn,
    camOn,
    hasRemoteFrame,
    remoteUiOpen,
    setRemoteUiOpen,
    participants,
    cameras,
    mics,
    selCam,
    selMic,
    inCall: connected,
    localVideoRef,
    localDisplayRef,
    remoteImgRef,
    switchDevice,
    switchQuality,
    videoQuality,
    handleLeave,
    toggleMic,
    toggleCam,
  };
}

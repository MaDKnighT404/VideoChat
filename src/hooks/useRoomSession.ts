"use client";

import { useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { acquireRoomMediaStream } from "@/lib/media/acquireRoomMediaStream";
import { useRedirectWhenNoUsername } from "@/hooks/room/useRedirectWhenNoUsername";
import { useLocalRoomMedia } from "@/hooks/room/useLocalRoomMedia";
import { useRemoteRoomPlayback } from "@/hooks/room/useRemoteRoomPlayback";
import { useVideoFrameSender } from "@/hooks/room/useVideoFrameSender";
import { useRoomAudioCaptureSender } from "@/hooks/room/useRoomAudioCaptureSender";
import { useRoomSocketLifecycle } from "@/hooks/room/useRoomSocketLifecycle";
import type { RoomSessionRouter } from "@/hooks/room/types";
import type { StoredUser } from "@/store/useUserStore";

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

  const remoteImgRef = useRef<HTMLImageElement>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const sendingRef = useRef(false);

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
    socketRef,
    sendingRef,
    cleanupSession,
  });

  const switchDevice = useCallback(
    async (kind: "cam" | "mic", deviceId: string) => {
      if (kind === "cam") setSelCam(deviceId);
      else setSelMic(deviceId);

      const newCam = kind === "cam" ? deviceId : selCam;
      const newMic = kind === "mic" ? deviceId : selMic;

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await acquireRoomMediaStream(newCam, newMic);
      attachStreamToElements(stream);

      if (sendingRef.current && socketRef.current) {
        video.stop();
        audio.stop();
        video.start(socketRef.current);
        audio.start(socketRef.current);
      }
    },
    [selCam, selMic, setSelCam, setSelMic, attachStreamToElements, localStreamRef, video, audio]
  );

  const handleLeave = useCallback(() => {
    const socket = getSocket();
    socket.emit("leave-room", { roomId });
    cleanupSession();
    router.push("/rooms");
  }, [roomId, cleanupSession, router]);

  const cameras = devices.filter((d) => d.kind === "videoinput");
  const mics = devices.filter((d) => d.kind === "audioinput");

  return {
    partnerName,
    connected,
    waiting,
    micOn,
    camOn,
    hasRemoteFrame,
    remoteUiOpen,
    setRemoteUiOpen,
    cameras,
    mics,
    selCam,
    selMic,
    inCall: connected,
    localVideoRef,
    localDisplayRef,
    remoteImgRef,
    switchDevice,
    handleLeave,
    toggleMic,
    toggleCam,
  };
}

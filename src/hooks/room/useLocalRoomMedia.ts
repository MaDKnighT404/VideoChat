"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export function useLocalRoomMedia(inCall: boolean) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selCam, setSelCam] = useState("");
  const [selMic, setSelMic] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localDisplayRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices);
  }, []);

  const attachStreamToElements = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    if (localDisplayRef.current) localDisplayRef.current.srcObject = stream;
  }, []);

  const syncDeviceIdsFromStream = useCallback(async (stream: MediaStream) => {
    const devs = await navigator.mediaDevices.enumerateDevices();
    setDevices(devs);

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    if (audioTracks.length > 0) {
      const label = audioTracks[0].label;
      const match = devs.find((d) => d.kind === "audioinput" && d.label === label);
      if (match) setSelMic(match.deviceId);
    }
    if (videoTracks.length > 0) {
      const label = videoTracks[0].label;
      const match = devs.find((d) => d.kind === "videoinput" && d.label === label);
      if (match) setSelCam(match.deviceId);
    }
  }, []);

  const stopTracks = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setMicOn((p) => !p);
    }
  }, []);

  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setCamOn((p) => !p);
    }
  }, []);

  useEffect(() => {
    if (!inCall && localDisplayRef.current && localStreamRef.current) {
      localDisplayRef.current.srcObject = localStreamRef.current;
    }
  }, [inCall]);

  return {
    localVideoRef,
    localDisplayRef,
    localStreamRef,
    devices,
    selCam,
    selMic,
    setSelCam,
    setSelMic,
    micOn,
    camOn,
    attachStreamToElements,
    syncDeviceIdsFromStream,
    stopTracks,
    toggleMic,
    toggleCam,
  };
}

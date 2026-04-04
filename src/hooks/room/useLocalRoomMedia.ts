"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { reconcileDeviceStoreWithDevices } from "@/lib/reconcileDeviceIds";
import { useDeviceStore } from "@/store/useDeviceStore";

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
    const run = async () => {
      const devs = await navigator.mediaDevices.enumerateDevices();
      reconcileDeviceStoreWithDevices(devs);
      setDevices(devs);
      const p = useDeviceStore.getState();
      setSelCam(p.camId);
      setSelMic(p.micId);
    };
    void run();
    const onDeviceChange = () => void run();
    navigator.mediaDevices.addEventListener("devicechange", onDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onDeviceChange);
  }, []);

  const attachStreamToElements = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    if (localDisplayRef.current) localDisplayRef.current.srcObject = stream;
  }, []);

  const syncDeviceIdsFromStream = useCallback(async (stream: MediaStream) => {
    const devs = await navigator.mediaDevices.enumerateDevices();
    setDevices(devs);

    const store = useDeviceStore.getState();
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    if (audioTracks.length > 0) {
      const label = audioTracks[0].label;
      const match = devs.find((d) => d.kind === "audioinput" && d.label === label);
      if (match) {
        setSelMic(match.deviceId);
        if (!store.micId) store.setMicId(match.deviceId);
      }
    }
    if (videoTracks.length > 0) {
      const label = videoTracks[0].label;
      const match = devs.find((d) => d.kind === "videoinput" && d.label === label);
      if (match) {
        setSelCam(match.deviceId);
        if (!store.camId) store.setCamId(match.deviceId);
      }
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
    if (localDisplayRef.current && localStreamRef.current) {
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

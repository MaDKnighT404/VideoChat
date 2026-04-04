"use client";

import { useState, useEffect, useCallback } from "react";
import { useDeviceStore } from "@/store/useDeviceStore";
import type { VideoQuality } from "@/constants/media";
import { reconcileDeviceStoreWithDevices } from "@/lib/reconcileDeviceIds";
import { ensureMediaPermissions } from "@/lib/media/checkMediaPermissions";

export function useDeviceEnumerator() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permitted, setPermitted] = useState(false);
  const { camId, micId, setCamId, setMicId, videoQuality, setVideoQuality, hydrate } =
    useDeviceStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const refresh = () => {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        reconcileDeviceStoreWithDevices(devs);
        setDevices(devs);
        const hasLabels = devs.some((d) => d.label);
        setPermitted(hasLabels);
      });
    };
    refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, []);

  const requestPermission = useCallback(async () => {
    const ok = await ensureMediaPermissions();
    if (!ok) return;

    const devs = await navigator.mediaDevices.enumerateDevices();
    reconcileDeviceStoreWithDevices(devs);
    setDevices(devs);
    setPermitted(true);
  }, []);

  const switchDevice = useCallback(
    (kind: "cam" | "mic", deviceId: string) => {
      if (kind === "cam") setCamId(deviceId);
      else setMicId(deviceId);
    },
    [setCamId, setMicId],
  );

  const cameras = devices.filter((d) => d.kind === "videoinput");
  const mics = devices.filter((d) => d.kind === "audioinput");

  return {
    cameras,
    mics,
    camId,
    micId,
    switchDevice,
    permitted,
    requestPermission,
    videoQuality,
    setVideoQuality,
  };
}

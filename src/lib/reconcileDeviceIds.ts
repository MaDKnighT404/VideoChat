import { useDeviceStore } from "@/store/useDeviceStore";

/** Если сохранённый id есть в списке — оставляем; иначе первое устройство; пустой список → "". */
export function pickDeviceId(savedId: string, devices: MediaDeviceInfo[]): string {
  if (devices.length === 0) return "";
  if (savedId && devices.some((d) => d.deviceId === savedId)) return savedId;
  return devices[0].deviceId;
}

/** Приводит camId/micId в сторе к реально доступным устройствам и пересохраняет в localStorage при изменении. */
export function reconcileDeviceStoreWithDevices(devs: MediaDeviceInfo[]) {
  const cams = devs.filter((d) => d.kind === "videoinput");
  const mics = devs.filter((d) => d.kind === "audioinput");
  const s = useDeviceStore.getState();

  const cam = pickDeviceId(s.camId, cams);
  if (cam !== s.camId) s.setCamId(cam);

  const mic = pickDeviceId(s.micId, mics);
  if (mic !== s.micId) s.setMicId(mic);
}

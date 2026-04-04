import { useDeviceStore } from "@/store/useDeviceStore";

function hasRealIds(devices: MediaDeviceInfo[]): boolean {
  return devices.some((d) => d.deviceId !== "" && d.deviceId !== "default");
}

function pickId(savedId: string, devices: MediaDeviceInfo[]): string {
  if (devices.length === 0) return "";
  if (savedId && devices.some((d) => d.deviceId === savedId)) return savedId;
  return devices[0].deviceId;
}

/**
 * Приводит camId / micId в сторе к реально доступным устройствам.
 * Ничего не делает, пока браузер не вернул настоящие deviceId
 * (до разрешения камеры/микрофона они все пустые).
 */
export function reconcileDeviceStoreWithDevices(devs: MediaDeviceInfo[]) {
  const cams = devs.filter((d) => d.kind === "videoinput");
  const mics = devs.filter((d) => d.kind === "audioinput");

  const s = useDeviceStore.getState();

  if (hasRealIds(cams)) {
    const cam = pickId(s.camId, cams);
    if (cam !== s.camId) s.setCamId(cam);
  }

  if (hasRealIds(mics)) {
    const mic = pickId(s.micId, mics);
    if (mic !== s.micId) s.setMicId(mic);
  }
}

import { QUALITY_PRESETS, DEFAULT_QUALITY, type VideoQuality } from "@/constants/media";

export async function acquireRoomMediaStream(
  camId?: string,
  micId?: string,
  audioOnly?: boolean,
  quality?: VideoQuality,
): Promise<MediaStream> {
  if (audioOnly) {
    const audioC: MediaTrackConstraints | boolean = micId
      ? { deviceId: { exact: micId } }
      : true;
    try {
      return await navigator.mediaDevices.getUserMedia({ video: false, audio: audioC });
    } catch {
      return new MediaStream();
    }
  }

  const preset = QUALITY_PRESETS[quality ?? DEFAULT_QUALITY];

  const videoC: MediaTrackConstraints = {
    width: { ideal: preset.captureWidth },
    height: { ideal: preset.captureHeight },
  };
  if (camId) videoC.deviceId = { exact: camId };

  const audioC: MediaTrackConstraints | boolean = micId ? { deviceId: { exact: micId } } : true;

  try {
    return await navigator.mediaDevices.getUserMedia({ video: videoC, audio: audioC });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: videoC, audio: false });
    } catch {
      return new MediaStream();
    }
  }
}

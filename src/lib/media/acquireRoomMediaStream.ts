import { QUALITY_PRESETS, DEFAULT_QUALITY, type VideoQuality } from "@/constants/media";

export async function acquireRoomMediaStream(
  camId?: string,
  micId?: string,
  audioOnly?: boolean,
  quality?: VideoQuality,
): Promise<MediaStream> {
  const audioC: MediaTrackConstraints | boolean = micId
    ? { deviceId: { ideal: micId } }
    : true;

  if (audioOnly) {
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
  if (camId) videoC.deviceId = { ideal: camId };

  // 1. video + audio
  try {
    return await navigator.mediaDevices.getUserMedia({ video: videoC, audio: audioC });
  } catch { /* camera or mic unavailable, try narrower requests */ }

  // 2. video only (no mic)
  try {
    const videoOnly = await navigator.mediaDevices.getUserMedia({ video: videoC, audio: false });
    // also try to grab audio separately and merge
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioC });
      for (const t of audioOnly.getAudioTracks()) videoOnly.addTrack(t);
    } catch { /* no mic available */ }
    return videoOnly;
  } catch { /* no camera at all */ }

  // 3. audio only (no camera at all)
  try {
    return await navigator.mediaDevices.getUserMedia({ video: false, audio: audioC });
  } catch { /* nothing available */ }

  return new MediaStream();
}

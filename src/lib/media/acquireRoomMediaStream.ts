import { VIDEO_IDEAL_HEIGHT, VIDEO_IDEAL_WIDTH } from "@/constants/media";

export async function acquireRoomMediaStream(
  camId?: string,
  micId?: string
): Promise<MediaStream> {
  const videoC: MediaTrackConstraints = {
    width: { ideal: VIDEO_IDEAL_WIDTH },
    height: { ideal: VIDEO_IDEAL_HEIGHT },
  };
  if (camId) videoC.deviceId = { exact: camId };

  const audioC: MediaTrackConstraints | boolean = micId ? { deviceId: { exact: micId } } : true;

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoC,
      audio: audioC,
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoC,
        audio: false,
      });
    } catch {
      return new MediaStream();
    }
  }
}

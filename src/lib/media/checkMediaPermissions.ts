/**
 * Returns true if media permissions are already granted
 * (enumerateDevices returns devices with labels).
 */
export async function hasMediaPermissions(): Promise<boolean> {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.some((d) => d.label !== "");
  } catch {
    return false;
  }
}

/**
 * Ensures media permissions are granted. If not yet granted,
 * requests them via getUserMedia. Returns true if granted.
 */
export async function ensureMediaPermissions(): Promise<boolean> {
  if (await hasMediaPermissions()) return true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }
}

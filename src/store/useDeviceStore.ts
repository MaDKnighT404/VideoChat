import { create } from "zustand";
import type { VideoQuality } from "@/constants/media";
import {
  readDevicePrefsFromStorage,
  DEVICE_PREFS_STORAGE_KEY,
} from "@/store/readDevicePrefsFromStorage";

interface DevicePrefsState {
  camId: string;
  micId: string;
  videoQuality: VideoQuality;
  setCamId: (id: string) => void;
  setMicId: (id: string) => void;
  setVideoQuality: (q: VideoQuality) => void;
  hydrate: () => void;
}

const initialFromStorage = readDevicePrefsFromStorage();

function persist(camId: string, micId: string, videoQuality: VideoQuality) {
  try {
    localStorage.setItem(
      DEVICE_PREFS_STORAGE_KEY,
      JSON.stringify({ camId, micId, videoQuality }),
    );
  } catch {
    /* quota / SSR */
  }
}

export const useDeviceStore = create<DevicePrefsState>((set, get) => ({
  camId: initialFromStorage.camId,
  micId: initialFromStorage.micId,
  videoQuality: initialFromStorage.videoQuality,

  setCamId: (id) => {
    set({ camId: id });
    persist(id, get().micId, get().videoQuality);
  },

  setMicId: (id) => {
    set({ micId: id });
    persist(get().camId, id, get().videoQuality);
  },

  setVideoQuality: (q) => {
    set({ videoQuality: q });
    persist(get().camId, get().micId, q);
  },

  hydrate: () => {
    const next = readDevicePrefsFromStorage();
    set({
      camId: next.camId,
      micId: next.micId,
      videoQuality: next.videoQuality,
    });
  },
}));

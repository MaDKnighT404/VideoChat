import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "user";
const LEGACY_USERNAME_KEY = "Username";

export interface StoredUser {
  id: string;
  username: string;
}

interface UserState {
  user: StoredUser | null;
  setUsername: (name: string) => void;
  logout: () => void;
  hydrate: () => void;
}

function persistUser(user: StoredUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,

  setUsername: (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const prev = get().user;
    const id = prev?.id ?? uuidv4();
    const user: StoredUser = { id, username: trimmed };
    persistUser(user);
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_USERNAME_KEY);
    set({ user: null });
  },

  hydrate: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredUser>;
        if (typeof parsed.username === "string" && parsed.username) {
          const id =
            typeof parsed.id === "string" && parsed.id.length > 0 ? parsed.id : uuidv4();
          const user: StoredUser = { id, username: parsed.username };
          if (!parsed.id) persistUser(user);
          set({ user });
          return;
        }
      } catch {
        /* ignore */
      }
    }

    const legacy = localStorage.getItem(LEGACY_USERNAME_KEY);
    if (legacy) {
      const user: StoredUser = { id: uuidv4(), username: legacy };
      persistUser(user);
      localStorage.removeItem(LEGACY_USERNAME_KEY);
      set({ user });
    }
  },
}));

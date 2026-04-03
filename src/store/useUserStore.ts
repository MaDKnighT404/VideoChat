import { create } from "zustand";

interface UserState {
  username: string;
  setUsername: (name: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  username: "",

  setUsername: (name: string) => {
    localStorage.setItem("Username", name);
    set({ username: name });
  },

  logout: () => {
    localStorage.removeItem("Username");
    set({ username: "" });
  },

  hydrate: () => {
    const saved = localStorage.getItem("Username");
    if (saved) {
      set({ username: saved });
    }
  },
}));

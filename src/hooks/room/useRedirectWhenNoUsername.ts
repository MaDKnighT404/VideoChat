"use client";

import { useEffect } from "react";
import type { StoredUser } from "@/store/useUserStore";
import type { RoomSessionRouter } from "./types";

export function useRedirectWhenNoUsername(
  hydrated: boolean,
  user: StoredUser | null,
  router: RoomSessionRouter
) {
  useEffect(() => {
    if (hydrated && !user?.username) router.replace("/");
  }, [hydrated, user, router]);
}

"use client";

import { useEffect } from "react";
import type { RoomSessionRouter } from "./types";

export function useRedirectWhenNoUsername(
  hydrated: boolean,
  username: string,
  router: RoomSessionRouter
) {
  useEffect(() => {
    if (hydrated && !username) router.replace("/");
  }, [hydrated, username, router]);
}

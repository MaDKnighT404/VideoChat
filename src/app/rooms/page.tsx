"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { getSocket } from "@/lib/socket";
import type { RoomInfo } from "@/types/videochat";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RoomsHeader } from "@/components/rooms/RoomsHeader";
import { RoomCard } from "@/components/rooms/RoomCard";

export default function RoomsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const hydrate = useUserStore((s) => s.hydrate);
  const username = user?.username ?? "";
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    queueMicrotask(() => setHydrated(true));
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !username) {
      router.replace("/");
    }
  }, [hydrated, username, router]);

  useEffect(() => {
    if (!username) return;

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.on("rooms-update", (data: RoomInfo[]) => {
      setRooms(data);
    });

    socket.emit("get-rooms");

    return () => {
      socket.off("rooms-update");
    };
  }, [user?.id, username]);

  const handleJoin = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room && room.userCount >= 2) return;
    router.push(`/room/${roomId}`);
  };

  const handleLogout = () => {
    const socket = getSocket();
    socket.disconnect();
    logout();
    router.replace("/");
  };

  if (!hydrated || !username) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <RoomsHeader username={username} onLogout={handleLogout} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        <h2 className="mb-8 text-2xl font-bold">Комнаты</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onJoin={handleJoin} />
          ))}
        </div>
      </main>
    </div>
  );
}

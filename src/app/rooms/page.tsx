"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { getSocket } from "@/lib/socket";

interface RoomInfo {
  id: string;
  name: string;
  userCount: number;
  users: string[];
}

function getStatusLabel(count: number) {
  if (count === 0) return { text: "Свободна", color: "bg-emerald-500", textColor: "text-emerald-400" };
  if (count === 1) return { text: "Ожидание", color: "bg-amber-500", textColor: "text-amber-400" };
  return { text: "Занято", color: "bg-red-500", textColor: "text-red-400" };
}

export default function RoomsPage() {
  const router = useRouter();
  const { username, logout, hydrate } = useUserStore();
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
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
  }, [username]);

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
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold">VideoChat</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-300">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
        <h2 className="mb-8 text-2xl font-bold">Комнаты</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const status = getStatusLabel(room.userCount);
            const isFull = room.userCount >= 2;

            return (
              <div
                key={room.id}
                className="group rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800/80"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{room.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
                    <span className={`text-sm font-medium ${status.textColor}`}>
                      {status.text}
                    </span>
                  </div>
                </div>

                <div className="mb-6 text-sm text-slate-400">
                  {room.userCount === 0 && "Нет участников"}
                  {room.userCount === 1 && (
                    <span>
                      В комнате: <span className="text-slate-300">{room.users[0]}</span>
                    </span>
                  )}
                  {room.userCount === 2 && (
                    <span>
                      В комнате:{" "}
                      <span className="text-slate-300">
                        {room.users[0]} и {room.users[1]}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {room.userCount}/2
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        room.userCount === 0
                          ? "w-0"
                          : room.userCount === 1
                            ? "w-1/2 bg-amber-500"
                            : "w-full bg-red-500"
                      }`}
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleJoin(room.id)}
                  disabled={isFull}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {isFull ? "Комната занята" : "Присоединиться"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { getSocket } from "@/lib/socket";
import type { RoomInfo } from "@/types/videochat";
import { CATEGORY_ORDER } from "@/types/videochat";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RoomsHeader } from "@/components/rooms/RoomsHeader";
import { RoomCard } from "@/components/rooms/RoomCard";
import { CategorySectionHeader } from "@/components/rooms/CategorySectionHeader";
import { CATEGORY_VISUAL } from "@/lib/categoryRoomStyle";
import { DeviceSelectors } from "@/components/room/DeviceSelectors";
import { useDeviceEnumerator } from "@/hooks/useDeviceEnumerator";

/** Сколько карточек комнат показывать в каждой категории на главной. */
const MAX_ROOMS_PER_CATEGORY = 2;

export default function RoomsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const hydrate = useUserStore((s) => s.hydrate);
  const username = user?.username ?? "";
  const [rooms, setRooms] = useState<RoomInfo[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const {
    cameras,
    mics,
    camId,
    micId,
    switchDevice,
    permitted,
    requestPermission,
    videoQuality,
    setVideoQuality,
  } = useDeviceEnumerator();

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

    const handler = (data: RoomInfo[]) => {
      setRooms(data);
    };

    socket.on("rooms-update", handler);
    socket.emit("get-rooms");

    return () => {
      socket.off("rooms-update", handler);
    };
  }, [user?.id, username]);

  const handleJoin = (roomId: string) => {
    if (!permitted) return;
    const room = rooms?.find((r) => r.id === roomId);
    if (room && room.userCount >= room.maxUsers) return;
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

  const loading = rooms === null;

  return (
    <div className="flex flex-1 flex-col">
      <RoomsHeader username={username} onLogout={handleLogout} />

      <div className="border-b border-slate-700 bg-slate-800/30 py-4">
        <div className="mx-auto max-w-6xl px-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Настройки устройств</h3>
          {permitted ? (
            <DeviceSelectors
              cameras={cameras}
              mics={mics}
              selCam={camId}
              selMic={micId}
              onSwitch={switchDevice}
              showCamera
              videoQuality={videoQuality}
              onQualityChange={setVideoQuality}
            />
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-400">
                Разрешите доступ к устройствам, чтобы выбрать камеру и микрофон
              </p>
              <button
                type="button"
                onClick={requestPermission}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition-all hover:bg-blue-500"
              >
                Разрешить
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <main className="mx-auto flex w-full max-w-6xl flex-col px-6 py-10 pb-16">
          {CATEGORY_ORDER.map((cat) => {
            const catRooms = rooms
              .filter((r) => r.category === cat)
              .slice(0, MAX_ROOMS_PER_CATEGORY);
            if (catRooms.length === 0) return null;

            const catStyle = CATEGORY_VISUAL[cat];
            return (
              <section key={cat} className={`mb-10 last:mb-0 ${catStyle.sectionWrap}`}>
                <CategorySectionHeader category={cat} />
                <div className="grid gap-6 sm:grid-cols-2">
                  {catRooms.map((room) => (
                    <RoomCard key={room.id} room={room} onJoin={handleJoin} disabled={!permitted} />
                  ))}
                </div>
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}

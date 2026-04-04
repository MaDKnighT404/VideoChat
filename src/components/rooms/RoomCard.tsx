import type { RoomInfo } from "@/types/videochat";
import { getRoomStatusLabel } from "@/lib/roomListStatus";

interface RoomCardProps {
  room: RoomInfo;
  onJoin: (roomId: string) => void;
}

function ParticipantNames({ users }: { users: RoomInfo["users"] }) {
  if (users.length === 0) return null;
  return (
    <span className="text-slate-300">
      {users.map((u, i) => (
        <span key={u.id}>
          {i > 0 && (users.length === 2 && i === 1 ? " и " : ", ")}
          {u.username}
        </span>
      ))}
    </span>
  );
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const status = getRoomStatusLabel(room.userCount);
  const isFull = room.userCount >= 2;

  return (
    <div className="group rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800/80">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
          <span className={`text-sm font-medium ${status.textColor}`}>{status.text}</span>
        </div>
      </div>

      <div className="mb-6 text-sm text-slate-400">
        {room.userCount === 0 && "Нет участников"}
        {room.userCount >= 1 && (
          <span>
            В комнате: <ParticipantNames users={room.users} />
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{room.userCount}/2</span>
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
        type="button"
        onClick={() => onJoin(room.id)}
        disabled={isFull}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {isFull ? "Комната занята" : "Присоединиться"}
      </button>
    </div>
  );
}

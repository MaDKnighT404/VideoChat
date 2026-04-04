import type { RoomInfo } from "@/types/videochat";
import { getRoomStatusLabel } from "@/lib/roomListStatus";
import { CATEGORY_VISUAL } from "@/lib/categoryRoomStyle";

interface RoomCardProps {
  room: RoomInfo;
  onJoin: (roomId: string) => void;
}

function ParticipantNames({ users, max }: { users: RoomInfo["users"]; max: number }) {
  if (users.length === 0) return null;
  const shown = users.slice(0, 3);
  const rest = users.length - shown.length;
  return (
    <span className="text-slate-300">
      {shown.map((u, i) => (
        <span key={u.id}>
          {i > 0 && ", "}
          {u.username}
        </span>
      ))}
      {rest > 0 && <span className="text-slate-500"> +{rest}</span>}
    </span>
  );
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const v = CATEGORY_VISUAL[room.category];
  const status = getRoomStatusLabel(room.userCount, room.maxUsers);
  const isFull = room.userCount >= room.maxUsers;
  const fillPercent = room.maxUsers > 0 ? (room.userCount / room.maxUsers) * 100 : 0;

  return (
    <div
      className={`group rounded-2xl border p-6 backdrop-blur-sm transition-all ${v.cardBorder} ${v.cardBorderHover} ${v.cardBg} hover:shadow-lg`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{room.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
          <span className={`text-sm font-medium ${status.textColor}`}>{status.text}</span>
        </div>
      </div>

      <div className="mb-6 text-sm text-slate-400">
        {room.userCount === 0 ? (
          "Нет участников"
        ) : (
          <span>
            В комнате: <ParticipantNames users={room.users} max={room.maxUsers} />
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">
          {room.userCount}/{room.maxUsers}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-slate-700/80">
          <div
            className={`h-full rounded-full transition-all ${v.progressFill}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onJoin(room.id)}
        disabled={isFull}
        className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-30 ${v.btn} ${v.btnHover}`}
      >
        {isFull ? "Комната занята" : "Присоединиться"}
      </button>
    </div>
  );
}

import type { ReactNode } from "react";
import type { RoomParticipant } from "@/types/videochat";

interface GroupAudioStageProps {
  userId: string;
  participants: RoomParticipant[];
  waiting: boolean;
  callControls: ReactNode;
}

export function GroupAudioStage({
  userId,
  participants,
  waiting,
  callControls,
}: GroupAudioStageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <p className="mb-1 text-sm text-slate-400">
          {participants.length}{" "}
          {participants.length === 1
            ? "участник"
            : participants.length < 5
            ? "участника"
            : "участников"}
        </p>
        {waiting && <p className="text-xs text-amber-400">Ожидание других участников...</p>}
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {participants.map((p) => {
          const isMe = p.id === userId;
          return (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
                  isMe
                    ? "bg-blue-600/30 text-blue-400 ring-2 ring-blue-500/50"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {p.username.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-40 truncate text-sm text-slate-300">
                {isMe ? `${p.username} (Вы)` : p.username}
              </span>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
              <svg
                className="h-10 w-10 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-sm text-slate-500">Пусто</span>
          </div>
        )}
      </div>

      {callControls}
    </div>
  );
}

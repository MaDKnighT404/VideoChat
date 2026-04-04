import type { RefObject, ReactNode } from "react";
import { RemoteWaitingPlaceholder } from "./RemoteWaitingPlaceholder";

interface RoomLobbyProps {
  username: string;
  partnerName: string;
  connected: boolean;
  waiting: boolean;
  hasRemoteFrame: boolean;
  hasVideo: boolean;
  localDisplayRef: RefObject<HTMLVideoElement | null>;
  remoteImgRef: RefObject<HTMLImageElement | null>;
  callControls: ReactNode;
}

export function RoomLobby({
  username,
  partnerName,
  connected,
  waiting,
  hasRemoteFrame,
  hasVideo,
  localDisplayRef,
  remoteImgRef,
  callControls,
}: RoomLobbyProps) {
  return (
    <>
      <div className={`grid w-full max-w-5xl gap-6 ${hasVideo ? "md:grid-cols-2" : "md:grid-cols-1 max-w-xl"}`}>
        {hasVideo && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            <video
              ref={localDisplayRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
              {username} (Вы)
            </div>
          </div>
        )}

        {hasVideo ? (
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={remoteImgRef}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
            {(!connected || !hasRemoteFrame) && (
              <RemoteWaitingPlaceholder waiting={waiting} overlayClassName="bg-slate-800" />
            )}
            {partnerName && connected && hasRemoteFrame && (
              <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
                {partnerName}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800 py-12">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-400">
              {waiting ? "Ожидание собеседника..." : partnerName || "Подключение..."}
            </p>
          </div>
        )}
      </div>

      {callControls}
    </>
  );
}

import type { RefObject } from "react";
import type { ReactNode } from "react";
import { RemoteWaitingPlaceholder } from "./RemoteWaitingPlaceholder";

interface RoomLobbyProps {
  username: string;
  partnerName: string;
  connected: boolean;
  waiting: boolean;
  hasRemoteFrame: boolean;
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
  localDisplayRef,
  remoteImgRef,
  callControls,
}: RoomLobbyProps) {
  return (
    <>
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
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
      </div>

      {callControls}
    </>
  );
}

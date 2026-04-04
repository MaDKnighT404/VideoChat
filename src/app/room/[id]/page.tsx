"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useRoomSession } from "@/hooks/useRoomSession";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RoomHeader } from "@/components/room/RoomHeader";
import { DeviceSelectors } from "@/components/room/DeviceSelectors";
import { CallControls } from "@/components/room/CallControls";
import { HiddenCaptureVideo } from "@/components/room/HiddenCaptureVideo";
import { RoomLobby } from "@/components/room/RoomLobby";
import { RoomCallStage } from "@/components/room/RoomCallStage";

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const user = useUserStore((s) => s.user);
  const hydrate = useUserStore((s) => s.hydrate);
  const username = user?.username ?? "";

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    queueMicrotask(() => setHydrated(true));
  }, [hydrate]);

  const session = useRoomSession({ roomId, user, hydrated, router });

  const {
    partnerName,
    connected,
    waiting,
    micOn,
    camOn,
    hasRemoteFrame,
    remoteUiOpen,
    setRemoteUiOpen,
    cameras,
    mics,
    selCam,
    selMic,
    inCall,
    localVideoRef,
    localDisplayRef,
    remoteImgRef,
    switchDevice,
    handleLeave,
    toggleMic,
    toggleCam,
  } = session;

  if (!hydrated || !username) {
    return <LoadingScreen />;
  }

  const deviceSelectors = (
    <DeviceSelectors
      cameras={cameras}
      mics={mics}
      selCam={selCam}
      selMic={selMic}
      onSwitch={switchDevice}
    />
  );

  const callControls = (
    <CallControls
      micOn={micOn}
      camOn={camOn}
      onToggleMic={toggleMic}
      onToggleCam={toggleCam}
      onLeave={handleLeave}
    />
  );

  return (
    <div className="flex flex-1 flex-col">
      <RoomHeader
        roomId={roomId}
        partnerName={partnerName}
        connected={connected}
        waiting={waiting}
        onBack={handleLeave}
      />

      {!inCall && (
        <div className="border-b border-slate-700 bg-slate-800/30 px-6 py-2">{deviceSelectors}</div>
      )}

      <HiddenCaptureVideo videoRef={localVideoRef} />

      <main
        className={
          inCall
            ? "relative min-h-0 flex-1 overflow-hidden bg-black"
            : "flex flex-1 flex-col items-center justify-center gap-6 p-6"
        }
      >
        {inCall ? (
          <RoomCallStage
            partnerName={partnerName}
            waiting={waiting}
            hasRemoteFrame={hasRemoteFrame}
            remoteUiOpen={remoteUiOpen}
            onToggleRemoteUi={() => setRemoteUiOpen((o) => !o)}
            remoteImgRef={remoteImgRef}
            deviceSelectors={deviceSelectors}
            callControls={callControls}
          />
        ) : (
          <RoomLobby
            username={username}
            partnerName={partnerName}
            connected={connected}
            waiting={waiting}
            hasRemoteFrame={hasRemoteFrame}
            localDisplayRef={localDisplayRef}
            remoteImgRef={remoteImgRef}
            callControls={callControls}
          />
        )}
      </main>
    </div>
  );
}

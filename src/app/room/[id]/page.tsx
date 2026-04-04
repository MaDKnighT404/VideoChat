"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUserStore } from "@/store/useUserStore";
import { useRoomSession } from "@/hooks/useRoomSession";
import { LoadingScreen } from "@/components/LoadingScreen";
import { RoomHeader } from "@/components/room/RoomHeader";
import { CallControls } from "@/components/room/CallControls";
import { HiddenCaptureVideo } from "@/components/room/HiddenCaptureVideo";
import { RoomLobby } from "@/components/room/RoomLobby";
import { RoomCallStage } from "@/components/room/RoomCallStage";
import { AudioCallStage } from "@/components/room/AudioCallStage";
import { GroupAudioStage } from "@/components/room/GroupAudioStage";

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
    category,
    hasVideo,
    isGroup,
    partnerName,
    connected,
    waiting,
    micOn,
    camOn,
    hasRemoteFrame,
    remoteUiOpen,
    setRemoteUiOpen,
    participants,
    inCall,
    localVideoRef,
    localDisplayRef,
    remoteImgRef,
    handleLeave,
    toggleMic,
    toggleCam,
  } = session;

  if (!hydrated || !username) {
    return <LoadingScreen />;
  }

  if (!category) {
    return <LoadingScreen />;
  }

  const callControls = (
    <CallControls
      micOn={micOn}
      camOn={camOn}
      onToggleMic={toggleMic}
      onToggleCam={toggleCam}
      onLeave={handleLeave}
      showCamToggle={hasVideo}
    />
  );

  function renderMain() {
    if (isGroup) {
      return (
        <GroupAudioStage
          userId={user!.id}
          participants={participants}
          waiting={waiting}
          callControls={callControls}
        />
      );
    }

    if (inCall) {
      if (hasVideo) {
        return (
          <RoomCallStage
            partnerName={partnerName}
            waiting={waiting}
            hasRemoteFrame={hasRemoteFrame}
            remoteUiOpen={remoteUiOpen}
            onToggleRemoteUi={() => setRemoteUiOpen((o) => !o)}
            remoteImgRef={remoteImgRef}
            localDisplayRef={localDisplayRef}
            callControls={callControls}
          />
        );
      }
      return (
        <AudioCallStage
          partnerName={partnerName}
          callControls={callControls}
        />
      );
    }

    return (
      <RoomLobby
        username={username}
        partnerName={partnerName}
        connected={connected}
        waiting={waiting}
        hasRemoteFrame={hasRemoteFrame}
        hasVideo={hasVideo}
        localDisplayRef={localDisplayRef}
        remoteImgRef={remoteImgRef}
        callControls={callControls}
      />
    );
  }

  const isFullscreenVideo = inCall && hasVideo && !isGroup;

  return (
    <div className="flex flex-1 flex-col">
      <RoomHeader
        roomId={roomId}
        partnerName={partnerName}
        connected={connected}
        waiting={waiting}
        isGroup={isGroup}
        participants={participants}
        onBack={handleLeave}
      />

      {hasVideo && <HiddenCaptureVideo videoRef={localVideoRef} />}

      <main
        className={
          isFullscreenVideo
            ? "relative min-h-0 flex-1 overflow-hidden bg-black"
            : "flex flex-1 flex-col items-center justify-center gap-6 p-6"
        }
      >
        {renderMain()}
      </main>
    </div>
  );
}

import type { RefObject } from "react";
import type { ReactNode } from "react";
import { RemoteWaitingPlaceholder } from "./RemoteWaitingPlaceholder";
import { CallControlsPanel, DeviceSelectorsPanel } from "./DeviceSelectors";

interface RoomCallStageProps {
  partnerName: string;
  waiting: boolean;
  hasRemoteFrame: boolean;
  remoteUiOpen: boolean;
  onToggleRemoteUi: () => void;
  remoteImgRef: RefObject<HTMLImageElement | null>;
  deviceSelectors: ReactNode;
  callControls: ReactNode;
}

export function RoomCallStage({
  partnerName,
  waiting,
  hasRemoteFrame,
  remoteUiOpen,
  onToggleRemoteUi,
  remoteImgRef,
  deviceSelectors,
  callControls,
}: RoomCallStageProps) {
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black outline-none"
        onClick={onToggleRemoteUi}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleRemoteUi();
          }
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={remoteImgRef} alt="" className="max-h-full max-w-full object-contain" />
        {remoteUiOpen && (
          <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
        )}
        {!hasRemoteFrame && <RemoteWaitingPlaceholder waiting={waiting} />}
        {partnerName && hasRemoteFrame && !remoteUiOpen && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg bg-black/60 px-3 py-1 text-sm backdrop-blur-sm">
            {partnerName}
          </div>
        )}
      </div>

      {remoteUiOpen && (
        <>
          <DeviceSelectorsPanel>{deviceSelectors}</DeviceSelectorsPanel>
          <CallControlsPanel>{callControls}</CallControlsPanel>
        </>
      )}
    </>
  );
}

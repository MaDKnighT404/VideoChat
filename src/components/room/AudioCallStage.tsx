import type { ReactNode } from "react";

interface AudioCallStageProps {
  partnerName: string;
  callControls: ReactNode;
  deviceSelectors: ReactNode;
}

export function AudioCallStage({
  partnerName,
  callControls,
  deviceSelectors,
}: AudioCallStageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-600/20 text-4xl font-bold text-blue-400">
          {partnerName.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-semibold">{partnerName}</p>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Аудиозвонок
        </span>
      </div>
      <div className="w-full max-w-md">{deviceSelectors}</div>
      {callControls}
    </div>
  );
}

interface RoomHeaderProps {
  roomId: string;
  partnerName: string;
  connected: boolean;
  waiting: boolean;
  onBack: () => void;
}

export function RoomHeader({
  roomId,
  partnerName,
  connected,
  waiting,
  onBack,
}: RoomHeaderProps) {
  return (
    <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 transition-all hover:border-slate-500 hover:bg-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold">Комната {roomId}</h1>
            {partnerName && <p className="text-xs text-slate-400">Собеседник: {partnerName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Подключено
            </span>
          )}
          {!connected && !waiting && (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              Подключение...
            </span>
          )}
          {waiting && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Ожидание...
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

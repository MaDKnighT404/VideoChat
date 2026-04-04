interface RemoteWaitingPlaceholderProps {
  waiting: boolean;
  /** Класс фона контейнера оверлея */
  overlayClassName?: string;
}

export function RemoteWaitingPlaceholder({
  waiting,
  overlayClassName = "bg-slate-900/90",
}: RemoteWaitingPlaceholderProps) {
  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center ${overlayClassName}`}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-700">
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
        <p className="text-sm text-slate-500">
          {waiting ? "Ожидание собеседника..." : "Подключение..."}
        </p>
      </div>
    </div>
  );
}

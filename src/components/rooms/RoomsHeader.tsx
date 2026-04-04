interface RoomsHeaderProps {
  username: string;
  onLogout: () => void;
}

export function RoomsHeader({ username, onLogout }: RoomsHeaderProps) {
  return (
    <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="text-lg font-bold">VideoChat</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-300">{username}</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

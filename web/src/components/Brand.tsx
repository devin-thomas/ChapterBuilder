export function Brand() {
  return (
    <div className="brand" aria-label="ChapterBuilder by VidChopper">
      <svg className="brand__mark" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="brand-gradient" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a78bfa" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="15" fill="#0c1324" />
        <path d="M12 16h40v10H12z" fill="#f8fafc" />
        <path d="M12 16l8-8h10l-8 8zm20 0 8-8h10l-8 8z" fill="url(#brand-gradient)" />
        <rect x="12" y="29" width="40" height="25" rx="5" fill="url(#brand-gradient)" />
        <path d="M26 35v13l13-6.5z" fill="#fff" />
      </svg>
      <div>
        <strong>ChapterBuilder</strong>
        <span>by VidChopper</span>
      </div>
    </div>
  );
}

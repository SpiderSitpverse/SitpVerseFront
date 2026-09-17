export function LiveBadge({ label = "LIVE FEED" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-status-danger/10 px-3 py-2 text-xs font-semibold tracking-wide text-status-danger ring-1 ring-inset ring-status-danger/25">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-danger/70" />
        <span className="relative inline-flex size-2 rounded-full bg-status-danger" />
      </span>
      {label}
    </span>
  );
}

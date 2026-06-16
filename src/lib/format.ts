export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Tailwind classes for a colored status pill. */
export function statusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-500/15 text-green-400 border-green-500/30";
    case "in_progress":
    case "dialing":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "queued":
    case "pending":
    case "running":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "busy":
    case "no-answer":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "failed":
    case "canceled":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
  }
}

export function prettyStatus(status: string): string {
  return status.replace(/_/g, " ");
}

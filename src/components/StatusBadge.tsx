import { prettyStatus, statusColor } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusColor(
        status,
      )}`}
    >
      {prettyStatus(status)}
    </span>
  );
}

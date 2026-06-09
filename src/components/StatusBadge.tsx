import {
  STATUS_COLORS,
  STATUS_LABELS,
  type ProjectStatus,
} from "@/types/project";

type Props = {
  status: ProjectStatus;
};

export default function StatusBadge({ status }: Props) {
  const colors = STATUS_COLORS[status];
  const isLive = status === "live";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {isLive && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ProjectProgressBar({
  progress,
  label,
}: {
  progress: number;
  label?: string;
}) {
  const value = Math.min(100, Math.max(0, progress));

  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex justify-between gap-2 text-xs text-muted">
          <span>{label}</span>
          <span aria-hidden="true">{value}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Project progress"}
      >
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${String(value)}%` }}
        />
      </div>
    </div>
  );
}

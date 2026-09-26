export function ButtonSpinner({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "size-3 border" : "size-4 border-2";
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent ${dim} ${className}`.trim()}
      aria-hidden
    />
  );
}

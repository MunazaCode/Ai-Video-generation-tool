import type { ReactNode } from "react";

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-foreground"
      >
        {children}
      </label>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

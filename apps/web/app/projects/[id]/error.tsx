"use client";

import Link from "next/link";

export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isApiDown =
    error.name === "ApiConnectionError" ||
    error.message.includes("Cannot reach the API");

  return (
    <section className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-surface p-6">
      <h1 className="text-lg font-semibold text-foreground">
        {isApiDown ? "API not reachable" : "Something went wrong"}
      </h1>
      <p className="text-sm text-muted">{error.message}</p>
      {isApiDown ? (
        <p className="text-sm text-muted">
          From the repo root, run{" "}
          <code className="text-foreground">pnpm dev:api</code> in one terminal and{" "}
          <code className="text-foreground">pnpm dev:worker</code> in another. Confirm{" "}
          <code className="text-foreground">POLLINATIONS_API_KEY</code> is set in the
          root <code className="text-foreground">.env</code>.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent"
        >
          Try again
        </button>
        <Link
          href="/projects"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent"
        >
          Back to projects
        </Link>
      </div>
    </section>
  );
}

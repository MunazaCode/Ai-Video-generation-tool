"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingButtonLabel } from "@/components/ui/loading-button-label";
import { fetchFromApi } from "@/lib/fetch-api";

export function ResumeGenerationButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleResume() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetchFromApi(`/api/projects/${projectId}/resume`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { code?: string; message: string };
      };
      if (!res.ok || !json.success) {
        setState("error");
        const code = json.error?.code;
        if (code === "GENERATION_IN_PROGRESS") {
          setMessage(
            "Jobs are already queued. Run pnpm dev:worker in a terminal and wait for progress to update.",
          );
        } else {
          setMessage(json.error?.message ?? "Could not resume generation");
        }
        return;
      }
      setState("idle");
      setMessage(
        "Generation queued. Ensure pnpm dev:worker is running with POLLINATIONS_API_KEY in .env.",
      );
      router.refresh();
    } catch {
      setState("error");
      setMessage("Could not reach the API");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled === true || state === "loading"}
        aria-busy={state === "loading"}
        onClick={() => {
          void handleResume();
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-60"
      >
        <LoadingButtonLabel loading={state === "loading"} loadingText="Resuming…">
          Retry / resume generation
        </LoadingButtonLabel>
      </button>
      {message ? (
        <p role="alert" className="text-sm text-red-300">
          {message}
        </p>
      ) : (
        <p className="text-xs text-muted">
          Continues from completed scenes; only missing jobs are enqueued.
        </p>
      )}
    </div>
  );
}

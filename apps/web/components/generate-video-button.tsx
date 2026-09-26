"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingButtonLabel } from "@/components/ui/loading-button-label";
import { fetchFromApi } from "@/lib/fetch-api";

export function GenerateVideoButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetchFromApi(`/api/projects/${projectId}/generate`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: { code?: string; message: string };
      };
      if (!res.ok || !json.success) {
        setState("error");
        setMessage(json.error?.message ?? "Could not start generation");
        return;
      }
      setState("idle");
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
          void handleGenerate();
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <LoadingButtonLabel loading={state === "loading"} loadingText="Starting…">
          Generate video
        </LoadingButtonLabel>
      </button>
      {message ? (
        <p role="alert" className="text-sm text-red-300">
          {message}
        </p>
      ) : (
        <p className="text-xs text-muted">
          Requires the worker (`pnpm dev:worker`) and FFmpeg for a playable MP4.
        </p>
      )}
    </div>
  );
}

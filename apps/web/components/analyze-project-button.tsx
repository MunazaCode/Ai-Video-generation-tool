"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingButtonLabel } from "@/components/ui/loading-button-label";
import { getPublicApiBaseUrl } from "@/lib/api-config";

export function AnalyzeProjectButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleAnalyze() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch(
        `${getPublicApiBaseUrl()}/api/projects/${projectId}/analyze`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setState("error");
        setMessage(json.error?.message ?? "Analysis failed");
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
          void handleAnalyze();
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        <LoadingButtonLabel loading={state === "loading"} loadingText="Analyzing…">
          Analyze script
        </LoadingButtonLabel>
      </button>
      {message ? (
        <p role="alert" className="text-sm text-red-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}

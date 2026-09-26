"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingButtonLabel } from "@/components/ui/loading-button-label";
import { getPublicApiBaseUrl } from "@/lib/api-config";

export function CancelGenerationButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleCancel() {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch(
        `${getPublicApiBaseUrl()}/api/projects/${projectId}/cancel`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setState("error");
        setMessage(json.error?.message ?? "Cancel failed");
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
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled === true || state === "loading"}
        aria-busy={state === "loading"}
        onClick={() => {
          void handleCancel();
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-500/10 disabled:opacity-60"
      >
        <LoadingButtonLabel loading={state === "loading"} loadingText="Cancelling…">
          Cancel generation
        </LoadingButtonLabel>
      </button>
      {message ? (
        <p role="alert" className="text-xs text-red-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}

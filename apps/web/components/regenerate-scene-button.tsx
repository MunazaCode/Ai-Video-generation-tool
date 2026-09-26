"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingButtonLabel } from "@/components/ui/loading-button-label";
import { getPublicApiBaseUrl } from "@/lib/api-config";

export function RegenerateSceneButton({
  projectId,
  sceneId,
  sceneLabel,
}: {
  projectId: string;
  sceneId: string;
  sceneLabel: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${getPublicApiBaseUrl()}/api/projects/${projectId}/scenes/${sceneId}/regenerate`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        success: boolean;
        error?: { message: string };
      };
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Regeneration failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={loading}
        aria-busy={loading}
        onClick={() => {
          void handleRegenerate();
        }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-60"
        aria-label={`Regenerate scene ${sceneLabel}`}
      >
        <LoadingButtonLabel
          loading={loading}
          loadingText="Queuing…"
          spinnerSize="sm"
        >
          Regenerate
        </LoadingButtonLabel>
      </button>
      {error ? (
        <span className="max-w-[12rem] text-right text-xs text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ProjectDto } from "../lib/api-types";
import {
  PROJECT_LIST_POLL_MS,
  projectsNeedLiveRefresh,
} from "../lib/generation-status";
import { listProjects } from "../lib/projects-api";
import { ProjectListRow } from "./project-list-row";
import { LoadingButtonLabel } from "./ui/loading-button-label";

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setState("loading");
    }
    const result = await listProjects();
    if (!result.success) {
      setState("error");
      setError(result.error.message);
      return;
    }
    setProjects(result.data.projects);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const liveRefresh = projectsNeedLiveRefresh(projects);

  useEffect(() => {
    if (!liveRefresh) {
      return;
    }

    const timer = setInterval(() => {
      void load(true);
    }, PROJECT_LIST_POLL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [liveRefresh, load]);

  if (state === "loading" && projects.length === 0) {
    return (
      <p className="text-muted" role="status" aria-live="polite">
        Loading projects…
      </p>
    );
  }

  if (state === "error") {
    return (
      <div
        role="alert"
        className="space-y-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm"
      >
        <p>{error ?? "Could not load projects."}</p>
        <button
          type="button"
          disabled={retryBusy}
          aria-busy={retryBusy}
          onClick={() => {
            setRetryBusy(true);
            void load().finally(() => {
              setRetryBusy(false);
            });
          }}
          className="inline-flex items-center gap-2 rounded-md bg-background px-3 py-2 text-foreground underline-offset-2 hover:underline disabled:opacity-60"
        >
          <LoadingButtonLabel loading={retryBusy} loadingText="Retrying…">
            Retry
          </LoadingButtonLabel>
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-muted">No projects yet.</p>
        <Link
          href="/create"
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Create your first video
        </Link>
      </div>
    );
  }

  const sorted = [...projects].sort((a, b) => {
    const aLive = projectsNeedLiveRefresh([a]);
    const bLive = projectsNeedLiveRefresh([b]);
    if (aLive !== bLive) {
      return aLive ? -1 : 1;
    }
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {sorted.map((project) => (
        <li key={project.id}>
          <ProjectListRow project={project} />
        </li>
      ))}
    </ul>
  );
}

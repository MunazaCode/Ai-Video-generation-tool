"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ProjectDto } from "@/lib/api-types";
import {
  PROJECT_LIST_POLL_MS,
  projectsNeedLiveRefresh,
} from "@/lib/generation-status";
import { listProjects } from "@/lib/projects-api";
import { ProjectListRow } from "@/components/project-list-row";

export function DashboardActiveProjects() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    const result = await listProjects();
    if (!result.success) {
      setState("error");
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
      void load();
    }, PROJECT_LIST_POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [liveRefresh, load]);

  if (state === "loading") {
    return (
      <p className="text-sm text-muted" role="status">
        Loading recent projects…
      </p>
    );
  }

  if (state === "error") {
    return (
      <p className="text-sm text-muted">
        Could not load projects.{" "}
        <Link href="/projects" className="text-accent hover:underline">
          Open projects
        </Link>
      </p>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted">No projects yet.</p>
        <Link
          href="/create"
          className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
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

  const visible = sorted.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Recent projects</h2>
        <Link href="/projects" className="text-xs text-accent hover:underline">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {visible.map((project) => (
          <li key={project.id}>
            <ProjectListRow project={project} />
          </li>
        ))}
      </ul>
      {projectsNeedLiveRefresh(projects) ? (
        <p className="text-xs text-muted" role="status" aria-live="polite">
          Live refresh while generation jobs are running.
        </p>
      ) : null}
    </div>
  );
}

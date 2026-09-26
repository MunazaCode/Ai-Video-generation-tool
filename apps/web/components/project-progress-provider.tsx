"use client";

import { ProjectStatus, type ProjectStatus as ProjectStatusType } from "@asv/shared";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PROJECT_DETAIL_POLL_MS } from "@/lib/generation-status";
import {
  fetchProjectProgress,
  type ProjectProgressPayload,
} from "@/lib/progress-api";

type ProgressContextValue = {
  status: ProjectStatusType;
  progress: number;
  summary: ProjectProgressPayload["summary"] | null;
  sceneAssets: ProjectProgressPayload["sceneAssets"] | null;
  finalVideoReady: boolean;
  assemblyNote: string | null;
};

const ProjectProgressContext = createContext<ProgressContextValue | null>(null);

export function useProjectProgressLive(): ProgressContextValue {
  const ctx = useContext(ProjectProgressContext);
  if (!ctx) {
    throw new Error("useProjectProgressLive must be used within ProjectProgressProvider");
  }
  return ctx;
}

export function ProjectProgressProvider({
  projectId,
  initialStatus,
  initialProgress,
  children,
}: {
  projectId: string;
  initialStatus: ProjectStatusType;
  initialProgress: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const lastRefreshedStatus = useRef(initialStatus);
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [summary, setSummary] = useState<ProgressContextValue["summary"]>(null);
  const [sceneAssets, setSceneAssets] =
    useState<ProgressContextValue["sceneAssets"]>(null);
  const [finalVideoReady, setFinalVideoReady] = useState(false);
  const [assemblyNote, setAssemblyNote] = useState<string | null>(null);

  useEffect(() => {
    setStatus(initialStatus);
    setProgress(initialProgress);
    lastRefreshedStatus.current = initialStatus;
  }, [initialStatus, initialProgress]);

  useEffect(() => {
    if (
      (status === ProjectStatus.COMPLETED && finalVideoReady) ||
      status === ProjectStatus.FAILED ||
      status === ProjectStatus.CANCELLED
    ) {
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const json = await fetchProjectProgress(projectId);
        if (!json.success || cancelled) {
          return;
        }
        const nextStatus = json.data.project.status;
        const nextProgress = json.data.project.progress;
        setStatus(nextStatus);
        setProgress(nextProgress);
        setSummary(json.data.summary);
        setSceneAssets(json.data.sceneAssets ?? null);
        setFinalVideoReady(json.data.finalVideoReady === true);
        setAssemblyNote(json.data.assemblyNote ?? null);

        if (json.data.finalVideoReady && nextStatus === ProjectStatus.COMPLETED) {
          router.refresh();
        }

        if (
          nextStatus === ProjectStatus.COMPLETED ||
          nextStatus === ProjectStatus.FAILED ||
          nextStatus === ProjectStatus.CANCELLED
        ) {
          router.refresh();
        } else if (nextStatus !== lastRefreshedStatus.current) {
          lastRefreshedStatus.current = nextStatus;
          router.refresh();
        }
      } catch {
        /* ignore transient network errors while polling */
      }
    }

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, PROJECT_DETAIL_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId, router, status, finalVideoReady]);

  const value = useMemo(
    () => ({
      status,
      progress,
      summary,
      sceneAssets,
      finalVideoReady,
      assemblyNote,
    }),
    [status, progress, summary, sceneAssets, finalVideoReady, assemblyNote],
  );

  return (
    <ProjectProgressContext.Provider value={value}>
      {children}
    </ProjectProgressContext.Provider>
  );
}

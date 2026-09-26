"use client";

import { ProjectStatus } from "@asv/shared";
import Link from "next/link";
import { ProjectProgressBar } from "@/components/ui/project-progress-bar";
import { getPublicApiBaseUrl } from "@/lib/api-config";
import { shouldPollGenerationProgress } from "@/lib/generation-status";
import { formatProjectStatusLabel } from "@/lib/project-actions";
import { useProjectProgressLive } from "./project-progress-provider";

export function ProjectPipelinePanel({
  projectId,
  subtitlesEnabled,
  subtitleLanguage,
}: {
  projectId: string;
  subtitlesEnabled: boolean;
  subtitleLanguage: string;
}) {
  const { status, progress, summary, sceneAssets, finalVideoReady, assemblyNote } =
    useProjectProgressLive();

  const apiBase = getPublicApiBaseUrl();
  const videoSrc = `${apiBase}/api/projects/${projectId}/video`;
  const downloadHref = `${apiBase}/api/projects/${projectId}/download`;
  const vttSrc = `${apiBase}/api/projects/${projectId}/subtitles/vtt`;

  if (status === ProjectStatus.COMPLETED || finalVideoReady) {
    return (
      <div
        id="project-video"
        className="space-y-4 rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Final video</h2>
          <Link
            href={downloadHref}
            className="text-sm font-medium text-accent hover:underline"
          >
            Download MP4
          </Link>
        </div>
        <p className="text-xs text-muted">
          Real mode generates AI video clips per scene (text-to-video) and assembles them
          with narration. Set <code className="text-foreground">MOCK_AI=false</code>,{" "}
          <code className="text-foreground">VIDEO_PROVIDER=pollinations</code> (or{" "}
          <code className="text-foreground">wan</code>/<code className="text-foreground">local-http</code>
          ), and <code className="text-foreground">POLLINATIONS_API_KEY</code> when using
          Pollinations video.
        </p>
        <video
          className="aspect-video w-full rounded-lg bg-black"
          controls
          preload="metadata"
          src={videoSrc}
        >
          {subtitlesEnabled ? (
            <track
              kind="captions"
              src={vttSrc}
              srcLang={subtitleLanguage}
              label="Narration"
              default
            />
          ) : null}
        </video>
        {subtitlesEnabled ? (
          <p className="text-xs text-muted">
            Captions:{" "}
            <a href={vttSrc} className="text-accent hover:underline">
              WebVTT
            </a>
            {" · "}
            <a
              href={`${apiBase}/api/projects/${projectId}/subtitles/srt`}
              className="text-accent hover:underline"
            >
              SRT
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  if (!shouldPollGenerationProgress(status) && status !== ProjectStatus.GENERATING_STORYBOARD) {
    return assemblyNote ? (
      <div
        role="alert"
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
      >
        {assemblyNote}
      </div>
    ) : null;
  }

  return (
    <div
      id="project-generation"
      className="space-y-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">Generation</span>
        <span className="text-muted">
          {formatProjectStatusLabel(status)} · {progress}%
        </span>
      </div>
      <ProjectProgressBar progress={progress} />
      {summary ? (
        <p className="text-xs text-muted">
          Jobs: {summary.completed}/{summary.total} done
          {summary.running > 0 ? ` · ${String(summary.running)} running` : ""}
          {summary.queued > 0 ? ` · ${String(summary.queued)} queued` : ""}
          {summary.failed > 0 ? ` · ${String(summary.failed)} failed` : ""}
        </p>
      ) : null}
      {sceneAssets && sceneAssets.total > 0 ? (
        <p className="text-xs text-muted">
          Scenes: {sceneAssets.imagesComplete}/{sceneAssets.total} images ·{" "}
          {sceneAssets.videosComplete}/{sceneAssets.total} video ·{" "}
          {sceneAssets.audioComplete}/{sceneAssets.total} audio
        </p>
      ) : null}
      {shouldPollGenerationProgress(status) ? (
        <p className="text-xs text-muted">
          When assembly finishes, the <strong className="text-foreground">Final video</strong>{" "}
          player appears in this section (scroll below the action buttons if needed).
        </p>
      ) : null}
      {assemblyNote ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
        >
          {assemblyNote}
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectActionButtons } from "@/components/project-action-buttons";
import { RegenerateSceneButton } from "@/components/regenerate-scene-button";
import { ProjectLiveHeader } from "@/components/project-live-header";
import { ProjectPipelinePanel } from "@/components/project-pipeline-panel";
import { ProjectProgressProvider } from "@/components/project-progress-provider";
import { canRegenerateSceneUi } from "@/lib/generation-status";
import { fetchFromApi } from "@/lib/fetch-api";
import type { ApiResponse, ProjectDto } from "@/lib/api-types";
import { listProjectScenes } from "@/lib/scenes-api";
import { ProjectStatus } from "@asv/shared";

async function fetchProject(id: string): Promise<ProjectDto | null> {
  const res = await fetchFromApi(`/api/projects/${id}`, { cache: "no-store" });
  if (res.status === 404) {
    return null;
  }
  const json = (await res.json()) as ApiResponse<ProjectDto>;
  if (!json.success) {
    return null;
  }
  return json.data;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await fetchProject(id);
  if (!project) {
    notFound();
  }
  const scenesResult = await listProjectScenes(id);
  const plannedScenes = scenesResult.success ? scenesResult.data.scenes : [];

  return (
    <section className="space-y-6">
      <div>
        <Link href="/projects" className="text-sm text-muted hover:text-accent">
          ← Back to projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {project.title}
        </h1>
      </div>

      <ProjectProgressProvider
        projectId={project.id}
        initialStatus={project.status}
        initialProgress={project.progress}
      >
        <ProjectLiveHeader />
        <div className="mt-6">
          <ProjectPipelinePanel
            projectId={project.id}
            subtitlesEnabled={project.subtitleSettings.enabled}
            subtitleLanguage={project.language}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium text-foreground">Settings</h2>
          <dl className="mt-3 space-y-2 text-sm text-muted">
            <div className="flex justify-between gap-4">
              <dt>Duration</dt>
              <dd className="text-foreground">
                {Math.round(project.targetDurationSec / 60)} min
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Aspect ratio</dt>
              <dd className="text-foreground">{project.aspectRatio}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Style</dt>
              <dd className="text-foreground">{project.visualStyle}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Language</dt>
              <dd className="text-foreground">{project.language}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Subtitles</dt>
              <dd className="text-foreground">
                {project.subtitleSettings.enabled ? "On" : "Off"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Music</dt>
              <dd className="text-foreground">
                {project.musicSettings.enabled ? "On" : "Off"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium text-foreground">Script preview</h2>
          <p className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-sm text-muted">
            {project.script || "(empty)"}
          </p>
        </div>
        </div>

        <div className="mt-6">
          <ProjectActionButtons
            projectId={project.id}
            status={project.status}
            hasStoryAnalysis={Boolean(project.storyAnalysis)}
          />
        </div>
      </ProjectProgressProvider>

      {project.storyAnalysis ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium text-foreground">
            Story analysis ({project.storyAnalysis.scenes.length} scenes)
          </h2>
          <p className="mt-2 text-sm text-muted">{project.storyAnalysis.summary}</p>
          <ol className="mt-4 space-y-2 text-sm text-muted">
            {project.storyAnalysis.scenes.slice(0, 5).map((scene) => (
              <li key={scene.sequence}>
                <span className="text-foreground">{scene.title}:</span>{" "}
                {scene.narration}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {plannedScenes.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-medium text-foreground">
            Planned scenes ({plannedScenes.length})
          </h2>
          <ol className="mt-3 max-h-72 space-y-2 overflow-auto text-sm text-muted">
            {plannedScenes.slice(0, 12).map((scene) => (
              <li
                key={scene.id}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <span>
                  <span className="text-foreground">
                    #{scene.sequence} {scene.title}
                  </span>{" "}
                  · {scene.durationSec}s — {scene.narration.slice(0, 120)}
                </span>
                {canRegenerateSceneUi(project.status) ? (
                  <RegenerateSceneButton
                    projectId={project.id}
                    sceneId={scene.id}
                    sceneLabel={`${String(scene.sequence)} ${scene.title}`}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

    </section>
  );
}

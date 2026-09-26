import type { Repositories } from "@asv/db";
import { readWavDurationSec, type ProviderBundle } from "@asv/providers";
import type { LocalStorageProvider } from "@asv/storage";
import {
  AspectRatio,
  JobStatus,
  JobType,
  ProjectStatus,
  SceneAssetStatus,
  isTerminalProjectStatus,
  buildProjectSubtitleCues,
  buildSceneSubtitleCues,
  projectSubtitleSrtRelativePath,
  projectSubtitleVttRelativePath,
  renderSrt,
  renderVtt,
  sceneSubtitleSrtRelativePath,
  sceneSubtitleVttRelativePath,
  videoProviderRequiresSourceImage,
  type Job,
} from "@asv/shared";
import {
  assembleProjectVideo,
  checkFfmpegAvailable,
  projectFinalVideoRelativePath,
} from "@asv/video-engine";
import path from "node:path";
import { DeferredJobError } from "./deferred-job-error.js";

export interface JobProcessorOptions {
  storage: LocalStorageProvider;
  ffmpegPath?: string;
  /** When false (default), mock image/video assets fail the job. */
  allowMockVisuals?: boolean;
}

function buildSceneVideoGenerationPrompt(scene: {
  visualDescription: string;
  imagePrompt: string;
  videoPrompt: string;
  narration: string;
  camera?: string;
}): string {
  const visual = (scene.imagePrompt || scene.visualDescription).trim();
  const motion = (scene.videoPrompt || "").trim();
  const parts = [
    visual,
    motion && motion !== visual ? motion : "",
    scene.camera ? `Camera: ${scene.camera}` : "",
    "Photorealistic, natural motion, subjects and environment move realistically, cinematic, no text, no watermark.",
  ].filter(Boolean);
  return parts.join(" ");
}

export class JobProcessor {
  constructor(
    private readonly repositories: Repositories,
    private readonly providers: ProviderBundle,
    private readonly options: JobProcessorOptions,
  ) {}

  async process(job: Job): Promise<void> {
    const current = this.repositories.jobs.findById(job.id);
    if (current?.status !== JobStatus.RUNNING) {
      return;
    }

    switch (current.type) {
      case JobType.ANALYZE_SCRIPT:
      case JobType.PLAN_SCENES:
        this.repositories.jobs.updateStatus(current.id, JobStatus.COMPLETED, {
          progress: 100,
          currentStep: "completed",
        });
        break;
      case JobType.GENERATE_SUBTITLES:
        await this.processSubtitles(current);
        break;
      case JobType.GENERATE_IMAGE:
        await this.processImage(current);
        break;
      case JobType.GENERATE_VIDEO:
        await this.processVideo(current);
        break;
      case JobType.GENERATE_AUDIO:
        await this.processAudio(current);
        break;
      case JobType.ASSEMBLE_VIDEO:
        await this.processAssemble(current);
        break;
      default: {
        const exhaustive: never = current.type;
        throw new Error(`Unsupported job type: ${String(exhaustive)}`);
      }
    }

    const after = this.repositories.jobs.findById(job.id);
    if (after?.status === JobStatus.COMPLETED) {
      this.updateProjectProgress(job.projectId);
      this.maybeAdvanceProjectStatus(job.projectId);
    }
  }

  private completeJobSkipped(jobId: string): void {
    this.repositories.jobs.updateStatus(jobId, JobStatus.COMPLETED, {
      progress: 100,
      currentStep: "skipped_existing_asset",
    });
  }

  private async assetExists(relativePath: string | undefined): Promise<boolean> {
    if (!relativePath) {
      return false;
    }
    return this.options.storage.exists(relativePath);
  }

  private async processImage(job: Job): Promise<void> {
    const scene = this.requireScene(job);
    const project = this.repositories.projects.findById(job.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (
      scene.imageStatus === SceneAssetStatus.COMPLETED &&
      (await this.assetExists(scene.assetPaths.image))
    ) {
      this.completeJobSkipped(job.id);
      return;
    }

    this.repositories.scenes.update(scene.id, {
      imageStatus: SceneAssetStatus.RUNNING,
    });

    const cinematicPrompt = [
      scene.imagePrompt || scene.visualDescription,
      "Cinematic story frame, photorealistic, consistent character appearance,",
      "dramatic lighting, shallow depth of field, no text, no watermark.",
    ].join(" ");

    const asset = await this.providers.image.generateImage({
      projectId: job.projectId,
      sceneId: scene.id,
      prompt: cinematicPrompt,
      width: 1280,
      height: project.aspectRatio === AspectRatio.R9_16 ? 1280 : 720,
    });

    if (asset.mock && !this.options.allowMockVisuals) {
      throw new Error(
        "Image provider returned mock placeholder. Set MOCK_AI=false and IMAGE_PROVIDER=openai|pollinations|local-http.",
      );
    }

    if (!this.isStillRunning(job.id)) {
      return;
    }

    this.repositories.scenes.update(scene.id, {
      imageStatus: SceneAssetStatus.COMPLETED,
      assetPaths: { ...scene.assetPaths, image: asset.relativePath },
    });

    this.repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
      progress: 100,
      currentStep: "completed",
    });
  }

  private async processVideo(job: Job): Promise<void> {
    const scene = this.requireScene(job);
    const project = this.repositories.projects.findById(job.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (
      scene.videoStatus === SceneAssetStatus.COMPLETED &&
      (await this.assetExists(scene.assetPaths.video))
    ) {
      this.completeJobSkipped(job.id);
      return;
    }

    this.repositories.scenes.update(scene.id, {
      videoStatus: SceneAssetStatus.RUNNING,
    });

    if (videoProviderRequiresSourceImage(this.providers.video.id)) {
      if (
        !scene.assetPaths.image ||
        !(await this.assetExists(scene.assetPaths.image))
      ) {
        throw new DeferredJobError(
          `Scene ${scene.id} image not ready yet; waiting before Ken Burns motion.`,
        );
      }
    }

    const videoPrompt = buildSceneVideoGenerationPrompt(scene);

    const asset = await this.providers.video.generateVideo({
      projectId: job.projectId,
      sceneId: scene.id,
      prompt: videoPrompt,
      durationSec: scene.durationSec,
      width: 1280,
      height: project.aspectRatio === AspectRatio.R9_16 ? 1280 : 720,
      fps: 24,
      sequence: scene.sequence,
      ...(scene.assetPaths.image
        ? { sourceImageRelativePath: scene.assetPaths.image }
        : {}),
    });

    if (asset.mock && !this.options.allowMockVisuals) {
      throw new Error(
        "Video provider returned mock placeholder. Set VIDEO_PROVIDER=pollinations, wan, or local-http for real text-to-video clips.",
      );
    }

    if (!this.isStillRunning(job.id)) {
      return;
    }

    this.repositories.scenes.update(scene.id, {
      videoStatus: SceneAssetStatus.COMPLETED,
      assetPaths: { ...scene.assetPaths, video: asset.relativePath },
    });

    this.repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
      progress: 100,
      currentStep: "completed",
    });
  }

  private async processAudio(job: Job): Promise<void> {
    const scene = this.requireScene(job);
    const project = this.repositories.projects.findById(job.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (
      scene.audioStatus === SceneAssetStatus.COMPLETED &&
      (await this.assetExists(scene.assetPaths.audio))
    ) {
      this.completeJobSkipped(job.id);
      return;
    }

    this.repositories.scenes.update(scene.id, {
      audioStatus: SceneAssetStatus.RUNNING,
    });

    const asset = await this.providers.tts.generateSpeech({
      projectId: job.projectId,
      sceneId: scene.id,
      text: scene.narration,
      language: project.language,
      voiceGender: project.voiceSettings.gender,
      targetDurationSec: scene.durationSec,
    });

    if (!this.isStillRunning(job.id)) {
      return;
    }

    const patch: {
      audioStatus: SceneAssetStatus;
      assetPaths: typeof scene.assetPaths;
      durationSec?: number;
    } = {
      audioStatus: SceneAssetStatus.COMPLETED,
      assetPaths: { ...scene.assetPaths, audio: asset.relativePath },
    };

    if (asset.contentType.includes("wav")) {
      const wav = await this.options.storage.get(asset.relativePath);
      const spokenSec = readWavDurationSec(wav);
      if (spokenSec !== null && spokenSec > 0.5) {
        // Keep planned pacing for mock; real TTS may extend slightly for speech.
        const planned = scene.durationSec;
        const rounded = Math.max(1, Math.ceil(spokenSec));
        patch.durationSec =
          asset.mock === true
            ? planned
            : Math.min(Math.max(rounded, planned), Math.max(planned * 2, planned + 8));
      }
    }

    this.repositories.scenes.update(scene.id, patch);

    this.repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
      progress: 100,
      currentStep: "completed",
    });
  }

  private async processSubtitles(job: Job): Promise<void> {
    const scene = this.requireScene(job);
    const project = this.repositories.projects.findById(job.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (!project.subtitleSettings.enabled) {
      this.repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
        progress: 100,
        currentStep: "subtitles_skipped",
      });
      return;
    }

    if (await this.assetExists(scene.assetPaths.subtitleVtt)) {
      this.completeJobSkipped(job.id);
      return;
    }

    const cues = buildSceneSubtitleCues(scene.narration, scene.durationSec);
    const srtRel = sceneSubtitleSrtRelativePath(
      job.projectId,
      scene.id,
      scene.sequence,
    );
    const vttRel = sceneSubtitleVttRelativePath(
      job.projectId,
      scene.id,
      scene.sequence,
    );
    await this.options.storage.save(srtRel, Buffer.from(renderSrt(cues), "utf8"));
    await this.options.storage.save(vttRel, Buffer.from(renderVtt(cues), "utf8"));

    if (!this.isStillRunning(job.id)) {
      return;
    }

    this.repositories.scenes.update(scene.id, {
      assetPaths: {
        ...scene.assetPaths,
        subtitleSrt: srtRel,
        subtitleVtt: vttRel,
      },
    });

    this.repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
      progress: 100,
      currentStep: "completed",
    });
  }

  private async processAssemble(job: Job): Promise<void> {
    if (!this.isStillRunning(job.id)) {
      return;
    }

    const project = this.repositories.projects.findById(job.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    this.repositories.projects.update(job.projectId, {
      status: ProjectStatus.ASSEMBLING,
    });

    const ffmpegReady = await checkFfmpegAvailable(this.options.ffmpegPath);
    if (!ffmpegReady) {
      throw new Error(
        "FFmpeg is required to assemble the final MP4. Install FFmpeg and ensure it is on PATH, or set FFMPEG_PATH.",
      );
    }

    const scenes = this.repositories.scenes.listByProjectId(job.projectId);

    if (project.subtitleSettings.enabled) {
      const cues = buildProjectSubtitleCues(
        scenes.map((scene) => ({
          sequence: scene.sequence,
          narration: scene.narration,
          durationSec: scene.durationSec,
        })),
      );
      const srtRel = projectSubtitleSrtRelativePath(job.projectId);
      const vttRel = projectSubtitleVttRelativePath(job.projectId);
      await this.options.storage.save(
        srtRel,
        Buffer.from(renderSrt(cues), "utf8"),
      );
      await this.options.storage.save(
        vttRel,
        Buffer.from(renderVtt(cues), "utf8"),
      );
    }

    const finalRelative = projectFinalVideoRelativePath(job.projectId);
    const outputPath = this.options.storage.getAbsolutePath(finalRelative);
    const workDir = path.join(
      this.options.storage.getAbsolutePath(`projects/${job.projectId}`),
      "final",
      "work",
    );

    let musicPath: string | null = null;
    const musicVolume = project.musicSettings.volume;
    if (project.musicSettings.enabled) {
      const totalDurationSec = scenes.reduce(
        (sum, scene) => sum + scene.durationSec,
        0,
      );
      const mood = project.storyAnalysis?.genre ?? "neutral";
      const musicAsset = await this.providers.music.generateMusic({
        projectId: job.projectId,
        durationSec: Math.max(1, totalDurationSec),
        mood,
      });
      musicPath = this.options.storage.getAbsolutePath(musicAsset.relativePath);
    }

    if (!this.isStillRunning(job.id)) {
      return;
    }

    const assembleRequest = {
      projectId: job.projectId,
      aspectRatio: project.aspectRatio,
      outputPath,
      workDir,
      musicPath,
      musicVolume,
      allowPlaceholderVisuals: this.options.allowMockVisuals === true,
      scenes: scenes.map((scene) => ({
        sequence: scene.sequence,
        durationSec: scene.durationSec,
        videoPath: scene.assetPaths.video
          ? this.options.storage.getAbsolutePath(scene.assetPaths.video)
          : null,
        imagePath: scene.assetPaths.image
          ? this.options.storage.getAbsolutePath(scene.assetPaths.image)
          : null,
        audioPath: scene.assetPaths.audio
          ? this.options.storage.getAbsolutePath(scene.assetPaths.audio)
          : null,
      })),
    };

    const result = await assembleProjectVideo(
      this.options.ffmpegPath
        ? { ...assembleRequest, ffmpegPath: this.options.ffmpegPath }
        : assembleRequest,
    );

    if (!this.isStillRunning(job.id)) {
      return;
    }

    const projectAfter = this.repositories.projects.findById(job.projectId);
    if (
      !projectAfter ||
      projectAfter.status === ProjectStatus.CANCELLED ||
      isTerminalProjectStatus(projectAfter.status)
    ) {
      return;
    }

    this.repositories.jobs.updateStatus(job.id, JobStatus.COMPLETED, {
      progress: 100,
      currentStep: "assembled",
    });

    this.repositories.projects.update(job.projectId, {
      status: ProjectStatus.COMPLETED,
      progress: 100,
      actualDurationSec: result.durationSec,
    });
  }

  private isStillRunning(jobId: string): boolean {
    const job = this.repositories.jobs.findById(jobId);
    return job?.status === JobStatus.RUNNING;
  }

  private requireScene(job: Job) {
    if (!job.sceneId) {
      throw new Error(`Job ${job.id} is missing sceneId`);
    }
    const scenes = this.repositories.scenes.listByProjectId(job.projectId);
    const scene = scenes.find((s) => s.id === job.sceneId);
    if (!scene) {
      throw new Error(`Scene ${job.sceneId} not found`);
    }
    return scene;
  }

  private updateProjectProgress(projectId: string): void {
    const jobs = this.repositories.jobs.listByProjectId(projectId);
    if (jobs.length === 0) {
      return;
    }
    const completed = jobs.filter((j) => j.status === JobStatus.COMPLETED).length;
    const progress = Math.round((completed / jobs.length) * 100);
    this.repositories.projects.update(projectId, { progress });
  }

  private maybeAdvanceProjectStatus(projectId: string): void {
    const jobs = this.repositories.jobs.listByProjectId(projectId);
    const hasActive = (type: JobType) =>
      jobs.some(
        (j) =>
          j.type === type &&
          (j.status === JobStatus.QUEUED || j.status === JobStatus.RUNNING),
      );

    for (let step = 0; step < 6; step += 1) {
      const project = this.repositories.projects.findById(projectId);
      if (!project || project.status === ProjectStatus.CANCELLED) {
        return;
      }

      let next: ProjectStatus | null = null;
      if (
        project.status === ProjectStatus.GENERATING_IMAGES &&
        !hasActive(JobType.GENERATE_IMAGE)
      ) {
        next = ProjectStatus.GENERATING_VIDEO;
      } else if (
        project.status === ProjectStatus.GENERATING_VIDEO &&
        !hasActive(JobType.GENERATE_VIDEO)
      ) {
        next = ProjectStatus.GENERATING_AUDIO;
      } else if (
        project.status === ProjectStatus.GENERATING_AUDIO &&
        !hasActive(JobType.GENERATE_AUDIO) &&
        !hasActive(JobType.GENERATE_SUBTITLES)
      ) {
        next = ProjectStatus.ASSEMBLING;
      }

      if (!next) {
        return;
      }
      try {
        this.repositories.projects.update(projectId, { status: next });
      } catch {
        return;
      }
    }
  }
}

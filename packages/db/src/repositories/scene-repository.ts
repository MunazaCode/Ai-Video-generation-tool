import {
  SceneAssetStatus,
  type CreateSceneInput,
  type Scene,
} from "@asv/shared";
import { asc, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { mapSceneRow } from "../mappers.js";
import { scenes } from "../schema.js";
import { newId, nowMs } from "../utils.js";

export class SceneRepository {
  constructor(private readonly db: DrizzleDb) {}

  listByProjectId(projectId: string): Scene[] {
    const rows = this.db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.sequence))
      .all();
    return rows.map(mapSceneRow);
  }

  createMany(inputs: CreateSceneInput[]): Scene[] {
    if (inputs.length === 0) {
      return [];
    }
    const created: Scene[] = [];
    for (const input of inputs) {
      const ts = nowMs();
      const row = {
        id: newId(),
        projectId: input.projectId,
        sequence: input.sequence,
        title: input.title,
        narration: input.narration,
        visualDescription: input.visualDescription,
        imagePrompt: input.imagePrompt,
        videoPrompt: input.videoPrompt,
        durationSec: input.durationSec,
        characterIdsJson: JSON.stringify(input.characterIds),
        locationId: input.locationId,
        mood: input.mood,
        camera: input.camera,
        lighting: input.lighting,
        style: input.style,
        previousSceneContext: input.previousSceneContext,
        nextSceneContext: input.nextSceneContext,
        imageStatus: input.imageStatus,
        videoStatus: input.videoStatus,
        audioStatus: input.audioStatus,
        assetPathsJson: JSON.stringify(input.assetPaths ?? {}),
        createdAt: ts,
        updatedAt: ts,
      };
      this.db.insert(scenes).values(row).run();
      created.push(mapSceneRow(row));
    }
    return created;
  }

  replaceForProject(projectId: string, inputs: CreateSceneInput[]): Scene[] {
    this.db.delete(scenes).where(eq(scenes.projectId, projectId)).run();
    return this.createMany(
      inputs.map((s) => ({
        ...s,
        projectId,
      })),
    );
  }

  update(
    id: string,
    patch: Partial<
      Pick<
        Scene,
        | "sequence"
        | "title"
        | "narration"
        | "visualDescription"
        | "imagePrompt"
        | "videoPrompt"
        | "durationSec"
        | "imageStatus"
        | "videoStatus"
        | "audioStatus"
        | "assetPaths"
      >
    >,
  ): Scene | null {
    const existing = this.db.select().from(scenes).where(eq(scenes.id, id)).get();
    if (!existing) {
      return null;
    }

    const updateRow: Partial<typeof scenes.$inferInsert> = {
      updatedAt: nowMs(),
    };
    if (patch.sequence !== undefined) updateRow.sequence = patch.sequence;
    if (patch.title !== undefined) updateRow.title = patch.title;
    if (patch.narration !== undefined) updateRow.narration = patch.narration;
    if (patch.visualDescription !== undefined) {
      updateRow.visualDescription = patch.visualDescription;
    }
    if (patch.imagePrompt !== undefined) updateRow.imagePrompt = patch.imagePrompt;
    if (patch.videoPrompt !== undefined) updateRow.videoPrompt = patch.videoPrompt;
    if (patch.durationSec !== undefined) updateRow.durationSec = patch.durationSec;
    if (patch.imageStatus !== undefined) updateRow.imageStatus = patch.imageStatus;
    if (patch.videoStatus !== undefined) updateRow.videoStatus = patch.videoStatus;
    if (patch.audioStatus !== undefined) updateRow.audioStatus = patch.audioStatus;
    if (patch.assetPaths !== undefined) {
      updateRow.assetPathsJson = JSON.stringify(patch.assetPaths);
    }

    this.db.update(scenes).set(updateRow).where(eq(scenes.id, id)).run();
    const row = this.db.select().from(scenes).where(eq(scenes.id, id)).get();
    return row ? mapSceneRow(row) : null;
  }

  delete(id: string): boolean {
    const result = this.db.delete(scenes).where(eq(scenes.id, id)).run();
    return result.changes > 0;
  }

  defaultAssetStatuses(): {
    imageStatus: SceneAssetStatus;
    videoStatus: SceneAssetStatus;
    audioStatus: SceneAssetStatus;
  } {
    return {
      imageStatus: SceneAssetStatus.PENDING,
      videoStatus: SceneAssetStatus.PENDING,
      audioStatus: SceneAssetStatus.PENDING,
    };
  }

  /** Reset in-flight asset flags after cancel or worker loss (RUNNING → QUEUED). */
  resetRunningAssetsForProject(projectId: string): number {
    const list = this.listByProjectId(projectId);
    let count = 0;
    for (const scene of list) {
      const patch: Partial<
        Pick<Scene, "imageStatus" | "videoStatus" | "audioStatus">
      > = {};
      if (scene.imageStatus === SceneAssetStatus.RUNNING) {
        patch.imageStatus = SceneAssetStatus.QUEUED;
        count += 1;
      }
      if (scene.videoStatus === SceneAssetStatus.RUNNING) {
        patch.videoStatus = SceneAssetStatus.QUEUED;
        count += 1;
      }
      if (scene.audioStatus === SceneAssetStatus.RUNNING) {
        patch.audioStatus = SceneAssetStatus.QUEUED;
        count += 1;
      }
      if (Object.keys(patch).length > 0) {
        this.update(scene.id, patch);
      }
    }
    return count;
  }
}

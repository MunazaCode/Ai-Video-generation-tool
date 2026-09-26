import {
  ProjectStatus,
  assertProjectStatusTransition,
  type CreateProjectInput,
  type Project,
  type StoryAnalysis,
  type UpdateProjectInput,
} from "@asv/shared";
import { desc, eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { mapProjectRow } from "../mappers.js";
import { projects } from "../schema.js";
import { newId, nowMs } from "../utils.js";

export class ProjectRepository {
  constructor(private readonly db: DrizzleDb) {}

  create(input: CreateProjectInput): Project {
    const ts = nowMs();
    const id = newId();
    const row = {
      id,
      title: input.title,
      script: input.script,
      targetDurationSec: input.targetDurationSec,
      actualDurationSec: null,
      aspectRatio: input.aspectRatio,
      visualStyle: input.visualStyle,
      customVisualStyle: input.customVisualStyle ?? null,
      language: input.language,
      voiceSettingsJson: JSON.stringify(input.voiceSettings),
      subtitleSettingsJson: JSON.stringify(input.subtitleSettings),
      musicSettingsJson: JSON.stringify(input.musicSettings),
      status: ProjectStatus.DRAFT,
      progress: 0,
      storyAnalysisJson: null,
      storyAnalysisPromptVersion: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.db.insert(projects).values(row).run();
    return mapProjectRow(row);
  }

  findById(id: string): Project | null {
    const row = this.db.select().from(projects).where(eq(projects.id, id)).get();
    return row ? mapProjectRow(row) : null;
  }

  list(): Project[] {
    const rows = this.db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .all();
    return rows.map(mapProjectRow);
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    if (input.status !== undefined && input.status !== existing.status) {
      assertProjectStatusTransition(existing.status, input.status);
    }

    const patch: Partial<typeof projects.$inferInsert> = {
      updatedAt: nowMs(),
    };

    if (input.title !== undefined) patch.title = input.title;
    if (input.script !== undefined) patch.script = input.script;
    if (input.targetDurationSec !== undefined) {
      patch.targetDurationSec = input.targetDurationSec;
    }
    if (input.actualDurationSec !== undefined) {
      patch.actualDurationSec = input.actualDurationSec;
    }
    if (input.aspectRatio !== undefined) patch.aspectRatio = input.aspectRatio;
    if (input.visualStyle !== undefined) patch.visualStyle = input.visualStyle;
    if (input.customVisualStyle !== undefined) {
      patch.customVisualStyle = input.customVisualStyle;
    }
    if (input.language !== undefined) patch.language = input.language;
    if (input.voiceSettings !== undefined) {
      patch.voiceSettingsJson = JSON.stringify(input.voiceSettings);
    }
    if (input.subtitleSettings !== undefined) {
      patch.subtitleSettingsJson = JSON.stringify(input.subtitleSettings);
    }
    if (input.musicSettings !== undefined) {
      patch.musicSettingsJson = JSON.stringify(input.musicSettings);
    }
    if (input.status !== undefined) patch.status = input.status;
    if (input.progress !== undefined) patch.progress = input.progress;

    this.db.update(projects).set(patch).where(eq(projects.id, id)).run();
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.delete(projects).where(eq(projects.id, id)).run();
    return result.changes > 0;
  }

  saveStoryAnalysis(id: string, analysis: StoryAnalysis): Project | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }
    this.db
      .update(projects)
      .set({
        storyAnalysisJson: JSON.stringify(analysis),
        storyAnalysisPromptVersion: analysis.promptVersion,
        updatedAt: nowMs(),
      })
      .where(eq(projects.id, id))
      .run();
    return this.findById(id);
  }
}

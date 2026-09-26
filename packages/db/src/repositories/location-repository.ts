import type { StoryAnalysis } from "@asv/shared";
import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { locations } from "../schema.js";
import { newId, nowMs } from "../utils.js";

export class LocationRepository {
  constructor(private readonly db: DrizzleDb) {}

  replaceFromAnalysis(projectId: string, analysis: StoryAnalysis): Map<string, string> {
    this.db.delete(locations).where(eq(locations.projectId, projectId)).run();
    const keyToId = new Map<string, string>();
    const ts = nowMs();

    for (const entry of analysis.locations) {
      const id = newId();
      keyToId.set(entry.key, id);
      this.db
        .insert(locations)
        .values({
          id,
          projectId,
          name: entry.name,
          description: entry.description,
          visualIdentity: entry.description,
          lighting: entry.lighting,
          architecture: "",
          environment: entry.environment,
          createdAt: ts,
          updatedAt: ts,
        })
        .run();
    }

    return keyToId;
  }
}

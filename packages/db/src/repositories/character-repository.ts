import type { StoryAnalysis } from "@asv/shared";
import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../client.js";
import { characters } from "../schema.js";
import { newId, nowMs } from "../utils.js";

export class CharacterRepository {
  constructor(private readonly db: DrizzleDb) {}

  replaceFromAnalysis(projectId: string, analysis: StoryAnalysis): Map<string, string> {
    this.db.delete(characters).where(eq(characters.projectId, projectId)).run();
    const keyToId = new Map<string, string>();
    const ts = nowMs();

    for (const entry of analysis.characters) {
      const id = newId();
      keyToId.set(entry.key, id);
      this.db
        .insert(characters)
        .values({
          id,
          projectId,
          name: entry.name,
          age: entry.age ?? null,
          appearance: entry.appearance,
          clothing: "",
          hairstyle: "",
          skinDescription: "",
          personality: entry.personality,
          visualIdentity: entry.appearance,
          referenceImagePath: null,
          negativePrompt: "",
          createdAt: ts,
          updatedAt: ts,
        })
        .run();
    }

    return keyToId;
  }
}

import { describe, expect, it } from "vitest";
import { chunkPaths, DEFAULT_CONCAT_BATCH_SIZE } from "./concat-batch.js";

describe("chunkPaths", () => {
  it("chunks long scene lists for batched concat", () => {
    const paths = Array.from({ length: 75 }, (_, i) => `s${String(i)}.mp4`);
    const chunks = chunkPaths(paths, DEFAULT_CONCAT_BATCH_SIZE);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(30);
    expect(chunks[2]).toHaveLength(15);
  });
});

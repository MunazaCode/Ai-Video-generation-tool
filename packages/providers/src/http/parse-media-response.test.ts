import { describe, expect, it } from "vitest";
import {
  extensionFromContentType,
  parseMediaResponse,
} from "./parse-media-response.js";

describe("parseMediaResponse", () => {
  it("reads raw binary bodies", async () => {
    const body = new Uint8Array([1, 2, 3]);
    const response = new Response(body, {
      headers: { "Content-Type": "image/png" },
    });
    const parsed = await parseMediaResponse(response, "application/octet-stream");
    expect(parsed.contentType).toBe("image/png");
    expect(parsed.data.equals(Buffer.from(body))).toBe(true);
  });

  it("decodes JSON base64 payloads", async () => {
    const encoded = Buffer.from("hello").toString("base64");
    const response = new Response(JSON.stringify({ data: encoded }), {
      headers: { "Content-Type": "application/json" },
    });
    const parsed = await parseMediaResponse(response, "image/png");
    expect(parsed.data.toString()).toBe("hello");
    expect(parsed.contentType).toBe("image/png");
  });
});

describe("extensionFromContentType", () => {
  it("strips parameters", () => {
    expect(extensionFromContentType("video/mp4; charset=binary")).toBe("mp4");
  });
});

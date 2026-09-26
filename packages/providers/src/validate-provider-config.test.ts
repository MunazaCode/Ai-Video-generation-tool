import { describe, expect, it } from "vitest";
import { ProviderConfigurationError } from "./provider-errors.js";
import { createProviderBundle } from "./provider-bundle.js";
import { validateProviderFactoryOptions } from "./validate-provider-config.js";
import { LocalStorageProvider } from "@asv/storage";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("validateProviderFactoryOptions", () => {
  it("accepts mock mode without env vars", () => {
    const result = validateProviderFactoryOptions(
      {
        mockAi: true,
        llmProvider: "mock",
        imageProvider: "mock",
        videoProvider: "mock",
        ttsProvider: "mock",
        musicProvider: "mock",
        storage: new LocalStorageProvider("."),
      },
      {},
    );
    expect(result.valid).toBe(true);
  });

  it("reports missing env for registered real providers", () => {
    const result = validateProviderFactoryOptions(
      {
        mockAi: false,
        llmProvider: "openai",
        imageProvider: "mock",
        videoProvider: "pollinations",
        ttsProvider: "openai",
        musicProvider: "mock",
        storage: new LocalStorageProvider("."),
      },
      {},
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "MISSING_ENV")).toBe(true);
    expect(
      result.issues.some((i) => i.missingEnv?.includes("OPENAI_API_KEY")),
    ).toBe(true);
    expect(
      result.issues.some((i) => i.missingEnv?.includes("POLLINATIONS_API_KEY")),
    ).toBe(true);
  });

  it("rejects mock video when MOCK_AI=false", () => {
    const result = validateProviderFactoryOptions(
      {
        mockAi: false,
        llmProvider: "mock",
        imageProvider: "mock",
        videoProvider: "mock",
        ttsProvider: "mock",
        musicProvider: "mock",
        storage: new LocalStorageProvider("."),
      },
      {},
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "MOCK_NOT_ALLOWED")).toBe(true);
  });

  it("rejects Ken Burns image-motion when MOCK_AI=false", () => {
    const result = validateProviderFactoryOptions(
      {
        mockAi: false,
        llmProvider: "mock",
        imageProvider: "pollinations",
        videoProvider: "image-motion",
        ttsProvider: "sapi",
        musicProvider: "mock",
        storage: new LocalStorageProvider("."),
      },
      { POLLINATIONS_API_KEY: "sk_test" },
    );
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (i) => i.providerId === "image-motion" && i.code === "MOCK_NOT_ALLOWED",
      ),
    ).toBe(true);
  });

  it("accepts pollinations text-to-video with API key", () => {
    const result = validateProviderFactoryOptions(
      {
        mockAi: false,
        llmProvider: "mock",
        imageProvider: "mock",
        videoProvider: "pollinations",
        ttsProvider: "sapi",
        musicProvider: "mock",
        storage: new LocalStorageProvider("."),
      },
      { POLLINATIONS_API_KEY: "sk_test" },
    );
    expect(result.valid).toBe(true);
  });

  it("rejects unknown provider ids", () => {
    const result = validateProviderFactoryOptions(
      {
        mockAi: false,
        llmProvider: "mock",
        imageProvider: "not-a-provider",
        videoProvider: "pollinations",
        ttsProvider: "mock",
        musicProvider: "mock",
        storage: new LocalStorageProvider("."),
      },
      { POLLINATIONS_API_KEY: "sk_test" },
    );
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("UNKNOWN_PROVIDER");
  });
});

describe("createProviderBundle configuration errors", () => {
  it("throws ProviderConfigurationError when env is missing", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "asv-prov-val-"));
    const storage = new LocalStorageProvider(root);
    expect(() =>
      createProviderBundle(
        {
          mockAi: false,
          llmProvider: "openai",
          imageProvider: "mock",
          videoProvider: "pollinations",
          ttsProvider: "openai",
          musicProvider: "mock",
          storage,
        },
        {},
      ),
    ).toThrow(ProviderConfigurationError);
  });
});

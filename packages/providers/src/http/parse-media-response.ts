export interface ParsedMediaPayload {
  data: Buffer;
  contentType: string;
}

function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  return "bin";
}

export function extensionFromContentType(contentType: string): string {
  return extensionForContentType(contentType.split(";")[0]?.trim() ?? "");
}

export async function parseMediaResponse(
  response: Response,
  fallbackContentType: string,
): Promise<ParsedMediaPayload> {
  const headerType = response.headers.get("content-type") ?? fallbackContentType;
  const contentType = headerType.split(";")[0]?.trim() ?? fallbackContentType;

  if (contentType.includes("json")) {
    const json = (await response.json()) as {
      data?: string;
      base64?: string;
      contentType?: string;
    };
    const encoded = json.data ?? json.base64;
    if (!encoded || typeof encoded !== "string") {
      throw new Error("Media API JSON response must include data or base64 field");
    }
    return {
      data: Buffer.from(encoded, "base64"),
      contentType: json.contentType ?? fallbackContentType,
    };
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    data: Buffer.from(arrayBuffer),
    contentType,
  };
}

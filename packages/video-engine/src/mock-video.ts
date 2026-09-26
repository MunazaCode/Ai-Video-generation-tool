export const MOCK_VIDEO_HEADER = "MOCK_AI_VIDEO\n";

export function isMockVideoPayload(data: Buffer): boolean {
  return data.subarray(0, MOCK_VIDEO_HEADER.length).toString("utf8") === MOCK_VIDEO_HEADER;
}

/** True when scene video clips are derived from still images (Ken Burns), not text-to-video. */
export function videoProviderRequiresSourceImage(videoProviderId: string): boolean {
  return videoProviderId === "image-motion";
}

/** True when the configured video backend generates real moving footage from prompts. */
export function isRealTextToVideoProvider(videoProviderId: string): boolean {
  return !videoProviderRequiresSourceImage(videoProviderId) && videoProviderId !== "mock";
}

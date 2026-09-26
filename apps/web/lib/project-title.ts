import { PROJECT_TITLE_MAX_LENGTH } from "@asv/shared";

export function deriveProjectTitle(script: string): string {
  const firstLine = script
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return "Untitled video";
  }

  if (firstLine.length <= PROJECT_TITLE_MAX_LENGTH) {
    return firstLine;
  }

  return `${firstLine.slice(0, PROJECT_TITLE_MAX_LENGTH - 1)}…`;
}

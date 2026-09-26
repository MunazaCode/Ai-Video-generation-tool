export interface SubtitleCue {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
}

export interface SceneSubtitleInput {
  sequence: number;
  narration: string;
  durationSec: number;
}

export function sanitizeSubtitleText(text: string): string {
  return text.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/** Format seconds as SRT timestamp `HH:MM:SS,mmm`. */
export function formatSrtTimestamp(totalSec: number): string {
  const ms = Math.max(0, Math.round(totalSec * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(millis)}`;
}

/** Format seconds as WebVTT timestamp `HH:MM:SS.mmm`. */
export function formatVttTimestamp(totalSec: number): string {
  return formatSrtTimestamp(totalSec).replace(",", ".");
}

export function buildSceneSubtitleCues(
  narration: string,
  durationSec: number,
  startIndex = 1,
): SubtitleCue[] {
  const text = sanitizeSubtitleText(narration);
  if (!text || durationSec <= 0) {
    return [];
  }
  return [
    {
      index: startIndex,
      startSec: 0,
      endSec: durationSec,
      text,
    },
  ];
}

export function buildProjectSubtitleCues(
  scenes: SceneSubtitleInput[],
): SubtitleCue[] {
  const sorted = [...scenes].sort((a, b) => a.sequence - b.sequence);
  const cues: SubtitleCue[] = [];
  let offsetSec = 0;
  let index = 1;
  for (const scene of sorted) {
    const text = sanitizeSubtitleText(scene.narration);
    if (!text || scene.durationSec <= 0) {
      offsetSec += scene.durationSec;
      continue;
    }
    cues.push({
      index,
      startSec: offsetSec,
      endSec: offsetSec + scene.durationSec,
      text,
    });
    index += 1;
    offsetSec += scene.durationSec;
  }
  return cues;
}

export function renderSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue) =>
        `${String(cue.index)}\n${formatSrtTimestamp(cue.startSec)} --> ${formatSrtTimestamp(cue.endSec)}\n${cue.text}\n`,
    )
    .join("\n");
}

export function renderVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map(
      (cue) =>
        `${String(cue.index)}\n${formatVttTimestamp(cue.startSec)} --> ${formatVttTimestamp(cue.endSec)}\n${cue.text}`,
    )
    .join("\n\n");
  return body.length > 0 ? `WEBVTT\n\n${body}\n` : "WEBVTT\n\n";
}

export function projectSubtitleSrtRelativePath(projectId: string): string {
  return `projects/${projectId}/subtitles/project.srt`;
}

export function projectSubtitleVttRelativePath(projectId: string): string {
  return `projects/${projectId}/subtitles/project.vtt`;
}

export function sceneSubtitleSrtRelativePath(
  projectId: string,
  sceneId: string,
  sequence: number,
): string {
  return `projects/${projectId}/scenes/${sceneId}/subtitles/scene-${String(sequence).padStart(4, "0")}.srt`;
}

export function sceneSubtitleVttRelativePath(
  projectId: string,
  sceneId: string,
  sequence: number,
): string {
  return `projects/${projectId}/scenes/${sceneId}/subtitles/scene-${String(sequence).padStart(4, "0")}.vtt`;
}

import {
  SceneAssetStatus,
  calculateSceneCount,
  distributeSceneDurations,
  type CreateSceneInput,
  type StoryAnalysis,
  type StoryAnalysisScene,
  type VisualStyle,
} from "@asv/shared";

export interface ScenePlannerInput {
  projectId: string;
  targetDurationSec: number;
  targetSceneDurationSec: number;
  visualStyle: VisualStyle;
  analysis: StoryAnalysis;
  characterKeyToId: ReadonlyMap<string, string>;
  locationKeyToId: ReadonlyMap<string, string>;
}

export interface ScenePlanResult {
  sceneCount: number;
  totalDurationSec: number;
  scenes: CreateSceneInput[];
}

interface NormalizedBeat {
  title: string;
  narration: string;
  visualDescription: string;
  mood: string;
  locationKey: string | null;
  characterKeys: string[];
}

export function planScenesFromAnalysis(input: ScenePlannerInput): ScenePlanResult {
  const sceneCount = calculateSceneCount(
    input.targetDurationSec,
    input.targetSceneDurationSec,
  );
  const durations = distributeSceneDurations(input.targetDurationSec, sceneCount);
  const beats = normalizeBeats(input.analysis);
  const merged = resizeBeats(beats, sceneCount);

  const scenes: CreateSceneInput[] = merged.map((beat, index) => {
    const sequence = index + 1;
    const previous = merged[index - 1];
    const next = merged[index + 1];
    const durationSec = durations[index] ?? input.targetSceneDurationSec;

    const characterIds = beat.characterKeys
      .map((key) => input.characterKeyToId.get(key))
      .filter((id): id is string => id !== undefined);

    const locationId = beat.locationKey
      ? (input.locationKeyToId.get(beat.locationKey) ?? null)
      : null;

    const narration = beat.narration.trim();
    const visualDescription = beat.visualDescription.trim();

    return {
      projectId: input.projectId,
      sequence,
      title: beat.title,
      narration,
      visualDescription,
      imagePrompt: `${visualDescription} Style: ${input.visualStyle}.`,
      videoPrompt: `${visualDescription} Motion: characters and environment move naturally with realistic physics; visible action (walking, weather, camera motion). Style: ${input.visualStyle}.`,
      durationSec,
      characterIds,
      locationId,
      mood: beat.mood,
      camera: "Medium shot, motivated framing",
      lighting: "Consistent with location bible",
      style: input.visualStyle,
      previousSceneContext: previous ? previous.narration.slice(0, 240) : null,
      nextSceneContext: next ? next.narration.slice(0, 240) : null,
      imageStatus: SceneAssetStatus.PENDING,
      videoStatus: SceneAssetStatus.PENDING,
      audioStatus: SceneAssetStatus.PENDING,
    };
  });

  return {
    sceneCount,
    totalDurationSec: input.targetDurationSec,
    scenes,
  };
}

function normalizeBeats(analysis: StoryAnalysis): NormalizedBeat[] {
  const sorted = [...analysis.scenes].sort((a, b) => a.sequence - b.sequence);
  if (sorted.length === 0) {
    return [
      {
        title: analysis.title,
        narration: analysis.summary,
        visualDescription: analysis.visualStyleNotes,
        mood: "establishing",
        locationKey: analysis.locations[0]?.key ?? null,
        characterKeys: analysis.characters[0]?.key
          ? [analysis.characters[0].key]
          : [],
      },
    ];
  }

  return sorted.map((scene) => mapBeat(scene));
}

function mapBeat(scene: StoryAnalysisScene): NormalizedBeat {
  return {
    title: scene.title,
    narration: scene.narration,
    visualDescription: scene.visualDescription,
    mood: scene.mood,
    locationKey: scene.locationKey ?? null,
    characterKeys: scene.characterKeys,
  };
}

function resizeBeats(beats: NormalizedBeat[], targetCount: number): NormalizedBeat[] {
  if (targetCount <= 0) {
    return [];
  }
  if (beats.length === targetCount) {
    return beats;
  }
  if (beats.length > targetCount) {
    return mergeBeats(beats, targetCount);
  }
  return expandBeats(beats, targetCount);
}

function mergeBeats(beats: NormalizedBeat[], targetCount: number): NormalizedBeat[] {
  const result: NormalizedBeat[] = [];
  for (let i = 0; i < targetCount; i++) {
    const start = Math.floor((i * beats.length) / targetCount);
    const end = Math.floor(((i + 1) * beats.length) / targetCount);
    const chunk = beats.slice(start, Math.max(end, start + 1));
    const first = chunk[0];
    if (!first) {
      continue;
    }
    result.push({
      title: first.title,
      narration: chunk.map((b) => b.narration).join(" "),
      visualDescription: chunk.map((b) => b.visualDescription).join(" "),
      mood: first.mood,
      locationKey: first.locationKey,
      characterKeys: [...new Set(chunk.flatMap((b) => b.characterKeys))],
    });
  }
  return result;
}

function expandBeats(beats: NormalizedBeat[], targetCount: number): NormalizedBeat[] {
  const result: NormalizedBeat[] = [];
  let sequence = 0;
  for (const beat of beats) {
    const sentences = splitSentences(beat.narration);
    const partsNeeded = Math.max(
      1,
      Math.round((targetCount - result.length) / (beats.length - sequence)),
    );
    const parts = splitEvenly(sentences, partsNeeded);
    for (const part of parts) {
      if (result.length >= targetCount) {
        break;
      }
      result.push({
        title: `${beat.title} (${String(result.length + 1)})`,
        narration: part.join(" "),
        visualDescription: beat.visualDescription,
        mood: beat.mood,
        locationKey: beat.locationKey,
        characterKeys: beat.characterKeys,
      });
    }
    sequence += 1;
  }

  while (result.length < targetCount) {
    const last = result[result.length - 1] ?? beats[beats.length - 1];
    if (!last) {
      break;
    }
    result.push({
      ...last,
      title: `${last.title} (continued ${String(result.length + 1)})`,
    });
  }

  return result.slice(0, targetCount);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitEvenly<T>(items: T[], parts: number): T[][] {
  if (items.length === 0) {
    return Array.from({ length: parts }, () => []);
  }
  const result: T[][] = Array.from({ length: parts }, () => []);
  items.forEach((item, index) => {
    const bucket = result[index % parts];
    if (bucket) {
      bucket.push(item);
    }
  });
  return result.filter((part) => part.length > 0);
}

"use client";

import {
  AspectRatio,
  LanguageCode,
  SCRIPT_MAX_LENGTH,
  VisualStyle,
  VoiceGender,
  createProjectBodySchema,
} from "@asv/shared";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DURATION_PRESETS, type DurationPresetId } from "../lib/duration-presets";
import { createProject } from "../lib/projects-api";
import { deriveProjectTitle } from "../lib/project-title";
import { FieldLabel } from "./ui/field-label";
import { LoadingButtonLabel } from "./ui/loading-button-label";
import { ToggleRow } from "./ui/toggle-row";

const VISUAL_STYLE_OPTIONS: { value: VisualStyle; label: string }[] = [
  { value: VisualStyle.CINEMATIC, label: "Cinematic" },
  { value: VisualStyle.REALISTIC, label: "Realistic" },
  { value: VisualStyle.ANIME, label: "Anime" },
  { value: VisualStyle.ANIMATION_3D, label: "3D Animation" },
  { value: VisualStyle.CARTOON, label: "Cartoon" },
  { value: VisualStyle.DOCUMENTARY, label: "Documentary" },
  { value: VisualStyle.FANTASY, label: "Fantasy" },
  { value: VisualStyle.HORROR, label: "Horror" },
  { value: VisualStyle.SCI_FI, label: "Sci-Fi" },
  { value: VisualStyle.CUSTOM, label: "Custom" },
];

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function CreateVideoForm() {
  const router = useRouter();
  const [script, setScript] = useState("");
  const [durationPreset, setDurationPreset] = useState<DurationPresetId>("1m");
  const [customDurationMin, setCustomDurationMin] = useState("1");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(
    VisualStyle.CINEMATIC,
  );
  const [customVisualStyle, setCustomVisualStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    AspectRatio.R16_9,
  );
  const [voiceGender, setVoiceGender] = useState<VoiceGender>(
    VoiceGender.FEMALE,
  );
  const [language, setLanguage] = useState<LanguageCode>(LanguageCode.EN);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [submitState, setSubmitState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetDurationSec = useMemo(() => {
    if (durationPreset === "custom") {
      const minutes = Number(customDurationMin);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        return null;
      }
      return Math.round(minutes * 60);
    }
    const preset = DURATION_PRESETS.find((p) => p.id === durationPreset);
    return preset?.seconds ?? null;
  }, [customDurationMin, durationPreset]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitState("loading");
    setErrorMessage(null);

    if (targetDurationSec === null) {
      setSubmitState("error");
      setErrorMessage("Enter a valid custom duration in minutes.");
      return;
    }
    if (targetDurationSec < 60) {
      setSubmitState("error");
      setErrorMessage("Minimum video duration is 60 seconds (1 minute).");
      return;
    }

    const payload = {
      title: deriveProjectTitle(script),
      script,
      targetDurationSec,
      aspectRatio,
      visualStyle,
      customVisualStyle:
        visualStyle === VisualStyle.CUSTOM ? customVisualStyle.trim() : null,
      language,
      voiceSettings: { gender: voiceGender, language },
      subtitleSettings: { enabled: subtitlesEnabled },
      musicSettings: { enabled: musicEnabled, volume: 0.2 },
    };

    const validated = createProjectBodySchema.safeParse(payload);
    if (!validated.success) {
      setSubmitState("error");
      setErrorMessage(validated.error.issues.map((i) => i.message).join(" "));
      return;
    }

    const result = await createProject({ ...validated.data });
    if (!result.success) {
      setSubmitState("error");
      setErrorMessage(result.error.message);
      return;
    }

    router.push(`/projects/${result.data.id}`);
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-8"
      noValidate
    >
      <div className="space-y-2">
        <FieldLabel htmlFor="script" hint="Your story, article, or narration">
          Script
        </FieldLabel>
        <textarea
          id="script"
          name="script"
          rows={12}
          maxLength={SCRIPT_MAX_LENGTH}
          placeholder="Write or paste your story, script, article, or narration here..."
          className={`${inputClass} min-h-[200px] resize-y`}
          value={script}
          onChange={(e) => {
            setScript(e.target.value);
          }}
          required
        />
        <p className="text-right text-xs text-muted">
          {script.length.toLocaleString()} / {SCRIPT_MAX_LENGTH.toLocaleString()}
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          Target duration
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {DURATION_PRESETS.map((preset) => (
            <label
              key={preset.id}
              className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-center text-sm transition ${
                durationPreset === preset.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-surface text-muted hover:border-accent/50"
              }`}
            >
              <input
                type="radio"
                name="duration"
                value={preset.id}
                className="sr-only"
                checked={durationPreset === preset.id}
                onChange={() => {
                  setDurationPreset(preset.id);
                }}
              />
              {preset.label}
            </label>
          ))}
        </div>
        {durationPreset === "custom" ? (
          <div className="max-w-xs">
            <FieldLabel htmlFor="customDuration" hint="Any positive length">
              Custom duration (minutes)
            </FieldLabel>
            <input
              id="customDuration"
              type="number"
              min={0.5}
              step={0.5}
              className={inputClass}
              value={customDurationMin}
              onChange={(e) => {
                setCustomDurationMin(e.target.value);
              }}
            />
          </div>
        ) : null}
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="visualStyle">Video style</FieldLabel>
          <select
            id="visualStyle"
            className={inputClass}
            value={visualStyle}
            onChange={(e) => {
              setVisualStyle(e.target.value as VisualStyle);
            }}
          >
            {VISUAL_STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {visualStyle === VisualStyle.CUSTOM ? (
          <div className="space-y-2 md:col-span-2">
            <FieldLabel htmlFor="customVisualStyle">
              Custom style description
            </FieldLabel>
            <input
              id="customVisualStyle"
              type="text"
              className={inputClass}
              value={customVisualStyle}
              onChange={(e) => {
                setCustomVisualStyle(e.target.value);
              }}
              placeholder="Describe your visual style..."
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <FieldLabel htmlFor="aspectRatio">Aspect ratio</FieldLabel>
          <select
            id="aspectRatio"
            className={inputClass}
            value={aspectRatio}
            onChange={(e) => {
              setAspectRatio(e.target.value as AspectRatio);
            }}
          >
            <option value={AspectRatio.R16_9}>16:9 (landscape)</option>
            <option value={AspectRatio.R9_16}>9:16 (vertical)</option>
            <option value={AspectRatio.R1_1}>1:1 (square)</option>
          </select>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="voice">Voice</FieldLabel>
          <select
            id="voice"
            className={inputClass}
            value={voiceGender}
            onChange={(e) => {
              setVoiceGender(e.target.value as VoiceGender);
            }}
          >
            <option value={VoiceGender.FEMALE}>Female</option>
            <option value={VoiceGender.MALE}>Male</option>
            <option value={VoiceGender.NEUTRAL}>Neutral</option>
          </select>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="language">Language</FieldLabel>
          <select
            id="language"
            className={inputClass}
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as LanguageCode);
            }}
          >
            <option value={LanguageCode.EN}>English</option>
            <option value={LanguageCode.UR}>Urdu</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <ToggleRow
          id="subtitles"
          label="Subtitles"
          description="Burn-in or sidecar captions (pipeline in Phase 17)"
          checked={subtitlesEnabled}
          onChange={setSubtitlesEnabled}
        />
        <ToggleRow
          id="music"
          label="Background music"
          description="Royalty-free or generated bed under narration"
          checked={musicEnabled}
          onChange={setMusicEnabled}
        />
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Saves as <strong className="text-foreground">DRAFT</strong>. Use{" "}
          <code className="text-foreground">MOCK_AI=false</code> with a real image
          provider for cinematic scenes (never solid-color placeholders). Minimum length
          is 60 seconds.
        </p>
        <button
          type="submit"
          disabled={submitState === "loading"}
          aria-busy={submitState === "loading"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LoadingButtonLabel loading={submitState === "loading"} loadingText="Creating…">
            Generate Video
          </LoadingButtonLabel>
        </button>
      </div>
    </form>
  );
}

import type { LanguageCode, VoiceGender } from "./enums.js";

/** Provider-independent voice preferences. */
export interface VoiceSettings {
  gender: VoiceGender;
  /** BCP-47 or app language code; extensible for more locales. */
  language: LanguageCode;
}

export interface SubtitleSettings {
  enabled: boolean;
}

export interface MusicSettings {
  enabled: boolean;
  /** Background bed level when mixed under narration (0–1). */
  volume: number;
}

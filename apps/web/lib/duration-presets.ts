export const DURATION_PRESETS = [
  { id: "1m", label: "1 minute", seconds: 60 },
  { id: "3m", label: "3 minutes", seconds: 180 },
  { id: "5m", label: "5 minutes", seconds: 300 },
  { id: "10m", label: "10 minutes", seconds: 600 },
  { id: "15m", label: "15 minutes", seconds: 900 },
  { id: "20m", label: "20 minutes", seconds: 1200 },
  { id: "custom", label: "Custom", seconds: null },
] as const;

export type DurationPresetId = (typeof DURATION_PRESETS)[number]["id"];

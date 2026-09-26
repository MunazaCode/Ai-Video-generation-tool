import { SettingsProvidersPanel } from "@/components/settings-providers-panel";

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Provider capabilities and configuration come from the API{" "}
          <code className="rounded bg-background px-1 py-0.5">/health</code>{" "}
          endpoint. Set{" "}
          <code className="rounded bg-background px-1 py-0.5">MOCK_AI=false</code>{" "}
          only after required env vars for each selected provider are present.
        </p>
      </div>
      <SettingsProvidersPanel />
    </section>
  );
}

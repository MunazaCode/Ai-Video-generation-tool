"use client";

import { useEffect, useState } from "react";
import { getPublicApiBaseUrl } from "@/lib/api-config";

interface ServiceCapability {
  kind: string;
  providerId: string;
  label: string;
  mock: boolean;
  configured: boolean;
  implemented: boolean;
  missingEnv: string[];
  notes: string;
}

interface HealthProvidersPayload {
  mock: boolean;
  services: ServiceCapability[];
  notes: string;
}

interface HealthPayload {
  mockAi: boolean;
  providers: HealthProvidersPayload;
  providerConfig: {
    valid: boolean;
    issues: { message: string; code: string }[];
  };
}

export function SettingsProvidersPanel() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${getPublicApiBaseUrl()}/health`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: HealthPayload;
        };
        if (!json.success || !json.data) {
          if (!cancelled) {
            setError("Could not read provider status from the API.");
          }
          return;
        }
        if (!cancelled) {
          setData(json.data);
        }
      } catch {
        if (!cancelled) {
          setError("API is unreachable. Start pnpm dev:api to inspect providers.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-sm text-muted" role="status">
        {error}
      </p>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted" role="status">
        Loading provider capabilities…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">API mode</p>
        <p className="mt-1 font-medium">
          {data.mockAi ? "MOCK_AI=true (mock bundle)" : "Real provider selection"}
        </p>
        <p className="mt-2 text-sm text-muted">{data.providers.notes}</p>
        {!data.providerConfig.valid ? (
          <p className="mt-3 text-sm text-red-300" role="alert">
            Configuration issues:{" "}
            {data.providerConfig.issues.map((i) => i.message).join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/40 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.providers.services.map((service) => (
              <tr key={service.kind}>
                <td className="px-4 py-3 capitalize text-foreground">
                  {service.kind}
                </td>
                <td className="px-4 py-3 text-muted">
                  {service.label}{" "}
                  <span className="text-xs">({service.providerId})</span>
                </td>
                <td className="px-4 py-3">
                  {service.implemented && service.configured ? (
                    <span className="text-emerald-300">Ready</span>
                  ) : service.configured ? (
                    <span className="text-amber-200">Stub (not implemented)</span>
                  ) : (
                    <span className="text-red-300">
                      Missing env
                      {service.missingEnv.length > 0
                        ? `: ${service.missingEnv.join(", ")}`
                        : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { ProviderKind } from "./provider-registry.js";

export interface ProviderConfigIssue {
  kind: ProviderKind;
  providerId: string;
  code: "UNKNOWN_PROVIDER" | "MISSING_ENV" | "NOT_IMPLEMENTED" | "MOCK_NOT_ALLOWED";
  message: string;
  missingEnv?: string[];
}

export class ProviderConfigurationError extends Error {
  readonly issues: ProviderConfigIssue[];

  constructor(issues: ProviderConfigIssue[]) {
    const message = formatProviderConfigIssues(issues);
    super(message);
    this.name = "ProviderConfigurationError";
    this.issues = issues;
  }
}

export class ProviderNotImplementedError extends Error {
  constructor(kind: ProviderKind, providerId: string, phaseNote: string) {
    super(
      `${kind} provider "${providerId}" is not implemented yet. ${phaseNote}`,
    );
    this.name = "ProviderNotImplementedError";
  }
}

export function formatProviderConfigIssues(
  issues: ProviderConfigIssue[],
): string {
  return issues.map((i) => i.message).join("; ");
}

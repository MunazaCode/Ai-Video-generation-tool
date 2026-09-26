import { randomUUID } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function nowMs(): Date {
  return new Date();
}

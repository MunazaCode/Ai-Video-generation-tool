import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDrizzle, resolveSqlitePath, type DrizzleDb } from "./client.js";
import { CharacterRepository } from "./repositories/character-repository.js";
import { JobRepository } from "./repositories/job-repository.js";
import { LocationRepository } from "./repositories/location-repository.js";
import { ProjectRepository } from "./repositories/project-repository.js";
import { SceneRepository } from "./repositories/scene-repository.js";

export { createDrizzle, createSqliteConnection, resolveSqlitePath } from "./client.js";
export type { DrizzleDb } from "./client.js";
export { applyMigrations, migrateDatabase } from "./migrate.js";
export * from "./schema.js";
export {
  ProjectRepository,
  SceneRepository,
  JobRepository,
  CharacterRepository,
  LocationRepository,
};
export {
  buildSceneGenerationJobs,
  buildSingleSceneRegenerationJobs,
  type BuildSceneGenerationJobsOptions,
} from "./repositories/job-repository.js";

export interface Repositories {
  projects: ProjectRepository;
  scenes: SceneRepository;
  jobs: JobRepository;
  characters: CharacterRepository;
  locations: LocationRepository;
}

export interface DatabaseContext {
  db: DrizzleDb;
  repositories: Repositories;
}

export function createRepositories(db: DrizzleDb): Repositories {
  return {
    projects: new ProjectRepository(db),
    scenes: new SceneRepository(db),
    jobs: new JobRepository(db),
    characters: new CharacterRepository(db),
    locations: new LocationRepository(db),
  };
}

function ensureDatabaseDirectory(databaseUrl: string): void {
  const filePath = resolveSqlitePath(databaseUrl);
  if (filePath === ":memory:" || filePath.includes("memory")) {
    return;
  }
  const dir = path.dirname(path.resolve(filePath));
  mkdirSync(dir, { recursive: true });
}

export function createDatabase(databaseUrl: string): DatabaseContext {
  ensureDatabaseDirectory(databaseUrl);
  const db = createDrizzle(databaseUrl);
  return { db, repositories: createRepositories(db) };
}

export function dbPackageReady(): string {
  return "SQLite repositories (projects, scenes, jobs)";
}

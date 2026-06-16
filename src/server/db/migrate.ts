import { promises as fs } from "node:fs";
import * as path from "node:path";
import { FileMigrationProvider, Migrator } from "kysely";
import { db } from "./client";

async function createMigrator() {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(import.meta.dirname, "migrations"),
    }),
  });
}

async function run() {
  const direction = process.argv[2] ?? "up";
  const migrator = await createMigrator();

  const { error, results } =
    direction === "down"
      ? await migrator.migrateDown()
      : await migrator.migrateToLatest();

  for (const r of results ?? []) {
    if (r.status === "Success") {
      console.log(`✓ ${r.direction} "${r.migrationName}"`);
    } else if (r.status === "Error") {
      console.error(`✗ failed ${r.direction} "${r.migrationName}"`);
    }
  }

  if (error) {
    console.error("Migration failed:", error);
    await db.destroy();
    process.exit(1);
  }

  await db.destroy();
  console.log("Migrations complete.");
}

run();

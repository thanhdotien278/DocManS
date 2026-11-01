import "dotenv/config";
import { execFileSync } from "node:child_process";
import { Client } from "pg";

/**
 * Creates an empty PostgreSQL database next to DATABASE_URL, applies every committed
 * migration with `prisma migrate deploy`, and returns its URL plus a drop() cleanup.
 * The primary database is only used to issue CREATE/DROP DATABASE; no data is touched.
 */
export async function createMigratedDatabase(label) {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("DATABASE_URL is required for real-PostgreSQL tests (start it with `docker compose up -d postgres`).");
  const name = `docmans_test_${label}_${process.pid}_${Date.now()}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const admin = new Client({ connectionString: baseUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  url.searchParams.set("schema", "public");
  execFileSync("node_modules/.bin/prisma", ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "pipe"
  });

  return {
    url: url.toString(),
    async drop() {
      const cleanup = new Client({ connectionString: baseUrl });
      await cleanup.connect();
      try {
        await cleanup.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()", [name]);
        await cleanup.query(`DROP DATABASE IF EXISTS "${name}"`);
      } finally {
        await cleanup.end();
      }
    }
  };
}

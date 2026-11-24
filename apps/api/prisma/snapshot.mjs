import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { Client as MinioClient } from "minio";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "schema.prisma");
const SNAPSHOT_DIR = join(__dirname, "snapshot");
export const DATA_SNAPSHOT_PATH = join(SNAPSHOT_DIR, "demo-data.json.gz");
export const MINIO_SNAPSHOT_PATH = join(SNAPSHOT_DIR, "minio-objects.pack.gz");

const SNAPSHOT_MARKER_PROPOSAL_ID = "dash-seed-proposal-01";
const EXCLUDED_TABLES = new Set([
  "_prisma_migrations",
  "sessions",
  "password_reset_tokens",
  "account_activation_tokens",
  "account_credential_deliveries",
  "login_challenges"
]);
const EXCLUDED_COLUMNS = { users: new Set(["login_otp_enabled"]) };
const SCALAR_TYPES = new Set(["String", "Boolean", "Int", "Float", "Decimal", "DateTime", "Json", "BigInt", "Bytes"]);
const RAW_OIDS = new Set([1082, 1114, 1184, 1700, 20]);
const rawPgTypes = {
  getTypeParser(oid, format) {
    if (RAW_OIDS.has(oid)) return (val) => val;
    return pg.types.getTypeParser(oid, format);
  }
};

function quoteIdent(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

function qualifiedTable(schema, table) {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

function parseSchemaColumns() {
  const src = readFileSync(SCHEMA_PATH, "utf8");
  const enums = new Set();
  for (const match of src.matchAll(/^enum\s+(\w+)\s*\{/gm)) enums.add(match[1]);

  const tables = new Map();
  let current = null;
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.trim();
    const modelMatch = /^model\s+(\w+)\s*\{/.exec(line);
    if (modelMatch) {
      current = { table: modelMatch[1], cols: [] };
      continue;
    }
    if (!current) continue;
    if (line === "}") {
      tables.set(current.table, new Set(current.cols));
      current = null;
      continue;
    }
    const tableMap = /^@@map\("([^"]+)"\)/.exec(line);
    if (tableMap) {
      current.table = tableMap[1];
      continue;
    }
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
    const fieldMatch = /^(\w+)\s+([^\s]+)/.exec(line);
    if (!fieldMatch) continue;
    const baseType = fieldMatch[2].replace(/[?\[\]]+$/g, "");
    if (!SCALAR_TYPES.has(baseType) && !enums.has(baseType)) continue;
    const colMap = /@map\("([^"]+)"\)/.exec(line);
    current.cols.push(colMap ? colMap[1] : fieldMatch[1]);
  }
  return tables;
}

async function querySchemaMetadata(client, schema) {
  const colRes = await client.query(
    `SELECT table_name, column_name, udt_name
     FROM information_schema.columns
     WHERE table_schema = $1
     ORDER BY table_name, ordinal_position`,
    [schema]
  );

  const columnsByTable = new Map();
  for (const row of colRes.rows) {
    if (EXCLUDED_TABLES.has(row.table_name)) continue;
    if (EXCLUDED_COLUMNS[row.table_name]?.has(row.column_name)) continue;
    if (!columnsByTable.has(row.table_name)) columnsByTable.set(row.table_name, []);
    columnsByTable.get(row.table_name).push({ name: row.column_name, udt: row.udt_name });
  }

  const fkRes = await client.query(
    `SELECT DISTINCT cl1.relname AS child_table, att1.attname AS child_col, cl2.relname AS parent_table
     FROM pg_constraint con
     JOIN pg_class cl1 ON cl1.oid = con.conrelid
     JOIN pg_class cl2 ON cl2.oid = con.confrelid
     JOIN pg_namespace ns ON ns.oid = cl1.relnamespace
     JOIN LATERAL unnest(con.conkey) AS k(attnum) ON true
     JOIN pg_attribute att1 ON att1.attrelid = cl1.oid AND att1.attnum = k.attnum
     WHERE con.contype = 'f' AND ns.nspname = $1`,
    [schema]
  );

  const pkRes = await client.query(
    `SELECT c.relname AS table_name, array_agg(a.attname ORDER BY k.ord) AS pk_cols
     FROM pg_index i
     JOIN pg_class c ON c.oid = i.indrelid
     JOIN pg_namespace ns ON ns.oid = c.relnamespace
     JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
     JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
     WHERE i.indisprimary AND ns.nspname = $1
     GROUP BY c.relname`,
    [schema]
  );

  const pkByTable = new Map();
  for (const row of pkRes.rows) {
    const pkCols = Array.isArray(row.pk_cols)
      ? row.pk_cols
      : String(row.pk_cols).replace(/^\{|\}$/g, "").split(",").filter(Boolean);
    pkByTable.set(row.table_name, pkCols);
  }

  return { columnsByTable, fks: fkRes.rows, pkByTable };
}

function topologicalOrder(tableNames, fks) {
  const tableSet = new Set(tableNames);
  const deps = new Map(tableNames.map((t) => [t, new Set()]));
  const children = new Map(tableNames.map((t) => [t, new Set()]));
  const selfFks = new Map();

  for (const fk of fks) {
    if (!tableSet.has(fk.child_table) || !tableSet.has(fk.parent_table)) continue;
    if (fk.child_table === fk.parent_table) {
      if (!selfFks.has(fk.child_table)) selfFks.set(fk.child_table, new Set());
      selfFks.get(fk.child_table).add(fk.child_col);
      continue;
    }
    deps.get(fk.child_table).add(fk.parent_table);
    children.get(fk.parent_table).add(fk.child_table);
  }

  const inDegree = new Map(tableNames.map((t) => [t, deps.get(t).size]));
  const queue = tableNames.filter((t) => inDegree.get(t) === 0).sort();
  const ordered = [];

  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);
    for (const child of children.get(current)) {
      const nextDeg = inDegree.get(child) - 1;
      inDegree.set(child, nextDeg);
      if (nextDeg === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  if (ordered.length !== tableNames.length) {
    const remaining = tableNames.filter((t) => !ordered.includes(t));
    throw new Error(`Circular foreign-key dependency detected across tables: ${remaining.join(", ")}`);
  }

  return { ordered, selfFks };
}

function getMinioConfig() {
  const endpoint = process.env.MINIO_ENDPOINT?.trim();
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();
  const bucket = process.env.MINIO_BUCKET_NAME?.trim();
  if (!endpoint || !accessKey || !secretKey || !bucket) return null;
  return {
    bucket,
    region: process.env.MINIO_REGION?.trim() || "us-east-1",
    client: new MinioClient({
      endPoint: endpoint,
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: ["1", "true", "yes"].includes((process.env.MINIO_USE_SSL ?? "").trim().toLowerCase()),
      accessKey,
      secretKey
    })
  };
}

function packMinioObjects(items) {
  const meta = items.map((item) => ({ key: item.key, contentType: item.contentType, size: item.buffer.length }));
  const metaBuf = Buffer.from(JSON.stringify(meta), "utf8");
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(metaBuf.length, 0);
  return gzipSync(Buffer.concat([header, metaBuf, ...items.map((item) => item.buffer)]), { level: 9 });
}

function unpackMinioObjects(compressedBuffer) {
  const raw = gunzipSync(compressedBuffer);
  const metaLen = raw.readUInt32BE(0);
  const meta = JSON.parse(raw.subarray(4, 4 + metaLen).toString("utf8"));
  let offset = 4 + metaLen;
  return meta.map((entry) => {
    const buffer = raw.subarray(offset, offset + entry.size);
    offset += entry.size;
    return { key: entry.key, contentType: entry.contentType, buffer };
  });
}

function paramCastForColumn(udt) {
  if (udt === "jsonb") return "::jsonb";
  if (udt === "json") return "::json";
  if (udt === "_text") return "::text[]";
  return "";
}

function encodeValueForPg(value, udt) {
  if (value === null || value === undefined) return null;
  if (udt === "jsonb" || udt === "json") return JSON.stringify(value);
  return value;
}

export async function exportSnapshot({ databaseUrl, databaseSchema = "public" }) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const schemaColumns = parseSchemaColumns();
  const client = new pg.Client({
    connectionString: databaseUrl,
    options: `-c search_path=${databaseSchema}`,
    types: rawPgTypes
  });
  await client.connect();

  try {
    const { columnsByTable, pkByTable } = await querySchemaMetadata(client, databaseSchema);
    const tables = {};

    for (const [tableName, dbCols] of [...columnsByTable.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const allowedCols = schemaColumns.get(tableName);
      if (!allowedCols) continue;
      const exportCols = dbCols.map((c) => c.name).filter((col) => allowedCols.has(col));
      if (exportCols.length === 0) continue;

      const pkCols = (pkByTable.get(tableName) ?? []).filter((col) => exportCols.includes(col));
      const orderClause = pkCols.length > 0 ? ` ORDER BY ${pkCols.map(quoteIdent).join(", ")}` : "";
      const sql = `SELECT ${exportCols.map(quoteIdent).join(", ")} FROM ${qualifiedTable(databaseSchema, tableName)}${orderClause}`;
      const res = await client.query(sql);
      tables[tableName] = { columns: exportCols, rows: res.rows };
    }

    const payload = { version: 1, exportedAt: new Date().toISOString(), tables };
    writeFileSync(DATA_SNAPSHOT_PATH, gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 9 }));

    let minioCount = 0;
    const minioCfg = getMinioConfig();
    if (minioCfg) {
      const items = [];
      if (await minioCfg.client.bucketExists(minioCfg.bucket)) {
        for await (const obj of minioCfg.client.listObjectsV2(minioCfg.bucket, "", true)) {
          const stream = await minioCfg.client.getObject(minioCfg.bucket, obj.name);
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const stat = await minioCfg.client.statObject(minioCfg.bucket, obj.name);
          items.push({
            key: obj.name,
            contentType: stat.metaData?.["content-type"] || "application/octet-stream",
            buffer: Buffer.concat(chunks)
          });
        }
        items.sort((a, b) => a.key.localeCompare(b.key));
      }
      minioCount = items.length;
      writeFileSync(MINIO_SNAPSHOT_PATH, packMinioObjects(items));
    }

    console.log(
      `Exported snapshot: ${Object.keys(tables).length} tables -> ${DATA_SNAPSHOT_PATH}; ${minioCount} MinIO objects -> ${MINIO_SNAPSHOT_PATH}`
    );
  } finally {
    await client.end();
  }
}

async function syncMinioSnapshot(resetAll) {
  const minioCfg = getMinioConfig();
  if (!minioCfg || !existsSync(MINIO_SNAPSHOT_PATH)) {
    return;
  }

  const items = unpackMinioObjects(readFileSync(MINIO_SNAPSHOT_PATH));
  const exists = await minioCfg.client.bucketExists(minioCfg.bucket);
  if (!exists) {
    await minioCfg.client.makeBucket(minioCfg.bucket, minioCfg.region);
  }

  const existingKeys = new Set();
  if (!resetAll) {
    for await (const obj of minioCfg.client.listObjectsV2(minioCfg.bucket, "", true)) {
      existingKeys.add(obj.name);
    }
  }

  let uploaded = 0;
  for (const item of items) {
    if (!resetAll && existingKeys.has(item.key)) continue;
    await minioCfg.client.putObject(minioCfg.bucket, item.key, item.buffer, item.buffer.length, {
      "Content-Type": item.contentType || "application/octet-stream"
    });
    uploaded++;
  }
  console.log(`Snapshot MinIO sync: ${uploaded} uploaded (${items.length} total in pack).`);
}

export async function applySnapshotIfAvailable({ databaseUrl, databaseSchema = "public" }) {
  if (!existsSync(DATA_SNAPSHOT_PATH)) return false;

  const resetAll = process.env.SEED_RESET === "true";
  const isProduction = process.env.NODE_ENV === "production" && process.env.SEED_DEMO_ACCOUNTS !== "true";
  const client = new pg.Client({
    connectionString: databaseUrl,
    options: `-c search_path=${databaseSchema}`
  });
  await client.connect();

  try {
    const markerRes = await client.query(
      `SELECT 1 FROM ${qualifiedTable(databaseSchema, "research_proposals")} WHERE "id" = $1 LIMIT 1`,
      [SNAPSHOT_MARKER_PROPOSAL_ID]
    );
    const alreadySeeded = markerRes.rowCount > 0;

    if (!alreadySeeded || resetAll) {
      let adminPasswordHash = null;
      if (isProduction) {
        const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
        if (adminPassword.length < 12) {
          throw new Error("SEED_ADMIN_PASSWORD (at least 12 characters) is required when NODE_ENV=production.");
        }
        const salt = randomBytes(16).toString("hex");
        adminPasswordHash = `scrypt:${salt}:${scryptSync(adminPassword, salt, 64).toString("hex")}`;
      }

      const snapshot = JSON.parse(gunzipSync(readFileSync(DATA_SNAPSHOT_PATH)).toString("utf8"));
      const { columnsByTable, fks, pkByTable } = await querySchemaMetadata(client, databaseSchema);
      const targetTables = [...columnsByTable.keys()];
      const { ordered, selfFks } = topologicalOrder(targetTables, fks);

      await client.query("BEGIN");
      try {
        if (targetTables.length > 0) {
          const truncateList = targetTables.map((t) => qualifiedTable(databaseSchema, t)).join(", ");
          await client.query(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`);
        }

        const BATCH_SIZE = 150;
        for (const tableName of ordered) {
          const snapTable = snapshot.tables?.[tableName];
          if (!snapTable || !Array.isArray(snapTable.rows) || snapTable.rows.length === 0) continue;

          const dbCols = columnsByTable.get(tableName) ?? [];
          const dbColMap = new Map(dbCols.map((c) => [c.name, c.udt]));
          const insertCols = snapTable.columns.filter((col) => dbColMap.has(col));
          if (insertCols.length === 0) continue;

          const tableSelfFks = selfFks.get(tableName) ?? new Set();
          const colListSql = insertCols.map(quoteIdent).join(", ");
          const targetQualified = qualifiedTable(databaseSchema, tableName);

          for (let start = 0; start < snapTable.rows.length; start += BATCH_SIZE) {
            const batch = snapTable.rows.slice(start, start + BATCH_SIZE);
            const values = [];
            const rowPlaceholders = [];

            for (const row of batch) {
              const placeholders = [];
              for (const col of insertCols) {
                const udt = dbColMap.get(col);
                const rawVal = tableSelfFks.has(col) ? null : row[col];
                values.push(encodeValueForPg(rawVal, udt));
                placeholders.push(`$${values.length}${paramCastForColumn(udt)}`);
              }
              rowPlaceholders.push(`(${placeholders.join(", ")})`);
            }

            await client.query(
              `INSERT INTO ${targetQualified} (${colListSql}) VALUES ${rowPlaceholders.join(", ")}`,
              values
            );
          }

          if (tableSelfFks.size > 0) {
            const pkCols = pkByTable.get(tableName) ?? ["id"];
            for (const selfCol of tableSelfFks) {
              if (!insertCols.includes(selfCol)) continue;
              const udt = dbColMap.get(selfCol);
              const whereClause = pkCols.map((pk, idx) => `${quoteIdent(pk)} = $${idx + 2}`).join(" AND ");
              const updateSql = `UPDATE ${targetQualified} SET ${quoteIdent(selfCol)} = $1${paramCastForColumn(udt)} WHERE ${whereClause}`;
              for (const row of snapTable.rows) {
                const val = row[selfCol];
                if (val === null || val === undefined) continue;
                await client.query(updateSql, [encodeValueForPg(val, udt), ...pkCols.map((pk) => row[pk])]);
              }
            }
          }
        }

        if (isProduction && adminPasswordHash) {
          const usersTable = qualifiedTable(databaseSchema, "users");
          await client.query(
            `UPDATE ${usersTable} SET "password_hash" = $1, "must_change_password" = true, "status" = 'active' WHERE "id" = 'user-admin'`,
            [adminPasswordHash]
          );
          await client.query(`UPDATE ${usersTable} SET "status" = 'inactive' WHERE "id" <> 'user-admin'`);
        }

        await client.query("COMMIT");
        console.log(`Snapshot DB restore complete (${ordered.length} tables processed).`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    } else {
      console.log("Snapshot marker already present; keeping existing database rows.");
    }
  } finally {
    await client.end();
  }

  await syncMinioSnapshot(resetAll);
  return true;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const mode = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }
  const databaseSchema = new URL(databaseUrl).searchParams.get("schema") ?? "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseSchema)) {
    throw new Error("Invalid DATABASE_URL schema.");
  }

  if (mode === "export") {
    await exportSnapshot({ databaseUrl, databaseSchema });
  } else if (mode === "import") {
    await applySnapshotIfAvailable({ databaseUrl, databaseSchema });
  } else {
    throw new Error("Usage: node apps/api/prisma/snapshot.mjs <export|import>");
  }
}

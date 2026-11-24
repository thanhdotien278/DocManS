#!/usr/bin/env node
// Chốt chặn nợ kiểu dữ liệu: đếm các chỗ "lỏng" (any, as never, as unknown as, AnyRecord, @ts-ignore) trong mã nguồn
// và báo lỗi nếu số lượng tăng so với mốc trong scripts/type-looseness-baseline.json. Giảm thì luôn được phép;
// sau khi dọn bớt, chạy `node scripts/check-type-looseness.mjs --update` để hạ mốc.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const baselinePath = join(root, "scripts/type-looseness-baseline.json");
const sourceDirs = ["apps/api/src", "apps/web/src", "packages"];
const patterns = {
  "any (chú thích kiểu)": /:\s*any\b(?!\w)/g,
  "as any": /\bas any\b/g,
  "as never": /\bas never\b/g,
  "as unknown as": /\bas unknown as\b/g,
  AnyRecord: /\bAnyRecord\b/g,
  "@ts-ignore": /@ts-ignore/g
};

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) yield path;
  }
}

const counts = Object.fromEntries(Object.keys(patterns).map((key) => [key, 0]));
const perFile = {};
for (const dir of sourceDirs) {
  for (const file of sourceFiles(join(root, dir))) {
    const text = readFileSync(file, "utf8");
    for (const [key, pattern] of Object.entries(patterns)) {
      const found = text.match(pattern)?.length ?? 0;
      counts[key] += found;
      if (found) perFile[relative(root, file)] = (perFile[relative(root, file)] ?? 0) + found;
    }
  }
}

if (process.argv.includes("--update")) {
  writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
  console.log("Đã cập nhật mốc:", counts);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
const worse = Object.entries(counts).filter(([key, value]) => value > (baseline[key] ?? 0));
for (const [key, value] of Object.entries(counts)) console.log(`${key.padEnd(22)} ${String(value).padStart(5)}  (mốc ${baseline[key] ?? 0})`);
if (worse.length) {
  console.error(`\nNợ kiểu tăng: ${worse.map(([key, value]) => `${key} ${baseline[key] ?? 0} → ${value}`).join(", ")}.`);
  console.error("Dùng kiểu cụ thể thay vì any/ép kiểu. Các file nhiều nhất:");
  for (const [file, value] of Object.entries(perFile).sort((a, b) => b[1] - a[1]).slice(0, 5)) console.error(`  ${value}\t${file}`);
  process.exit(1);
}
const better = Object.entries(counts).some(([key, value]) => value < (baseline[key] ?? 0));
console.log(better ? "\nĐạt (đã giảm; chạy với --update để hạ mốc)." : "\nĐạt.");

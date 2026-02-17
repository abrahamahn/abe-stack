import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.join("main", "shared");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "_graphs");

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// 테스트 제외: __tests__ + *.test.* + *.spec.*
const EXCLUDE = String.raw`(__tests__|\.test\.|\.spec\.)`;

const targets = [
  { name: "shared-src", dir: SRC },
  { name: "shared-primitives", dir: path.join(SRC, "primitives") },
  { name: "shared-engine", dir: path.join(SRC, "engine") },
  { name: "shared-core", dir: path.join(SRC, "core") },
  { name: "shared-contracts", dir: path.join(SRC, "contracts") },
  { name: "shared-api", dir: path.join(SRC, "api") },
  { name: "shared-config", dir: path.join(SRC, "config") },
];

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

for (const t of targets) {
  const outFile = path.join(OUT, `${t.name}.svg`);
  const cmd = [
    "npx madge",
    `"${t.dir}"`,
    `--ts-config "${path.join(ROOT, "tsconfig.json")}"`,
    "--extensions ts",
    `--exclude "${EXCLUDE}"`,
    `--image "${outFile}"`,
  ].join(" ");

  console.log(`\n▶ ${t.name}`);
  run(cmd);
}

console.log(`\n✅ Graphs written to: ${OUT}`);

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderSvg } from "../src/core/render-svg.mjs";
import { validateDocument } from "../src/core/validate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = resolve(root, "examples/jade-spirit-stone/document.json");
const outputDir = resolve(root, "examples/jade-spirit-stone/generated");

const document = JSON.parse(await readFile(fixturePath, "utf8"));
const validation = validateDocument(document);
if (!validation.ok) {
  console.error(JSON.stringify(validation, null, 2));
  process.exit(1);
}

const svg = renderSvg(document);
const sha256 = createHash("sha256").update(svg).digest("hex");

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "jade-spirit-stone.svg"), svg, "utf8");

let pngRendered = false;
try {
  execFileSync(
    "rsvg-convert",
    [
      "--format=png",
      "--output",
      resolve(outputDir, "jade-spirit-stone.png"),
      resolve(outputDir, "jade-spirit-stone.svg")
    ],
    { stdio: "inherit" }
  );
  pngRendered = true;
} catch {
  if (process.env.REQUIRE_PNG === "1") {
    console.error("rsvg-convert is required when REQUIRE_PNG=1");
    process.exit(1);
  }
}

const report = {
  fixture: "jade-spirit-stone",
  valid: true,
  nodeCount: document.nodes.length,
  svgSha256: sha256,
  pngRendered,
  warnings: validation.warnings
};

await writeFile(resolve(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify(report, null, 2));

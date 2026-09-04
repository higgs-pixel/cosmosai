import { statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error("At least one test file is required.");
  process.exit(1);
}

for (const file of files) {
  try {
    if (!statSync(path.resolve(file)).isFile()) throw new Error("not a file");
  } catch {
    console.error(`Required test file is missing: ${file.replaceAll("\\", "/")}`);
    process.exit(1);
  }
}

const result = spawnSync(
  process.execPath,
  [
    "--test",
    "--experimental-strip-types",
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    ...files,
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error("Unable to start the Node.js test runner.");
  process.exit(1);
}

process.exit(result.status ?? 1);

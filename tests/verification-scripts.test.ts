import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const runner = path.join(root, "scripts", "run-node-tests.mjs");
const securityCheck = path.join(root, "scripts", "security-check.mjs");

test("test runner fails clearly when a required test file is missing", () => {
  const result = spawnSync(process.execPath, [runner, "tests/does-not-exist.test.ts"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Required test file is missing: tests\/does-not-exist\.test\.ts/);
});

test("security check rejects browser-prefixed provider secrets", () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "cosmos-security-check-"));
  mkdirSync(path.join(fixture, "src"));
  writeFileSync(
    path.join(fixture, "src", "client.ts"),
    'const leaked = process.env.NEXT_PUBLIC_OPENAI_API_KEY;\n',
  );

  try {
    const result = spawnSync(process.execPath, [securityCheck, fixture], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_PUBLIC_OPENAI_API_KEY/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

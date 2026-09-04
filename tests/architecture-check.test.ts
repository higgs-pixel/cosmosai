import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { analyzeArchitecture } from "../scripts/architecture-check.ts";

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "cosmos-architecture-"));
  for (const [relativePath, source] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, source, "utf8");
  }
  return root;
}

const strictConfig = {
  environmentAccess: { allowed: [], exceptions: {} },
  oversizedFiles: { maxLines: 20, exceptions: {} },
};

test("architecture check reports direct environment access with an actionable path", async (context) => {
  const root = await fixture({
    "src/lib/provider.ts": "export const key = process.env.SECRET_KEY;\n",
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.ok(
    violations.some(
      (violation) =>
        violation.rule === "no-direct-process-env" &&
        violation.file === "src/lib/provider.ts" &&
        violation.message.includes("configuration boundary"),
    ),
  );
});

test("architecture check detects environment access inside template expressions", async (context) => {
  const root = await fixture({
    "src/lib/provider.ts": "export const value = `token-${process.env.SECRET_KEY}`;\n",
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.ok(violations.some((violation) => violation.rule === "no-direct-process-env"));
});

test("architecture check rejects client imports of server-only modules", async (context) => {
  const root = await fixture({
    "src/components/client.tsx": '"use client";\nimport { serverEnv } from "../lib/config/env.server";\n',
    "src/lib/config/env.server.ts": 'import "server-only";\nexport const serverEnv = {};\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.ok(violations.some((violation) => violation.rule === "no-client-server-import"));
});

test("architecture check rejects transitive client imports of server-only modules", async (context) => {
  const root = await fixture({
    "src/components/client.tsx": '"use client";\nimport { facade } from "../lib/facade";\nexport const value = facade;\n',
    "src/lib/facade.ts": 'import { secret } from "./secret.server";\nexport const facade = secret;\n',
    "src/lib/secret.server.ts": 'import "server-only";\nexport const secret = "server";\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.ok(violations.some((violation) => violation.rule === "no-client-server-import"));
});

test("architecture check ignores type-only imports from server modules", async (context) => {
  const root = await fixture({
    "src/components/client.tsx": '"use client";\nimport type { Secret } from "../lib/secret.server";\nexport type Value = Secret;\n',
    "src/lib/secret.server.ts": 'import "server-only";\nexport type Secret = string;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.equal(violations.some((violation) => violation.rule === "no-client-server-import"), false);
});

test("architecture check treats use-server modules as explicit server-action boundaries", async (context) => {
  const root = await fixture({
    "src/components/client.tsx": '"use client";\nimport { action } from "../app/actions";\nexport const value = action;\n',
    "src/app/actions.ts": '"use server";\nimport { secret } from "../lib/secret.server";\nexport async function action() { return secret; }\n',
    "src/lib/secret.server.ts": 'import "server-only";\nexport const secret = "server";\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.equal(violations.some((violation) => violation.rule === "no-client-server-import"), false);
});

test("architecture check rejects exceptions for files that do not exist", async (context) => {
  const root = await fixture({ "src/lib/safe.ts": "export const safe = true;\n" });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, {
    ...strictConfig,
    environmentAccess: {
      allowed: [],
      exceptions: { "src/lib/missing.ts": "This exception must not be silently ignored." },
    },
  });

  assert.ok(
    violations.some(
      (violation) =>
        violation.rule === "invalid-architecture-exception" &&
        violation.file === "src/lib/missing.ts",
    ),
  );
});

test("architecture check rejects imports from shared libraries into app or component layers", async (context) => {
  const root = await fixture({
    "src/lib/domain.ts": 'import { Widget } from "@/components/widget";\nexport const value = Widget;\n',
    "src/components/widget.tsx": "export const Widget = null;\n",
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.ok(violations.some((violation) => violation.rule === "shared-layer-direction"));
});

test("architecture check detects circular static imports", async (context) => {
  const root = await fixture({
    "src/lib/a.ts": 'import "./b";\nexport const a = true;\n',
    "src/lib/b.ts": 'import "./a";\nexport const b = true;\n',
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);

  assert.ok(
    violations.some(
      (violation) =>
        violation.rule === "no-static-import-cycles" &&
        violation.message.includes("a.ts"),
    ),
  );
});

test("architecture check flags oversized files unless the exact path is documented", async (context) => {
  const source = Array.from({ length: 21 }, (_, index) => `export const n${index} = ${index};`).join("\n");
  const root = await fixture({ "src/lib/large.ts": source });
  context.after(() => rm(root, { recursive: true, force: true }));

  const violations = await analyzeArchitecture(root, strictConfig);
  const excepted = await analyzeArchitecture(root, {
    ...strictConfig,
    oversizedFiles: {
      maxLines: 20,
      exceptions: { "src/lib/large.ts": "Legacy module tracked for later extraction." },
    },
  });

  assert.ok(violations.some((violation) => violation.rule === "max-file-lines"));
  assert.equal(excepted.some((violation) => violation.rule === "max-file-lines"), false);
});

test("architecture check ignores only explicit generated directories", async (context) => {
  const root = await fixture({
    ".next/generated.ts": "export const key = process.env.SECRET;\n",
    "node_modules/pkg/index.js": "export const key = process.env.SECRET;\n",
    "src/lib/safe.ts": "export const safe = true;\n",
  });
  context.after(() => rm(root, { recursive: true, force: true }));

  assert.deepEqual(await analyzeArchitecture(root, strictConfig), []);
});

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type ArchitectureViolation = {
  rule:
    | "no-direct-process-env"
    | "no-client-server-import"
    | "shared-layer-direction"
    | "max-file-lines"
    | "no-static-import-cycles"
    | "invalid-architecture-exception";
  file: string;
  message: string;
};

type ExceptionMap = Record<string, string>;

export type ArchitectureConfig = {
  environmentAccess?: { allowed?: string[]; exceptions?: ExceptionMap };
  clientServerImports?: { exceptions?: ExceptionMap };
  layerDirection?: { exceptions?: ExceptionMap };
  oversizedFiles?: { maxLines?: number; exceptions?: ExceptionMap };
};

type ResolvedArchitectureConfig = {
  environmentAccess: { allowed: string[]; exceptions: ExceptionMap };
  clientServerImports: { exceptions: ExceptionMap };
  layerDirection: { exceptions: ExceptionMap };
  oversizedFiles: { maxLines: number; exceptions: ExceptionMap };
};

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const GENERATED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);
const IMPORT_PATTERN = /(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?["']([^"']+)["']/g;

function slash(value: string) {
  return value.split(path.sep).join("/");
}

async function collectSourceFiles(root: string, directory = root): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && GENERATED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(root, absolute)));
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function extractImports(source: string) {
  return [...source.matchAll(IMPORT_PATTERN)]
    .filter((match) => !/^(?:import|export)\s+type\b/.test(match[0]))
    .map((match) => match[1]);
}

function stripStringsAndComments(source: string): string {
  return source.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g,
    (match) => {
      if (match.startsWith("`")) {
        const expressions = [...match.matchAll(/\$\{([\s\S]*?)\}/g)]
          .map((entry) => entry[1])
          .join(" ");
        return stripStringsAndComments(expressions);
      }
      return match.startsWith("//") || match.startsWith("/*") ? " " : '""';
    },
  );
}

function findReachableServerOnlyModule(
  start: string,
  graph: Map<string, string[]>,
  serverOnlyFiles: Set<string>,
  serverActionFiles: Set<string>,
) {
  const visited = new Set<string>();
  const pending = [...(graph.get(start) ?? [])];
  while (pending.length > 0) {
    const dependency = pending.pop();
    if (!dependency || visited.has(dependency)) continue;
    if (serverOnlyFiles.has(dependency)) return dependency;
    visited.add(dependency);
    if (serverActionFiles.has(dependency)) continue;
    pending.push(...(graph.get(dependency) ?? []));
  }
  return undefined;
}

function resolveImport(sourceFile: string, specifier: string, root: string, fileSet: Set<string>) {
  let candidate: string;
  if (specifier.startsWith("@/")) candidate = path.join(root, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) candidate = path.resolve(path.dirname(sourceFile), specifier);
  else return undefined;

  const candidates = [
    candidate,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].map((extension) => `${candidate}${extension}`),
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs"].map((extension) => path.join(candidate, `index${extension}`)),
  ];
  return candidates.find((item) => fileSet.has(path.resolve(item)));
}

function findCycles(graph: Map<string, string[]>) {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const signatures = new Set<string>();

  function visit(node: string) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      const cycle = [...stack.slice(start), node];
      const signature = [...new Set(cycle)].sort().join("|");
      if (!signatures.has(signature)) {
        signatures.add(signature);
        cycles.push(cycle);
      }
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) visit(node);
  return cycles;
}

function exceptionReason(
  config: ResolvedArchitectureConfig,
  group: "environmentAccess" | "clientServerImports" | "layerDirection" | "oversizedFiles",
  file: string,
) {
  return config[group].exceptions?.[file];
}

export async function analyzeArchitecture(
  root: string,
  suppliedConfig: ArchitectureConfig = {},
): Promise<ArchitectureViolation[]> {
  const config: ResolvedArchitectureConfig = {
    environmentAccess: { allowed: [], exceptions: {}, ...suppliedConfig.environmentAccess },
    clientServerImports: { exceptions: {}, ...suppliedConfig.clientServerImports },
    layerDirection: { exceptions: {}, ...suppliedConfig.layerDirection },
    oversizedFiles: { maxLines: 1_000, exceptions: {}, ...suppliedConfig.oversizedFiles },
  };
  const absoluteRoot = path.resolve(root);
  const files = await collectSourceFiles(absoluteRoot);
  const fileSet = new Set(files.map((file) => path.resolve(file)));
  const sources = new Map<string, string>();
  const graph = new Map<string, string[]>();
  const violations: ArchitectureViolation[] = [];

  for (const file of files) sources.set(file, await readFile(file, "utf8"));

  for (const group of [
    "environmentAccess",
    "clientServerImports",
    "layerDirection",
    "oversizedFiles",
  ] as const) {
    for (const exceptionPath of Object.keys(config[group].exceptions ?? {})) {
      if (!fileSet.has(path.resolve(absoluteRoot, exceptionPath))) {
        violations.push({
          rule: "invalid-architecture-exception",
          file: exceptionPath,
          message: `${group} exception points to a file that does not exist.`,
        });
      }
    }
  }

  for (const file of files) {
    const relative = slash(path.relative(absoluteRoot, file));
    const source = sources.get(file) ?? "";
    const imports = extractImports(source);
    const resolvedImports = imports
      .map((specifier) => ({
        specifier,
        dependency: resolveImport(file, specifier, absoluteRoot, fileSet),
      }))
      .filter(
        (entry): entry is { specifier: string; dependency: string } =>
          Boolean(entry.dependency),
      );
    const dependencies = resolvedImports.map(({ dependency }) => dependency);
    graph.set(file, dependencies);

    const envAllowed = config.environmentAccess.allowed.includes(relative);
    const executableSource = stripStringsAndComments(source);
    if (/\bprocess\s*\.\s*env\b/.test(executableSource) && !envAllowed && !exceptionReason(config, "environmentAccess", relative)) {
      violations.push({
        rule: "no-direct-process-env",
        file: relative,
        message: "Read environment variables through the validated configuration boundary.",
      });
    }

    if (relative.startsWith("src/lib/") && !exceptionReason(config, "layerDirection", relative)) {
      for (const dependency of dependencies) {
        const target = slash(path.relative(absoluteRoot, dependency));
        if (target.startsWith("src/app/") || target.startsWith("src/components/")) {
          violations.push({
            rule: "shared-layer-direction",
            file: relative,
            message: `Shared library cannot depend on ${target}.`,
          });
        }
      }
    }

    const lineCount = source.split(/\r?\n/).length;
    if (
      lineCount > config.oversizedFiles.maxLines &&
      !exceptionReason(config, "oversizedFiles", relative)
    ) {
      violations.push({
        rule: "max-file-lines",
        file: relative,
        message: `${lineCount} lines exceeds the ${config.oversizedFiles.maxLines}-line threshold.`,
      });
    }
  }

  const serverOnlyFiles = new Set(
    files.filter((file) => {
      const source = sources.get(file) ?? "";
      return /\.server\.[^.]+$/.test(file) || /import\s+["']server-only["']/.test(source);
    }),
  );
  const serverActionFiles = new Set(
    files.filter((file) => /^\s*["']use server["'];/m.test(sources.get(file) ?? "")),
  );
  for (const file of files) {
    const source = sources.get(file) ?? "";
    const relative = slash(path.relative(absoluteRoot, file));
    if (
      !/^\s*["']use client["'];/m.test(source) ||
      exceptionReason(config, "clientServerImports", relative)
    ) {
      continue;
    }
    const dependency = findReachableServerOnlyModule(
      file,
      graph,
      serverOnlyFiles,
      serverActionFiles,
    );
    if (dependency) {
      violations.push({
        rule: "no-client-server-import",
        file: relative,
        message: `Client component reaches server-only module ${slash(path.relative(absoluteRoot, dependency))}.`,
      });
    }
  }

  for (const cycle of findCycles(graph)) {
    const relativeCycle = cycle.map((file) => slash(path.relative(absoluteRoot, file)));
    violations.push({
      rule: "no-static-import-cycles",
      file: relativeCycle[0],
      message: `Static import cycle: ${relativeCycle.join(" -> ")}.`,
    });
  }

  return violations.sort((left, right) =>
    `${left.file}:${left.rule}`.localeCompare(`${right.file}:${right.rule}`),
  );
}

async function runCli() {
  const root = process.cwd();
  const configUrl = pathToFileURL(path.join(root, "architecture.config.mjs")).href;
  const { default: config } = (await import(configUrl)) as { default: ArchitectureConfig };
  const violations = await analyzeArchitecture(root, config);
  if (violations.length === 0) {
    console.log("Architecture check passed.");
    return;
  }
  for (const violation of violations) {
    console.error(`${violation.file}: [${violation.rule}] ${violation.message}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await runCli();
}

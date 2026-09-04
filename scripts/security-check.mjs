import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? process.cwd());
const sourceRoot = path.join(root, "src");
const clientBundleRoot = path.join(root, ".next", "static");
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const serverSecretNames = [
  "NASA_API_KEY",
  "GROQ_API_KEY",
  "OPENAI_API_KEY",
  "OPENALEX_API_KEY",
  "CORE_API_KEY",
  "WEATHERSTACK_API_KEY",
  "PURPLEAIR_API_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "SECURITY_LOG_SALT",
];

function collectFiles(directory, extensions) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute, extensions);
    return extensions.has(path.extname(entry.name)) ? [absolute] : [];
  });
}

const violations = [];
const forbiddenPublicNames = serverSecretNames.map((name) => `NEXT_PUBLIC_${name}`);

for (const file of collectFiles(sourceRoot, sourceExtensions)) {
  const source = readFileSync(file, "utf8");
  for (const name of forbiddenPublicNames) {
    if (source.includes(name)) violations.push(`${path.relative(root, file)}: forbidden ${name}`);
  }
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)) {
    violations.push(`${path.relative(root, file)}: embedded private key`);
  }
}

for (const file of collectFiles(clientBundleRoot, new Set([".js", ".map"]))) {
  const source = readFileSync(file, "utf8");
  for (const name of serverSecretNames) {
    if (source.includes(name)) violations.push(`${path.relative(root, file)}: leaked ${name}`);
  }
}

if (violations.length > 0) {
  console.error(["Security verification failed:", ...violations.map((item) => `- ${item}`)].join("\n"));
  process.exit(1);
}

console.log(`Security verification passed (${collectFiles(sourceRoot, sourceExtensions).length} source files inspected).`);

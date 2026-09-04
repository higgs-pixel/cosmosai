import "server-only";

import { parseServerEnvironment } from "./environment-schema.ts";

export const serverEnv = parseServerEnvironment(process.env);

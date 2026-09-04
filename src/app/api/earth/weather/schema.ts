import { z } from "zod";
import { trimmedTextSchema } from "../../../../lib/validation/common-schemas.ts";

export const earthWeatherQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  name: trimmedTextSchema({ max: 80 }).optional().default("Selected monitoring point"),
}).strict();

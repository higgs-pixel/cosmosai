export const VALIDATION_LIMITS = {
  text: {
    defaultMax: 2_000,
    shortMax: 240,
    queryMax: 500,
  },
  array: {
    defaultMax: 100,
  },
  json: {
    maxBytes: 64 * 1024,
  },
  pagination: {
    defaultPage: 1,
    defaultPageSize: 20,
    maxPage: 10_000,
    maxPageSize: 100,
  },
  url: {
    maxLength: 2_048,
  },
  id: {
    maxLength: 160,
  },
} as const;

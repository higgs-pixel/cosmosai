export const EXPLANATION_LEVELS = ["Beginner", "Student", "Researcher"] as const;

export type ExplanationLevel = (typeof EXPLANATION_LEVELS)[number];

export const INTEREST_TOPICS = ["Earth", "Mars", "JWST", "Black Holes", "Space Weather"] as const;

export type InterestTopic = (typeof INTEREST_TOPICS)[number];

export type AccountPreferences = {
  explanationLevel: ExplanationLevel;
  topics: string[];
  dailyBriefingEmails: boolean;
  publicProfile: boolean;
};

type AccountPreferencesInput = {
  explanationLevel?: string | null;
  topics?: string[] | null;
  dailyBriefingEmails?: boolean | null;
  publicProfile?: boolean | null;
};

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  explanationLevel: "Student",
  topics: [],
  dailyBriefingEmails: false,
  publicProfile: false,
};

export function normalizeAccountPreferences(input?: AccountPreferencesInput | null): AccountPreferences {
  const explanationLevel = EXPLANATION_LEVELS.includes(input?.explanationLevel as ExplanationLevel)
    ? (input?.explanationLevel as ExplanationLevel)
    : DEFAULT_ACCOUNT_PREFERENCES.explanationLevel;

  const topics = Array.isArray(input?.topics)
    ? input.topics.filter((topic) => INTEREST_TOPICS.includes(topic as InterestTopic))
    : [];

  return {
    explanationLevel,
    topics,
    dailyBriefingEmails: Boolean(input?.dailyBriefingEmails),
    publicProfile: Boolean(input?.publicProfile),
  };
}

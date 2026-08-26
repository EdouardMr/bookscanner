// All shapes flow from the zod schemas in lib/validation/schemas.ts, so
// runtime validation and compile-time types never drift apart.
export type {
  DetectedBook,
  DetectedBookList,
  EnrichedBook,
  ScanResponse,
  ScanRequest,
  Preferences,
  Recommendation,
  RecommendResponse,
  RecommendRequest,
  ScanHistoryEntry,
} from "@/lib/validation/schemas";

export {
  MATCH_STATUSES,
  BOOK_SOURCES,
  MOODS,
  LENGTH_PREFERENCES,
  GENRE_OPTIONS,
  EMPTY_PREFERENCES,
} from "@/lib/validation/schemas";

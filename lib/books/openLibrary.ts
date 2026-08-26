import "server-only";

const SEARCH_URL = "https://openlibrary.org/search.json";
const COVERS_BASE_URL = "https://covers.openlibrary.org/b/id";
const TIMEOUT_MS = 5000;

export interface OpenLibraryCandidate {
  title: string;
  author?: string;
  coverUrl?: string;
  averageRating?: number;
  ratingsCount?: number;
  firstPublishYear?: number;
  subjects?: string[];
  workKey?: string;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** No API key required — this is why it's the primary enrichment source. */
export async function searchOpenLibrary(
  title: string,
  author?: string
): Promise<OpenLibraryCandidate[]> {
  const q = author ? `${title} ${author}` : title;
  const params = new URLSearchParams({
    q,
    limit: "3",
    fields:
      "title,author_name,cover_i,first_publish_year,ratings_average,ratings_count,subject,key",
  });

  const res = await fetchWithTimeout(`${SEARCH_URL}?${params.toString()}`);
  if (!res.ok) return [];

  const data = (await res.json()) as { docs?: Array<Record<string, unknown>> };
  const docs = data.docs ?? [];

  return docs.map((doc) => ({
    title: typeof doc.title === "string" ? doc.title : title,
    author: Array.isArray(doc.author_name)
      ? String(doc.author_name[0])
      : undefined,
    coverUrl:
      typeof doc.cover_i === "number"
        ? `${COVERS_BASE_URL}/${doc.cover_i}-L.jpg`
        : undefined,
    averageRating:
      typeof doc.ratings_average === "number" ? doc.ratings_average : undefined,
    ratingsCount:
      typeof doc.ratings_count === "number" ? doc.ratings_count : undefined,
    firstPublishYear:
      typeof doc.first_publish_year === "number"
        ? doc.first_publish_year
        : undefined,
    subjects: Array.isArray(doc.subject)
      ? doc.subject.slice(0, 5).map(String)
      : undefined,
    workKey: typeof doc.key === "string" ? doc.key : undefined,
  }));
}

/**
 * Descriptions aren't in the search response — they live on the work
 * record. Best-effort second call; failure here should never break
 * enrichment for the rest of the book's metadata.
 */
export async function fetchOpenLibraryDescription(
  workKey: string
): Promise<string | undefined> {
  try {
    const res = await fetchWithTimeout(`https://openlibrary.org${workKey}.json`);
    if (!res.ok) return undefined;

    const data = (await res.json()) as {
      description?: string | { value?: string };
    };
    if (typeof data.description === "string") return data.description;
    if (data.description && typeof data.description === "object") {
      return data.description.value;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

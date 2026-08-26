import "server-only";

const VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes";
const TIMEOUT_MS = 5000;

export interface GoogleBooksCandidate {
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  averageRating?: number;
  ratingsCount?: number;
  firstPublishYear?: number;
  subjects?: string[];
}

interface GoogleVolumeInfo {
  title?: string;
  authors?: string[];
  description?: string;
  imageLinks?: { thumbnail?: string };
  averageRating?: number;
  ratingsCount?: number;
  publishedDate?: string;
  categories?: string[];
}

/**
 * Works without a key at low volume (Google enforces a stricter quota for
 * unauthenticated requests); GOOGLE_BOOKS_API_KEY just raises that ceiling.
 * Used only as a fallback when Open Library has no usable match.
 */
export async function searchGoogleBooks(
  title: string,
  author?: string
): Promise<GoogleBooksCandidate[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const q = author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`;
  const params = new URLSearchParams({ q, maxResults: "3" });
  if (apiKey) params.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${VOLUMES_URL}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      items?: Array<{ volumeInfo?: GoogleVolumeInfo }>;
    };

    return (data.items ?? []).map(({ volumeInfo: info = {} }) => ({
      title: info.title ?? title,
      author: info.authors?.[0],
      coverUrl: info.imageLinks?.thumbnail?.replace("http://", "https://"),
      description: info.description,
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
      firstPublishYear: info.publishedDate
        ? Number.parseInt(info.publishedDate.slice(0, 4), 10) || undefined
        : undefined,
      subjects: info.categories,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

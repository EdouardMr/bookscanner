import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <span className="text-6xl" aria-hidden>
        📚
      </span>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-stone-900">bookscanner</h1>
        <p className="text-stone-600">
          Photograph a bookshelf, tell us what you like, and we&apos;ll tell you
          which book on it to read next.
        </p>
      </div>

      <ol className="flex flex-col gap-2 text-left text-sm text-stone-500">
        <li>1. Snap a photo of a shelf</li>
        <li>2. Set your reading preferences</li>
        <li>3. Get an AI-matched recommendation</li>
      </ol>

      <Link href="/scan">
        <Button className="px-8 py-3.5 text-base">Scan a shelf</Button>
      </Link>

      <Link
        href="/history"
        className="text-sm font-medium text-stone-500 underline underline-offset-2"
      >
        View past recommendations
      </Link>
    </div>
  );
}

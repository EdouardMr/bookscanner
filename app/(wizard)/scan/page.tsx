"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "@/lib/state/wizardStorage";
import { PhotoUploader } from "@/components/scan/PhotoUploader";
import { DetectedBooksList } from "@/components/scan/DetectedBooksList";
import { WizardNav } from "@/components/wizard/WizardNav";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import type { ResizedImage } from "@/lib/image/resize";
import type { ScanResponse } from "@/types";

export default function ScanPage() {
  const router = useRouter();
  const { books, setBooks } = useWizard();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastImage, setLastImage] = useState<ResizedImage | null>(null);

  async function handleScan(image: ResizedImage) {
    setLastImage(image);
    setScanning(true);
    setError(null);
    setWarnings([]);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: image.base64,
          mediaType: image.mediaType,
        }),
      });

      const data = (await res.json()) as ScanResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong reading that photo.");
        setBooks([]);
        return;
      }

      setBooks(data.books);
      setWarnings(data.warnings ?? []);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
      setBooks([]);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Scan a shelf</h1>
        <p className="mt-1 text-sm text-stone-500">
          Take a photo of a bookshelf and we&apos;ll read the spines.
        </p>
      </div>

      <PhotoUploader onScan={handleScan} scanning={scanning} />

      {error && (
        <ErrorBanner
          message={error}
          onRetry={lastImage ? () => handleScan(lastImage) : undefined}
        />
      )}

      {!error &&
        warnings.map((warning) => (
          <ErrorBanner key={warning} message={warning} />
        ))}

      <DetectedBooksList books={books} />

      <WizardNav
        nextLabel="Next: Preferences"
        nextDisabled={books.length === 0}
        onNext={() => router.push("/preferences")}
      />
    </div>
  );
}

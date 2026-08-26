"use client";

import { useRef, useState } from "react";
import {
  resizeImageFile,
  ImageTooLargeError,
  type ResizedImage,
} from "@/lib/image/resize";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

interface PhotoUploaderProps {
  onScan: (resized: ResizedImage) => void;
  scanning: boolean;
}

export function PhotoUploader({ onScan, scanning }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resized, setResized] = useState<ResizedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const result = await resizeImageFile(file);
      setResized(result);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setError(
        err instanceof ImageTooLargeError
          ? err.message
          : "Couldn't process that photo — try a different one."
      );
      setResized(null);
      setPreviewUrl(null);
    } finally {
      setPreparing(false);
    }
  }

  function retake() {
    setResized(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      {previewUrl ? (
        <div className="flex flex-col gap-3">
          {/* Local blob preview of the just-taken photo — not a remote/CDN
              image, so a plain <img> is the right tool here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Shelf preview"
            className="max-h-96 w-full rounded-xl border border-stone-200 object-cover"
          />
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={retake}
              disabled={scanning}
            >
              Retake
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!resized || scanning}
              onClick={() => resized && onScan(resized)}
            >
              {scanning ? "Reading spines…" : "Scan this shelf"}
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center transition-colors hover:border-amber-600 hover:bg-amber-50">
          <span className="text-4xl" aria-hidden>
            📷
          </span>
          <span className="font-medium text-stone-700">
            {preparing ? "Preparing photo…" : "Take or choose a photo of a bookshelf"}
          </span>
          <span className="text-sm text-stone-500">
            Straight-on, well-lit, spines visible
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={preparing}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

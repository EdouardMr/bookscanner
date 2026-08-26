"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWizard } from "@/lib/state/wizardStorage";
import { PreferencesForm } from "@/components/preferences/PreferencesForm";
import { WizardNav } from "@/components/wizard/WizardNav";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EMPTY_PREFERENCES, type Preferences } from "@/types";

export default function PreferencesPage() {
  const router = useRouter();
  const { books, preferences, setPreferences } = useWizard();
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/preferences");
        if (!res.ok) throw new Error("Failed to load preferences");
        const data = (await res.json()) as Preferences;
        if (!cancelled) setDraft(data);
      } catch {
        // No saved preferences yet (or a transient error) — just start from
        // an empty form rather than blocking the wizard on this.
        if (!cancelled) setDraft(EMPTY_PREFERENCES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only load once on mount — subsequent edits are local until saved.
  }, []);

  async function handleNext() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Couldn't save preferences.");
      }
      setPreferences(draft);
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-stone-600">Scan a shelf first to get recommendations from it.</p>
        <Link href="/scan" className="font-medium text-amber-700 underline underline-offset-2">
          Go to scan
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Your reading taste</h1>
        <p className="mt-1 text-sm text-stone-500">
          All optional — saved to this browser so you won&apos;t have to redo it next time.
        </p>
      </div>

      {loading ? (
        <Spinner label="Loading your preferences…" />
      ) : (
        <>
          {error && <ErrorBanner message={error} onRetry={handleNext} />}
          <PreferencesForm value={draft} onChange={setDraft} />
        </>
      )}

      <WizardNav
        backHref="/scan"
        nextLabel="Next: Discover"
        nextDisabled={loading}
        nextLoading={saving}
        onNext={handleNext}
      />
    </div>
  );
}

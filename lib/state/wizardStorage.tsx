"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { EMPTY_PREFERENCES } from "@/lib/validation/schemas";
import type { EnrichedBook, Preferences, RecommendResponse } from "@/types";

const STORAGE_KEY = "bookscanner:wizard";

interface WizardState {
  books: EnrichedBook[];
  preferences: Preferences;
  recommendation: RecommendResponse | null;
}

const initialState: WizardState = {
  books: [],
  preferences: EMPTY_PREFERENCES,
  recommendation: null,
};

interface WizardContextValue extends WizardState {
  setBooks: (books: EnrichedBook[]) => void;
  setPreferences: (preferences: Preferences) => void;
  setRecommendation: (recommendation: RecommendResponse | null) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

/**
 * Holds the in-progress scan (this visit only) so the three wizard steps
 * can share data and survive an accidental refresh. This is separate from
 * the server-persisted preferences/history in Postgres — that's the
 * cross-visit memory; sessionStorage here is just per-tab scratch space for
 * the scan currently in flight.
 */
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      // One-time hydration from a browser-only API that doesn't exist during
      // SSR — this has to happen post-mount, in an effect, so the server and
      // first client render match before this runs.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      // Corrupted or inaccessible storage (e.g. private browsing) — start fresh.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full/unavailable — non-fatal, just means no refresh recovery.
    }
  }, [state, hydrated]);

  const value: WizardContextValue = {
    ...state,
    setBooks: (books) => setState((s) => ({ ...s, books })),
    setPreferences: (preferences) => setState((s) => ({ ...s, preferences })),
    setRecommendation: (recommendation) =>
      setState((s) => ({ ...s, recommendation })),
    reset: () => {
      setState(initialState);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  };

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return ctx;
}

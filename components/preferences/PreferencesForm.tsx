"use client";

import { useState } from "react";
import {
  GENRE_OPTIONS,
  MOODS,
  LENGTH_PREFERENCES,
  type Preferences,
} from "@/types";

const MOOD_LABELS: Record<(typeof MOODS)[number], string> = {
  cozy: "Cozy & comforting",
  thrilling: "Thrilling & fast-paced",
  "thought-provoking": "Thought-provoking",
  "light-funny": "Light & funny",
  "dark-intense": "Dark & intense",
  uplifting: "Uplifting",
};

const LENGTH_LABELS: Record<(typeof LENGTH_PREFERENCES)[number], string> = {
  short: "Short (< 300 pages)",
  medium: "Medium (300–450)",
  long: "Long (450+)",
  "no-preference": "No preference",
};

function ChipToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-amber-700 bg-amber-700 text-white"
          : "border-stone-300 text-stone-700 hover:border-amber-400"
      }`}
    >
      {label}
    </button>
  );
}

function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-stone-800">{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="text-stone-400 hover:text-stone-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function PreferencesForm({
  value,
  onChange,
}: {
  value: Preferences;
  onChange: (next: Preferences) => void;
}) {
  function toggleGenre(genre: string) {
    const genres = value.genres.includes(genre)
      ? value.genres.filter((g) => g !== genre)
      : [...value.genres, genre];
    onChange({ ...value, genres });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-800">
          Genres you enjoy
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((genre) => (
            <ChipToggle
              key={genre}
              label={genre}
              active={value.genres.includes(genre)}
              onClick={() => toggleGenre(genre)}
            />
          ))}
        </div>
      </div>

      <TagInput
        label="Favorite authors"
        placeholder="e.g. Ursula K. Le Guin"
        values={value.favoriteAuthors}
        onChange={(favoriteAuthors) => onChange({ ...value, favoriteAuthors })}
      />

      <TagInput
        label="Favorite books"
        placeholder="e.g. The Left Hand of Darkness"
        values={value.favoriteBooks}
        onChange={(favoriteBooks) => onChange({ ...value, favoriteBooks })}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-800">
          What mood are you in the mood for?
        </label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => (
            <ChipToggle
              key={mood}
              label={MOOD_LABELS[mood]}
              active={value.mood === mood}
              onClick={() =>
                onChange({ ...value, mood: value.mood === mood ? undefined : mood })
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-stone-800">Book length</label>
        <div className="flex flex-wrap gap-2">
          {LENGTH_PREFERENCES.map((length) => (
            <ChipToggle
              key={length}
              label={LENGTH_LABELS[length]}
              active={value.lengthPreference === length}
              onClick={() => onChange({ ...value, lengthPreference: length })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="additionalNotes" className="text-sm font-medium text-stone-800">
          Anything else? (optional)
        </label>
        <textarea
          id="additionalNotes"
          value={value.additionalNotes ?? ""}
          onChange={(e) =>
            onChange({ ...value, additionalNotes: e.target.value || undefined })
          }
          maxLength={1000}
          rows={3}
          placeholder="e.g. Just finished a heavy nonfiction book, want something lighter next"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
      </div>
    </div>
  );
}

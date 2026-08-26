"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { path: "/scan", label: "Scan" },
  { path: "/preferences", label: "Preferences" },
  { path: "/results", label: "Discover" },
];

export function StepProgress() {
  const pathname = usePathname();
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((step) => pathname?.startsWith(step.path))
  );

  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <li key={step.path} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  state === "done"
                    ? "bg-amber-700 text-white"
                    : state === "current"
                      ? "border-2 border-amber-700 text-amber-700"
                      : "border border-stone-300 text-stone-400"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`hidden text-sm sm:inline ${
                  state === "upcoming" ? "text-stone-400" : "font-medium text-stone-800"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="mx-2 h-px flex-1 bg-stone-200 sm:mx-3" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

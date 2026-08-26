"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface WizardNavProps {
  backHref?: string;
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
}

export function WizardNav({
  backHref,
  onNext,
  nextLabel,
  nextDisabled,
  nextLoading,
}: WizardNavProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
      {backHref ? (
        <Link href={backHref}>
          <Button type="button" variant="ghost">
            Back
          </Button>
        </Link>
      ) : (
        <span />
      )}
      <Button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || nextLoading}
      >
        {nextLoading ? "Working…" : nextLabel}
      </Button>
    </div>
  );
}

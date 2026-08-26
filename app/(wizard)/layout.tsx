import type { ReactNode } from "react";
import Link from "next/link";
import { WizardProvider } from "@/lib/state/wizardStorage";
import { StepProgress } from "@/components/wizard/StepProgress";

export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <WizardProvider>
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
        <header className="flex flex-col gap-5">
          <Link href="/" className="text-lg font-semibold text-stone-900">
            📚 schelfscanner
          </Link>
          <StepProgress />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </WizardProvider>
  );
}

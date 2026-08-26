"use client";

import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-amber-700 text-white hover:bg-amber-800 disabled:bg-stone-300 disabled:text-stone-500",
  secondary:
    "bg-stone-100 text-stone-800 hover:bg-stone-200 disabled:text-stone-400 disabled:bg-stone-50",
  ghost:
    "bg-transparent text-stone-600 hover:bg-stone-100 disabled:text-stone-300",
};

export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

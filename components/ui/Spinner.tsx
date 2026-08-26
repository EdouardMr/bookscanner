export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-stone-500">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-amber-700"
        role="status"
        aria-label={label ?? "Loading"}
      />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

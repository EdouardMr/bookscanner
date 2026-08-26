export function RatingStars({
  average,
  count,
}: {
  average?: number;
  count?: number;
}) {
  if (average === undefined) {
    return <span className="text-xs text-stone-400">No rating available</span>;
  }

  const rounded = Math.round(average * 2) / 2; // nearest half star

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" aria-label={`${average.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => {
          const fill =
            rounded >= i + 1 ? "100%" : rounded > i ? "50%" : "0%";
          return (
            <span key={i} className="relative text-base leading-none text-stone-300">
              ★
              <span
                className="absolute inset-0 overflow-hidden text-amber-500"
                style={{ width: fill }}
              >
                ★
              </span>
            </span>
          );
        })}
      </div>
      <span className="text-xs text-stone-500">
        {average.toFixed(1)}
        {count !== undefined && ` (${count.toLocaleString()})`}
      </span>
    </div>
  );
}

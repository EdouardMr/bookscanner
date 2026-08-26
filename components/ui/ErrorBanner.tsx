export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 font-medium underline underline-offset-2 hover:text-red-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}

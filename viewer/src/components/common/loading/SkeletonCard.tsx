export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg bg-bg-card p-4 animate-pulse space-y-3">
      <div className="h-4 bg-bg-tertiary rounded w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className="h-3 bg-bg-tertiary rounded" style={{ width: `${60 + i * 10}%` }} />
      ))}
    </div>
  )
}

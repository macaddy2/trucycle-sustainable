import { Skeleton } from '@/components/ui/skeleton'

export default function ListingsSkeleton({ rows = 3 }: { rows?: number }) {
  const items = Array.from({ length: rows })
  return (
    <div className="space-y-3">
      {items.map((_, i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-background/70 p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

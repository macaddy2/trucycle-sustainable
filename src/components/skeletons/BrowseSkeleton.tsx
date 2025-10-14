import { Skeleton } from '@/components/ui/skeleton'

export default function BrowseSkeleton({ count = 3 }: { count?: number }) {
  const items = Array.from({ length: count })
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-sm">
          <div className="aspect-video w-full">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

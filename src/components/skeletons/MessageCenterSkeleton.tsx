import { Skeleton } from '@/components/ui/skeleton'

export default function MessageCenterSkeleton() {
  return (
    <div className="flex flex-col min-h-0 h-[min(100svh,720px)]">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-80 max-w-full border-r border-border hidden md:flex md:flex-col">
          <div className="p-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="border-b border-border p-3">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="max-w-[70%]">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6 mt-2" />
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3 flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

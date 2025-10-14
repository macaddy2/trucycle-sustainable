import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md animate-pulse bg-primary/10 dark:bg-primary/20", className)}
      {...props}
    />
  )
}

export { Skeleton }

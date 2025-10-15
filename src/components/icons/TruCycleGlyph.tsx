import { forwardRef } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

export type TruCycleGlyphProps = ComponentPropsWithoutRef<'svg'>

export const TruCycleGlyph = forwardRef<SVGSVGElement, TruCycleGlyphProps>(function TruCycleGlyph(
  { className, ...props },
  ref,
) {
  return (
    <svg
      ref={ref}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.2" opacity="0.15" />
      <path
        d="M22.8 12.85c-1.1-2.92-3.82-4.82-6.87-4.82-2.2 0-4.22.98-5.56 2.54l2.16 1.22c.88-1 2.16-1.58 3.51-1.58 1.87 0 3.53 1.02 4.26 2.69l.5 1.16 2-.27-.99-1.94Z"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        d="M9.2 19.1c1.1 2.92 3.82 4.82 6.87 4.82 2.2 0 4.22-.98 5.56-2.54l-2.16-1.22c-.88 1-2.16 1.58-3.51 1.58-1.87 0-3.53-1.02-4.26-2.69l-.5-1.16-2 .27.99 1.94Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M19.93 14.28a3.94 3.94 0 0 0-3.81-2.82c-1.63 0-3.08.93-3.67 2.38l-1.4 3.44c-.46 1.12.07 2.41 1.19 2.87.27.11.54.17.82.17.88 0 1.72-.53 2.08-1.42l.6-1.48c.25-.63.9-1.04 1.58-.98.68.05 1.25.54 1.42 1.21l.35 1.39c.18.72.73 1.28 1.43 1.46.7.18 1.44-.07 1.9-.65.42-.51.55-1.2.35-1.83l-.83-2.44Z"
        fill="currentColor"
      />
    </svg>
  )
})


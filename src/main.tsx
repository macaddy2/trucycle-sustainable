import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import RootRouter from './RootRouter'
import { startAppPrefetch } from '@/lib/appPrefetch'
import GlobalLoading, { AppBootReady } from './components/GlobalLoading'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <GlobalLoading />
    <RootRouter />
    <AppBootReady />
  </ErrorBoundary>
)

// Kick off background prefetching and socket init without blocking UI
startAppPrefetch().catch(() => {})

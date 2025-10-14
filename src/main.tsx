import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";

import RootRouter from './RootRouter'
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

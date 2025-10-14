import App from './App'
import { VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage } from '@/components/auth'
import { PartnerRouter } from './PartnerRouter'

export default function RootRouter() {
  const base = (import.meta as any).env?.BASE_URL || '/'
  const baseNormalized = String(base || '/').replace(/\/$/, '')
  let path = window.location.pathname
  if (baseNormalized && path.startsWith(baseNormalized)) {
    path = path.slice(baseNormalized.length)
  }
  path = path.replace(/^\/+/, '')

  if (path.startsWith('auth/verify')) {
    return <VerifyEmailPage />
  }
  if (path.startsWith('auth/reset-password')) {
    return <ResetPasswordPage />
  }
  if (path.startsWith('auth/forgot-password')) {
    return <ForgotPasswordPage />
  }

  if (path.startsWith('partner')) {
    return <PartnerRouter basePath={baseNormalized} initialPath={path} />
  }

  return <App />
}


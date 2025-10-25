import { tokens } from '@/lib/api'
import {
  authHealth,
  me,
  searchItems,
  listMyItems,
  listMyCollectedItems,
  getMyImpactMetrics,
  shopsNearby,
  listActiveRooms,
  listNotifications,
  getUnreadCount,
  listMyShops,
} from '@/lib/api'
import { kvGet } from '@/lib/kvStore'
import { messageSocket } from '@/lib/messaging/socket'
import { notificationSocket } from '@/lib/notifications/socket'

type UserProfileKV = {
  id: string
  name: string
  userType?: 'donor' | 'collector'
  postcode?: string
  lat?: number
  lng?: number
  latitude?: number
  longitude?: number
  partnerAccess?: boolean
} | null

function pickDefaultLocation(user: UserProfileKV | undefined | null) {
  const lat = (user as any)?.lat ?? (user as any)?.latitude
  const lng = (user as any)?.lng ?? (user as any)?.longitude
  const postcode = (user as any)?.postcode
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng }
  }
  if (typeof postcode === 'string' && postcode.trim()) {
    return { postcode: postcode.trim() }
  }
  // Fallback: London postcode used elsewhere in the app
  return { postcode: 'IG11 7FR' }
}

export async function startAppPrefetch(): Promise<void> {
  try {
    // Fire quickly; no await needed here for the whole bundle
    void (async () => {
      // Prime health first (detects missing base URL early in console without crashing UI)
      try { await authHealth() } catch {}

      // Resolve auth + lightweight user and location context
      const [tk, userKV] = await Promise.all([
        tokens.get().catch(() => undefined),
        kvGet<UserProfileKV>('current-user').catch(() => null),
      ])
      const isAuthed = Boolean(tk?.accessToken)
      const loc = pickDefaultLocation(userKV)

      // Always-warm endpoints used by Browse and Shops pages
      const generalTasks: Promise<any>[] = [
        (async () => { try { await searchItems({ ...(loc as any), radius: 10, limit: 20 }) } catch {} })(),
        (async () => { try { await shopsNearby('lat' in loc && 'lng' in loc ? { lat: (loc as any).lat, lon: (loc as any).lng, radius_m: 5000 } : { postcode: (loc as any).postcode, radius_m: 5000 }) } catch {} })(),
      ]

      // Messaging sockets should be ready early if authed
      if (isAuthed) {
        try { await Promise.all([messageSocket.connect(), notificationSocket.connect()]) } catch {}
      }

      // Auth-dependent data used across multiple pages/tabs
      const authedTasks: Promise<any>[] = isAuthed ? [
        (async () => { try { await me() } catch {} })(),
        (async () => { try { await listActiveRooms() } catch {} })(),
        (async () => { try { await listMyItems({ limit: 50 }) } catch {} })(),
        (async () => { try { await listMyCollectedItems({ limit: 50 }) } catch {} })(),
        (async () => { try { await getMyImpactMetrics() } catch {} })(),
        (async () => { try { await listNotifications({ unread: true, limit: 50 }) } catch {} })(),
        (async () => { try { await getUnreadCount() } catch {} })(),
        (async () => { try { await listMyShops() } catch {} })(),
      ] : []

      // Run everything in the background; don’t block UI
      await Promise.allSettled([...generalTasks, ...authedTasks])
    })()
  } catch {
    // Never throw from prefetch
  }
}


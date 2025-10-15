import { useEffect, useRef } from 'react'
import { useKV } from '@/hooks/useKV'
import { listActiveRooms } from '@/lib/api'
import { messageSocket } from '@/lib/messaging/socket'

// Tracks realtime user presence (online/offline) globally.
// Stores a map of userId -> online boolean in KV so any component can read it.
export function usePresence(currentUserId?: string | null) {
  const [presence, setPresence] = useKV<Record<string, boolean>>('presence-map', {})
  const primeRef = useRef<string | null>(null)

  // Subscribe to presence updates over the socket
  useEffect(() => {
    if (!currentUserId) return

    let mounted = true
    messageSocket.connect()

    const onPresence = (p: { userId: string; online: boolean }) => {
      if (!mounted) return
      setPresence(prev => ({ ...prev, [p.userId]: p.online }))
    }

    messageSocket.onPresenceUpdate(onPresence)
    return () => {
      mounted = false
      messageSocket.offPresenceUpdate(onPresence)
    }
  }, [currentUserId, setPresence])

  // Prime the presence map from active rooms (HTTP) so we have initial state
  useEffect(() => {
    if (!currentUserId) {
      // Clear presence if signed out
      setPresence({})
      return
    }
    // Avoid re-priming repeatedly for the same user id
    const didPrimeForUser = (primeRef.current === currentUserId)
    let cancelled = false
    ;(async () => {
      if (didPrimeForUser) return
      try {
        const res = await listActiveRooms()
        const rooms = Array.isArray(res?.data) ? res.data : []
        const next: Record<string, boolean> = {}
        rooms.forEach((r) => {
          ;(r.participants || []).forEach((p) => {
            if (!p?.id || p.id === currentUserId) return
            next[p.id] = Boolean(p.online)
          })
        })
        if (!cancelled) {
          setPresence(prev => ({ ...prev, ...next }))
          primeRef.current = currentUserId
        }
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [currentUserId, setPresence])

  const isOnline = (userId?: string) => (userId ? Boolean(presence[userId]) : false)

  return { presence, isOnline }
}

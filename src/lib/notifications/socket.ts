import { io, Socket } from 'socket.io-client'
import { API_BASE_URL, tokens } from '@/lib/api'
import type { NotificationViewModel } from '@/lib/api/types'

type NotificationNewHandler = (n: NotificationViewModel) => void
type ReadAckHandler = (p: { count: number }) => void

class NotificationSocket {
  private socket: Socket | null = null
  private connecting = false
  private newHandlers: NotificationNewHandler[] = []
  private readAckHandlers: ReadAckHandler[] = []

  async connect(): Promise<Socket | null> {
    if (this.socket && this.socket.connected) return this.socket
    if (this.connecting) return this.socket
    this.connecting = true
    try {
      const t = await tokens.get()
      const token = t?.accessToken
      if (!API_BASE_URL || !token) {
        this.connecting = false
        return null
      }
      this.socket = io(API_BASE_URL + '/notifications', {
        auth: { token },
        transports: ['websocket'],
      })
      // Re-attach any handlers registered before connection was created
      this.newHandlers.forEach(h => this.socket!.on('notification:new', h))
      this.readAckHandlers.forEach(h => this.socket!.on('notification:read:ack', h))
      this.socket.once('connect', () => { this.connecting = false })
      this.socket.once('connect_error', () => { this.connecting = false })
      return this.socket
    } catch {
      this.connecting = false
      return null
    }
  }

  get instance(): Socket | null {
    return this.socket
  }

  async ensureConnected(): Promise<Socket | null> {
    if (this.socket && this.socket.connected) return this.socket
    return this.connect()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  async markRead(ids: string[] | string): Promise<number> {
    const s = await this.ensureConnected()
    if (!s) return 0
    const payload = Array.isArray(ids) ? { ids } : { id: ids }
    return new Promise<number>((resolve) => {
      let done = false
      const onAck = (p: { count: number }) => {
        if (done) return
        done = true
        resolve(typeof p?.count === 'number' ? p.count : 0)
      }
      const timeout = setTimeout(() => { if (!done) { done = true; resolve(0) } }, 8000)
      const cleanup = () => { clearTimeout(timeout); s.off('notification:read:ack', onAck) }
      s.once('notification:read:ack', (p) => { cleanup(); onAck(p) })
      s.emit('notification:read', payload)
    })
  }

  onNotificationNew(handler: NotificationNewHandler) {
    this.newHandlers.push(handler)
    if (this.socket) {
      this.socket.on('notification:new', handler)
    }
  }

  offNotificationNew(handler: NotificationNewHandler) {
    this.newHandlers = this.newHandlers.filter(h => h !== handler)
    this.socket?.off('notification:new', handler)
  }

  onReadAck(handler: ReadAckHandler) {
    this.readAckHandlers.push(handler)
    if (this.socket) {
      this.socket.on('notification:read:ack', handler)
    }
  }

  offReadAck(handler: ReadAckHandler) {
    this.readAckHandlers = this.readAckHandlers.filter(h => h !== handler)
    this.socket?.off('notification:read:ack', handler)
  }
}

export const notificationSocket = new NotificationSocket()

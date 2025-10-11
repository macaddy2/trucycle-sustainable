import { io, Socket } from 'socket.io-client'
import { API_BASE_URL, tokens } from '@/lib/api'
import type { DMMessageView, DMRoom } from '@/lib/api/types'

type MessageNewHandler = (m: DMMessageView) => void
type RoomActivityHandler = (p: { roomId: string; updatedAt: string }) => void
type RoomClearedHandler = (p: { roomId: string }) => void
type RoomDeletedHandler = (p: { roomId: string }) => void
type PresenceHandler = (p: { userId: string; online: boolean }) => void

class MessageSocket {
  private socket: Socket | null = null
  private connecting = false

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
      this.socket = io(API_BASE_URL + '/messages', {
        auth: { token },
        transports: ['websocket'],
      })
      this.socket.once('connect', () => {
        this.connecting = false
      })
      this.socket.once('connect_error', () => {
        this.connecting = false
      })
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

  async joinRoom(otherUserId: string): Promise<DMRoom> {
    const s = await this.ensureConnected()
    if (!s) throw new Error('Socket not connected')
    return new Promise<DMRoom>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup(); reject(new Error('Timed out joining room'))
      }, 8000)
      function onJoined(room: DMRoom) { cleanup(); resolve(room) }
      function cleanup() { clearTimeout(timeout); s.off('room:joined', onJoined) }
      s.once('room:joined', onJoined)
      s.emit('room:join', { otherUserId })
    })
  }

  async sendMessage(roomId: string, text?: string, files: Array<{ name: string; type: string; data: string }> = []) {
    const s = await this.ensureConnected()
    if (!s) throw new Error('Socket not connected')
    return new Promise<void>((resolve, reject) => {
      const isLarge = Array.isArray(files) && files.length > 0
      const timeoutMs = isLarge ? 25000 : 10000
      const timeout = setTimeout(() => { cleanup(); reject(new Error('Timed out waiting for ack')) }, timeoutMs)
      function onSent() { cleanup(); resolve() }
      function cleanup() { clearTimeout(timeout); s.off('message:sent', onSent) }
      s.once('message:sent', onSent)
      s.emit('message:send', { roomId, text, files })
    })
  }

  onMessageNew(handler: MessageNewHandler) { this.socket?.on('message:new', handler) }
  offMessageNew(handler: MessageNewHandler) { this.socket?.off('message:new', handler) }
  onRoomActivity(handler: RoomActivityHandler) { this.socket?.on('room:activity', handler) }
  offRoomActivity(handler: RoomActivityHandler) { this.socket?.off('room:activity', handler) }
  onRoomCleared(handler: RoomClearedHandler) { this.socket?.on('room:cleared', handler) }
  offRoomCleared(handler: RoomClearedHandler) { this.socket?.off('room:cleared', handler) }
  onRoomDeleted(handler: RoomDeletedHandler) { this.socket?.on('room:deleted', handler) }
  offRoomDeleted(handler: RoomDeletedHandler) { this.socket?.off('room:deleted', handler) }
  onPresenceUpdate(handler: PresenceHandler) { this.socket?.on('presence:update', handler) }
  offPresenceUpdate(handler: PresenceHandler) { this.socket?.off('presence:update', handler) }
}

export const messageSocket = new MessageSocket()

export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        // strip any data: prefix if present
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      } else {
        reject(new Error('Unexpected file reader result'))
      }
    }
    reader.onerror = () => reject(reader.error || new Error('File read error'))
    reader.readAsDataURL(file as any)
  })
}

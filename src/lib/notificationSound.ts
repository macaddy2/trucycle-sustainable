let audioContext: AudioContext | null = null

export function playNotificationSound() {
  if (typeof window === 'undefined') return
  const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return

  if (!audioContext) {
    try {
      audioContext = new AudioCtx()
    } catch {
      return
    }
  }

  try {
    const duration = 0.18
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gainNode.gain.value = 0.08

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.start()
    oscillator.stop(audioContext.currentTime + duration)
  } catch {
    // Ignore audio errors (e.g. autoplay restrictions)
  }
}


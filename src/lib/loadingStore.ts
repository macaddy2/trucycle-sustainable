import { useSyncExternalStore } from 'react'

type LoadingState = {
  activeRequests: number
  initializing: boolean
}

let state: LoadingState = {
  activeRequests: 0,
  initializing: true,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function startLoading() {
  state = { ...state, activeRequests: state.activeRequests + 1 }
  emit()
}

export function finishLoading() {
  state = {
    ...state,
    activeRequests: Math.max(0, state.activeRequests - 1),
  }
  emit()
}

export function setInitializing(initializing: boolean) {
  if (state.initializing !== initializing) {
    state = { ...state, initializing }
    emit()
  }
}

export function getLoadingState(): LoadingState {
  return state
}

export function subscribeLoading(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useGlobalLoading() {
  const snapshot = useSyncExternalStore(
    subscribeLoading,
    getLoadingState,
    getLoadingState
  )

  const isLoading = snapshot.initializing || snapshot.activeRequests > 0
  return {
    ...snapshot,
    isLoading,
  }
}


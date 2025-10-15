import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { MapContainer, Marker, TileLayer, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Crosshair, MagnifyingGlass } from '@phosphor-icons/react'

type LocationValue = {
  lat?: number
  lng?: number
  label?: string
  radiusKm: number
}

interface LocationSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue: LocationValue
  onApply: (value: Required<Omit<LocationValue, 'label'>> & { label: string }) => void
}

const defaultCenter: [number, number] = [51.5074, -0.1278] // London fallback

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center)
  }, [center, map])
  return null
}

export function LocationSelector({ open, onOpenChange, initialValue, onApply }: LocationSelectorProps) {
  const [lat, setLat] = useState<number | undefined>(initialValue.lat)
  const [lng, setLng] = useState<number | undefined>(initialValue.lng)
  const [label, setLabel] = useState<string>(initialValue.label || '')
  const [radiusKm, setRadiusKm] = useState<number>(initialValue.radiusKm ?? 10)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const searchAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setLat(initialValue.lat)
    setLng(initialValue.lng)
    setLabel(initialValue.label || '')
    setRadiusKm(initialValue.radiusKm ?? 10)
    setQuery('')
    setResults([])
  }, [open, initialValue.lat, initialValue.lng, initialValue.label, initialValue.radiusKm])

  const center = useMemo<[number, number]>(() => {
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng]
    return defaultCenter
  }, [lat, lng])

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      const preciseLat = Number(latitude.toFixed(7))
      const preciseLng = Number(longitude.toFixed(7))
      setLat(preciseLat)
      setLng(preciseLng)
      try {
        // Reverse geocode to friendly label via Nominatim
        const url = new URL('https://nominatim.openstreetmap.org/reverse')
        url.searchParams.set('format', 'json')
        url.searchParams.set('lat', preciseLat.toFixed(7))
        url.searchParams.set('lon', preciseLng.toFixed(7))
        url.searchParams.set('zoom', '10')
        url.searchParams.set('addressdetails', '1')
        const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } })
        const data = await res.json()
        const name = data?.display_name as string | undefined
        if (name) setLabel(name)
      } catch {
        // ignore reverse errors
      }
    })
  }, [])

  // Debounced search to Nominatim
  useEffect(() => {
    const q = query.trim()
    if (!open) return
    if (q.length < 3) {
      if (results.length) setResults([])
      return
    }
    setSearching(true)
    if (searchAbort.current) searchAbort.current.abort()
    const ctrl = new AbortController()
    searchAbort.current = ctrl
    const timeout = setTimeout(async () => {
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.searchParams.set('q', q)
        url.searchParams.set('format', 'json')
        url.searchParams.set('addressdetails', '1')
        url.searchParams.set('limit', '5')
        const res = await fetch(url.toString(), { signal: ctrl.signal, headers: { 'Accept': 'application/json' } })
        if (!res.ok) throw new Error('search failed')
        const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>
        setResults(data)
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          setResults([])
        }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      clearTimeout(timeout)
      ctrl.abort()
    }
  }, [query, open, results.length])

  const canApply = typeof lat === 'number' && typeof lng === 'number'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select location</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1.6fr,1fr]">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a place (city, postcode, address)"
                  className="w-full rounded-xl bg-background/80 pl-10"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleUseMyLocation}>
                <Crosshair size={16} className="mr-2" /> Use my location
              </Button>
            </div>
            {results.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-background/70 p-2 max-h-48 overflow-auto">
                {results.map((r, idx) => (
                  <button
                    key={`${r.lat}-${r.lon}-${idx}`}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg"
                    onClick={() => {
                      const la = parseFloat(r.lat)
                      const lo = parseFloat(r.lon)
                      if (!Number.isNaN(la) && !Number.isNaN(lo)) {
                        setLat(Number(la.toFixed(7)))
                        setLng(Number(lo.toFixed(7)))
                        setLabel(r.display_name)
                        setResults([])
                        setQuery('')
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-1 text-primary" />
                      <span className="text-sm">{r.display_name}</span>
                    </div>
                  </button>
                ))}
                {searching && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
              <MapContainer center={center} zoom={15} minZoom={2} maxZoom={19} scrollWheelZoom={true} zoomControl={true} className="h-[320px] w-full">
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {canApply && (
                  <Circle center={[lat!, lng!]} radius={radiusKm * 1000} pathOptions={{ color: '#22c55e', weight: 1.5, opacity: 0.6 }} />
                )}
                <Marker
                  position={center}
                  draggable={true}
                  icon={markerIcon}
                  eventHandlers={{
                    dragend: (e) => {
                      const m = e.target as L.Marker
                      const pos = m.getLatLng()
                      setLat(Number(pos.lat.toFixed(7)))
                      setLng(Number(pos.lng.toFixed(7)))
                    },
                  }}
                />
                <RecenterMap center={center} />
              </MapContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected area</div>
              <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="mt-0.5 text-primary" />
                  <div>
                    <div className="text-sm font-medium line-clamp-2">
                      {label || 'No place selected'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radius</div>
                <Badge variant="secondary">{radiusKm} km</Badge>
              </div>
              <div className="mt-3 px-1">
                <Slider
                  min={1}
                  max={100}
                  defaultValue={[radiusKm]}
                  value={[radiusKm]}
                  onValueChange={(vals) => setRadiusKm(vals[0] ?? 10)}
                />
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                disabled={!canApply}
                onClick={() => {
                  if (!canApply) return
                  onApply({ lat: lat!, lng: lng!, label: label || 'Selected location', radiusKm })
                  onOpenChange(false)
                }}
              >
                Apply location
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type { LocationValue }

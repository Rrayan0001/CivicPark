'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const GPS_GOOD_ACCURACY_METERS = 25
const GPS_ACCEPTABLE_ACCURACY_METERS = 60
const GPS_MAX_AGE_MS = 2 * 60 * 1000

type GpsSnapshot = {
  lat: number
  lng: number
  accuracy: number
  capturedAt: string
}

type NearbyContext = {
  road: string | null
  neighbourhood: string | null
  suburb: string | null
  city: string | null
  postcode: string | null
  displayName: string | null
}

const CATEGORIES = [
  {
    id: 'no-parking',
    name: 'No Parking',
    kn: 'ನೋ ಪಾರ್ಕಿಂಗ್',
    description: 'Parked in a designated no-parking zone',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M9 12h6"/>
      </svg>
    ),
  },
  {
    id: 'footpath',
    name: 'Footpath Parking',
    kn: 'ಫುಟ್‌ಪಾತ್ ನಿಲ್ಲಿಸಿದ',
    description: 'Vehicle obstructing pedestrian walkway',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17H2a10 10 0 0 1 20 0h-2"/><path d="M12 7v4M8 21h8"/>
      </svg>
    ),
  },
  {
    id: 'blocking',
    name: 'Blocking Traffic',
    kn: 'ಟ್ರಾಫಿಕ್ ತಡೆ',
    fine: '₹500',
    description: 'Vehicle impeding normal traffic flow',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3h8l3 6H5l3-6Z"/><path d="M5 9v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M9 17v-4h6v4"/>
      </svg>
    ),
  },
  {
    id: 'wrong-side',
    name: 'Wrong Side Parking',
    kn: 'ತಪ್ಪು ಪಾರ್ಕಿಂಗ್',
    fine: '₹500',
    description: 'Parked facing the wrong direction',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9h12m-4-4 4 4-4 4"/><path d="M21 15H9m4 4-4-4 4-4"/>
      </svg>
    ),
  },
  {
    id: 'double',
    name: 'Double Parking',
    kn: 'ಡಬಲ್ ಪಾರ್ಕಿಂಗ್',
    fine: '₹500',
    description: 'Parked alongside another vehicle',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="8" width="8" height="10" rx="2"/><rect x="14" y="8" width="8" height="10" rx="2"/>
      </svg>
    ),
  },
  {
    id: 'disabled-bay',
    name: 'Disabled Bay',
    kn: 'ವಿಕಲಾಂಗ ಸ್ಥಳ',
    fine: '₹500',
    description: 'Occupying reserved accessibility space',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/><path d="M12 7v5l3 4"/><path d="M9 17a3 3 0 1 0 6 0"/>
      </svg>
    ),
  },
]

const STEPS = [
  { id: 'photos',   label: 'Evidence' },
  { id: 'location', label: 'Location' },
  { id: 'category', label: 'Violation' },
  { id: 'submit',   label: 'Submit' },
]

const NOTE_CHIPS = [
  'Vehicle blocking footpath',
  'No-parking sign clearly visible',
  'Vehicle here 2+ hours',
  'Hazard to pedestrians',
]

function GpsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>
    </svg>
  )
}

export default function ReportNewPage() {
  const [step, setStep]           = useState(0)
  const [selectedCat, setSelectedCat] = useState('')
  const [note, setNote]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [photos, setPhotos]       = useState<File[]>([])
  const [previews, setPreviews]   = useState<string[]>([])
  const [activePreview, setActivePreview] = useState(0)          // which thumbnail is shown large
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false)  // popup after first photo
  const [gps, setGps]             = useState<GpsSnapshot | null>(null)
  const [locStatus, setLocStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [address, setAddress]     = useState('')
  const [nearbyContext, setNearbyContext] = useState<NearbyContext | null>(null)
  const [nearbyStatus, setNearbyStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [animKey, setAnimKey]     = useState(0)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const galleryInputRef           = useRef<HTMLInputElement>(null)

  function getGpsQuality(snapshot: GpsSnapshot | null): 'high' | 'medium' | 'low' | 'stale' | 'missing' {
    if (!snapshot) return 'missing'
    const ageMs = Date.now() - new Date(snapshot.capturedAt).getTime()
    if (ageMs > GPS_MAX_AGE_MS) return 'stale'
    if (snapshot.accuracy <= GPS_GOOD_ACCURACY_METERS) return 'high'
    if (snapshot.accuracy <= GPS_ACCEPTABLE_ACCURACY_METERS) return 'medium'
    return 'low'
  }

  const gpsQuality = getGpsQuality(gps)
  const hasAcceptableGps = gpsQuality === 'high' || gpsQuality === 'medium'

  function getMapBounds(snapshot: GpsSnapshot) {
    const delta = 0.0022
    return {
      minLat: snapshot.lat - delta,
      maxLat: snapshot.lat + delta,
      minLng: snapshot.lng - delta,
      maxLng: snapshot.lng + delta,
    }
  }

  function getNearbySummary(context: NearbyContext | null) {
    if (!context) return ''
    return [
      context.road,
      context.neighbourhood,
      context.suburb,
      context.city,
      context.postcode,
    ].filter(Boolean).join(' · ')
  }

  function requestLocation() {
    if (!navigator.geolocation) { setLocStatus('denied'); return }
    setLocStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          capturedAt: new Date(pos.timestamp).toISOString(),
        })
        setLocStatus('granted')
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  // No longer auto-request GPS on step entry; user taps the button instead
  // (keeps the step from appearing blank if the browser blocks the prompt silently)

  useEffect(() => {
    setAnimKey(k => k + 1)
  }, [step])

  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])

  useEffect(() => {
    if (!gps || !hasAcceptableGps) {
      setNearbyContext(null)
      setNearbyStatus('idle')
      return
    }

    const gpsSnapshot = gps
    const controller = new AbortController()

    async function loadNearbyContext() {
      try {
        setNearbyStatus('loading')
        const params = new URLSearchParams({
          format: 'jsonv2',
          lat: String(gpsSnapshot.lat),
          lon: String(gpsSnapshot.lng),
          zoom: '18',
          addressdetails: '1',
        })

        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })

        if (!res.ok) throw new Error('Reverse geocode failed')
        const json = await res.json() as {
          display_name?: string
          address?: Record<string, string | undefined>
        }

        const addr = json.address ?? {}
        setNearbyContext({
          road: addr.road ?? addr.pedestrian ?? addr.footway ?? null,
          neighbourhood: addr.neighbourhood ?? addr.hamlet ?? null,
          suburb: addr.suburb ?? addr.city_district ?? addr.county ?? null,
          city: addr.city ?? addr.town ?? addr.village ?? null,
          postcode: addr.postcode ?? null,
          displayName: json.display_name ?? null,
        })
        setNearbyStatus('ready')
      } catch {
        if (!controller.signal.aborted) {
          setNearbyContext(null)
          setNearbyStatus('error')
        }
      }
    }

    loadNearbyContext()
    return () => controller.abort()
  }, [gps, hasAcceptableGps])

  const canNext = step === 0
    ? photos.length > 0
    : step === 1
      ? hasAcceptableGps
      : step === 2
        ? !!selectedCat
        : true

  const goNext = useCallback(() => {
    if (canNext) setStep(s => s + 1)
  }, [canNext])

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const fd = new FormData()
      fd.append('category', selectedCat)
      fd.append('address', address)
      fd.append('lat', gps ? String(gps.lat) : '')
      fd.append('lng', gps ? String(gps.lng) : '')
      fd.append('gps_accuracy', gps ? String(gps.accuracy) : '')
      fd.append('gps_captured_at', gps?.capturedAt ?? '')
      fd.append('gps_quality', gpsQuality)
      fd.append('note', note)
      // Compress each photo before upload to stay well under the 4 MB body limit
      const compressed = await Promise.all(photos.map(p => compressImage(p)))
      for (const p of compressed) fd.append('photos', p)
      const res = await fetch('/api/reports', { method: 'POST', body: fd })
      // Guard against non-JSON responses (e.g. 413 Request Entity Too Large)
      let json: Record<string, unknown> = {}
      try { json = await res.json() } catch {
        if (res.status === 413) throw new Error('Photos are too large. Please try again with fewer or smaller images.')
        throw new Error(`Server error (${res.status}). Please try again.`)
      }
      if (!res.ok) throw new Error((json.error as string) ?? 'Submission failed')
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? [])
    setPhotos(prev => {
      const merged = [...prev, ...incoming]
      const seen = new Set<string>()
      const next = merged.filter(f => {
        const key = `${f.name}-${f.size}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }).slice(0, 4)
      // Show prompt only when going from 0 → 1+ photos
      if (prev.length === 0 && next.length > 0) {
        setTimeout(() => setShowPhotoPrompt(true), 300)
      }
      // Auto-select the first newly added photo in the viewfinder
      if (next.length > prev.length) {
        setActivePreview(prev.length)
      }
      return next
    })
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      const next = prev.filter((_, i) => i !== index)
      setActivePreview(Math.min(activePreview, Math.max(next.length - 1, 0)))
      return next
    })
  }

  // ── Compress a photo to JPEG before uploading (prevents 413 errors) ────────
  async function compressImage(file: File, maxDimension = 1920, quality = 0.82): Promise<File> {
    if (!file.type.startsWith('image/') || typeof document === 'undefined') return file
    return new Promise(resolve => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) { height = Math.round((height / width) * maxDimension); width = maxDimension }
          else { width = Math.round((width / height) * maxDimension); height = maxDimension }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          blob => {
            if (!blob) { resolve(file); return }
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg', lastModified: file.lastModified,
            }))
          },
          'image/jpeg', quality
        )
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  /* ─── Success Screen ─── */
  if (submitted) {
    return (
      <div className="grain" style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ animation: 'fadeUp 0.5s ease both', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, maxWidth: 340 }}>
          {/* Success ring */}
          <div style={{ position: 'relative', width: 88, height: 88 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'var(--status-approved-bg)',
              border: '1.5px solid var(--status-approved)',
              display: 'grid', placeItems: 'center',
            }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--status-approved)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            {/* Pulse ring */}
            <div style={{
              position: 'absolute', inset: -6,
              borderRadius: '50%',
              border: '1.5px solid var(--status-approved)',
              opacity: 0.25,
              animation: 'scaleIn 0.6s ease both 0.15s',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>
              Report submitted
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              Your report is in the review queue. You&apos;ll be notified when an officer acts on it.
            </p>
          </div>

          {/* Privacy pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999, fontSize: 12.5, color: 'var(--muted)' }}>
            <ShieldIcon />
            <span>Issued as <strong style={{ color: 'var(--ink)' }}>City of Bangalore</strong> · Your identity is hidden</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <Link href="/citizen/my-reports" className="btn btn-primary" style={{ width: '100%', height: 46, fontSize: 14, justifyContent: 'center' }}>
              View my reports
            </Link>
            <button
              onClick={() => { setSubmitted(false); setStep(0); setSelectedCat(''); setNote(''); setPhotos([]) }}
              className="btn btn-secondary"
              style={{ width: '100%', height: 46, fontSize: 14 }}
            >
              File another report
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Main Shell ─── */
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <header className="grain" style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(250,250,247,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ padding: '0 18px', height: 52, display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Back button */}
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                display: 'grid', placeItems: 'center',
                cursor: 'pointer', color: 'var(--ink-3)',
                flexShrink: 0,
                transition: 'background var(--transition-fast)',
              }}
            >
              <ChevronLeft />
            </button>
          ) : (
            <Link
              href="/citizen/my-reports"
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                display: 'grid', placeItems: 'center',
                color: 'var(--ink-3)', flexShrink: 0,
              }}
            >
              <ChevronLeft />
            </Link>
          )}

          {/* Step label */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)', lineHeight: 1.2 }}>
              {STEPS[step].label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
              Step {step + 1} of {STEPS.length}
            </div>
          </div>
        </div>

        {/* Progress track */}
        <div style={{ display: 'flex', gap: 3, padding: '0 18px 12px' }}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              style={{
                flex: 1, height: 3, borderRadius: 999,
                background: i < step ? 'var(--primary)' : i === step ? 'var(--primary)' : 'var(--surface-3)',
                opacity: i === step ? 1 : i < step ? 0.55 : 1,
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      </header>

      {/* ── Step Content ── */}
      <div key={animKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeUp 0.28s ease both' }}>

        {/* ─── Step 0: Photos ─── */}
        {step === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Viewfinder */}
            <div className="grain grain-dark" style={{ flex: 1, background: '#070C17', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 340 }}>
              {/* Preview image — shows whichever thumbnail is active */}
              <div style={{ flex: 1, position: 'relative' }}>
                {previews[activePreview] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[activePreview]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.92 }} />
                ) : (
                  <Image src="/images/1.png" alt="Camera preview" fill style={{ objectFit: 'cover', opacity: 0.7 }} priority />
                )}

                {/* Vignette */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none' }} />

                {/* Frame guide */}
                <div style={{
                  position: 'absolute', left: '13%', right: '13%', top: '22%', bottom: '28%',
                  border: '1px dashed rgba(255,255,255,0.3)',
                  borderRadius: 10,
                }}>
                  {/* Corner accents */}
                  {[
                    { top: -2, left: -2,   borderRight: 'none', borderBottom: 'none' },
                    { top: -2, right: -2,  borderLeft:  'none', borderBottom: 'none' },
                    { bottom: -2, left: -2,  borderRight: 'none', borderTop: 'none' },
                    { bottom: -2, right: -2, borderLeft:  'none', borderTop: 'none' },
                  ].map((style, i) => (
                    <span
                      key={i}
                      style={{
                        position: 'absolute',
                        width: 20, height: 20,
                        border: '2.5px solid #FFD43B',
                        ...style,
                      }}
                    />
                  ))}
                </div>

                {/* Instruction pill */}
                <div style={{
                  position: 'absolute',
                  left: '50%', transform: 'translateX(-50%)',
                  top: 18,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '7px 14px',
                  borderRadius: 999,
                  fontSize: 12, fontWeight: 500,
                  color: 'white',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#FFD43B', flexShrink: 0 }} />
                  Frame plate + no-parking sign
                </div>

                {/* GPS readout */}
                <div style={{
                  position: 'absolute', bottom: 16, left: 16, right: 16,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', padding: '5px 10px', borderRadius: 8, color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>
                    <GpsIcon />
                    {gps ? `GPS ±${gps.accuracy}m` : 'Acquiring GPS…'}
                  </div>
                  {gps && (
                    <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', padding: '5px 10px', borderRadius: 8, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      {gps.lat.toFixed(4)}°N {gps.lng.toFixed(4)}°E
                    </div>
                  )}
                </div>
              </div>

              {/* Camera controls bar */}
              <div className="grain grain-dark" style={{ padding: '16px 22px 20px', background: 'rgba(7,12,23,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Thumbnails */}
                <div style={{ display: 'flex', gap: 7 }}>
                  {[0, 1, 2, 3].map(n => (
                    <div
                      key={n}
                      onClick={() => {
                        if (previews[n]) {
                          // Tap filled slot → switch active preview
                          setActivePreview(n)
                        } else {
                          // Tap empty slot → open camera
                          fileInputRef.current?.click()
                        }
                      }}
                      style={{
                        width: 46, height: 46,
                        borderRadius: 8,
                        border: n === activePreview && previews[n]
                          ? '2px solid #FFD43B'
                          : previews[n]
                          ? '1.5px solid rgba(255,255,255,0.5)'
                          : '1.5px dashed rgba(255,255,255,0.2)',
                        overflow: 'hidden',
                        position: 'relative',
                        background: 'rgba(255,255,255,0.04)',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      {previews[n] ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={previews[n]} alt={`Photo ${n + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 2, right: 3, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{n + 1}</div>
                          {/* Remove button */}
                          <button
                            onClick={e => { e.stopPropagation(); removePhoto(n) }}
                            aria-label={`Remove photo ${n + 1}`}
                            style={{
                              position: 'absolute', top: 2, left: 2,
                              width: 16, height: 16, borderRadius: 999,
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none', cursor: 'pointer',
                              display: 'grid', placeItems: 'center', padding: 0,
                            }}
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Hidden camera input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {/* Hidden gallery input (no capture attribute = opens photo library) */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {/* Shutter — camera only */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Take photo"
                  style={{
                    width: 68, height: 68,
                    borderRadius: 999,
                    background: 'white',
                    border: '4px solid rgba(255,255,255,0.25)',
                    cursor: 'pointer',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                    flexShrink: 0,
                    transition: 'transform 0.12s ease',
                  }}
                />

                {/* Gallery picker */}
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  aria-label="Choose from gallery"
                  style={{
                    width: 46, height: 46,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    display: 'grid', placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="m21 15-5-5L5 21"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* CTA */}
            <div style={{ padding: '14px 20px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              <button
                onClick={goNext}
                disabled={!canNext}
                className="btn btn-primary"
                style={{ width: '100%', height: 48, fontSize: 14, borderRadius: 12, opacity: canNext ? 1 : 0.45, cursor: canNext ? 'pointer' : 'not-allowed' }}
              >
                {photos.length > 0 ? `Use ${photos.length} photo${photos.length > 1 ? 's' : ''} →` : 'Add at least 1 photo to continue'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)', marginTop: 9, lineHeight: 1.5 }}>
                Tap a thumbnail to preview · tap + to add more
              </p>
            </div>

            {/* ── Photo-added action sheet ── */}
            {showPhotoPrompt && (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => setShowPhotoPrompt(false)}
                  style={{
                    position: 'fixed', inset: 0, zIndex: 40,
                    background: 'rgba(0,0,0,0.5)',
                    animation: 'fadeIn 0.2s ease both',
                  }}
                />
                {/* Sheet */}
                <div style={{
                  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
                  background: 'var(--surface)',
                  borderRadius: '20px 20px 0 0',
                  padding: '20px 20px 36px',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                  animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>
                  {/* Drag handle */}
                  <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--line)', margin: '0 auto 20px' }} />

                  {/* Success message */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'var(--status-approved-bg)',
                      border: '1px solid var(--status-approved)',
                      display: 'grid', placeItems: 'center',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--status-approved)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                        Photo {photos.length} added
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                        You can add up to {4 - photos.length} more photo{4 - photos.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Take another */}
                    {photos.length < 4 && (
                      <button
                        onClick={() => {
                          setShowPhotoPrompt(false)
                          setTimeout(() => fileInputRef.current?.click(), 100)
                        }}
                        className="btn btn-secondary"
                        style={{ width: '100%', height: 50, fontSize: 14, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        Take another photo
                      </button>
                    )}

                    {/* Continue */}
                    <button
                      onClick={() => { setShowPhotoPrompt(false); goNext() }}
                      className="btn btn-primary"
                      style={{ width: '100%', height: 50, fontSize: 14, borderRadius: 12 }}
                    >
                      Continue with {photos.length} photo{photos.length > 1 ? 's' : ''} →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step 1: Location ─── */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>Location</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>Where did this happen?</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
                Confirm the exact spot with live GPS, then add a landmark only if it helps the officer recognize the curb or junction.
              </p>
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── Always-visible address input ── */}
              <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 7 }}>Address / Landmark</div>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. Near City Market, MG Road, Bengaluru…"
                  autoFocus
                  style={{ width: '100%', fontSize: 14.5, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', letterSpacing: '-0.01em' }}
                />
                {gps && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)', marginTop: 7 }}>
                    {gps.lat.toFixed(5)}°N · {gps.lng.toFixed(5)}°E · ±{gps.accuracy}m
                  </div>
                )}
              </div>

              {/* ── GPS button + inline status ── */}
              <button
                onClick={requestLocation}
                disabled={locStatus === 'requesting'}
                style={{
                  width: '100%', padding: '13px 16px', borderRadius: 12,
                  border: `1.5px solid ${locStatus === 'granted' ? 'var(--status-approved)' : locStatus === 'denied' ? 'rgba(180,51,56,0.3)' : 'var(--line)'}`,
                  background: locStatus === 'granted' ? 'var(--status-approved-bg)' : locStatus === 'denied' ? 'var(--error-bg)' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: locStatus === 'requesting' ? 'not-allowed' : 'pointer',
                  opacity: locStatus === 'requesting' ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: locStatus === 'granted' ? 'var(--status-approved)' : locStatus === 'denied' ? 'rgba(180,51,56,0.15)' : 'var(--primary-soft)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={locStatus === 'granted' ? 'white' : locStatus === 'denied' ? 'var(--status-rejected)' : 'var(--primary)'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    {locStatus === 'denied' && <path d="m4 4 16 16"/>}
                  </svg>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: locStatus === 'granted'
                    ? hasAcceptableGps ? 'var(--status-approved)' : 'var(--status-pending)'
                    : locStatus === 'denied' ? 'var(--status-rejected)' : 'var(--ink)' }}>
                    {locStatus === 'idle'       && 'Lock exact GPS location'}
                    {locStatus === 'requesting' && 'Waiting for GPS…'}
                    {locStatus === 'granted'    && (hasAcceptableGps ? 'GPS location verified' : 'GPS signal too broad')}
                    {locStatus === 'denied'     && 'GPS denied — tap to retry'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    {locStatus === 'idle'       && 'Capture a live location fix from the device'}
                    {locStatus === 'requesting' && 'Allow location in the browser prompt'}
                    {locStatus === 'granted'    && (
                      hasAcceptableGps
                        ? `±${gps?.accuracy}m accuracy · fresh coordinates will be attached`
                        : `±${gps?.accuracy}m accuracy · move closer and retry for a tighter fix`
                    )}
                    {locStatus === 'denied'     && 'Check browser site permissions and try again'}
                  </div>
                </div>
                {locStatus === 'requesting' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--primary)', opacity: 0.4, animation: `fadeIn 0.6s ease ${i * 0.2}s infinite alternate both` }} />
                    ))}
                  </div>
                )}
                {locStatus === 'granted' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-approved)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                )}
              </button>

              <div style={{
                background: hasAcceptableGps ? 'var(--status-approved-bg)' : 'var(--surface)',
                border: `1px solid ${hasAcceptableGps ? 'rgba(31,122,74,0.2)' : 'var(--line)'}`,
                borderRadius: 12,
                padding: '12px 14px',
              }}>
                <p style={{ fontSize: 12.5, color: 'var(--ink)', margin: 0, lineHeight: 1.55, fontWeight: 500 }}>
                  {gpsQuality === 'missing' && 'A live GPS lock is now required before submission.'}
                  {gpsQuality === 'high' && 'High-confidence GPS lock captured. This is strong enough for exact spot review.'}
                  {gpsQuality === 'medium' && 'Usable GPS lock captured. Adding a landmark below will help the officer confirm the exact curb or junction.'}
                  {gpsQuality === 'low' && 'The current GPS fix is too wide for reliable enforcement. Retry once you have a clearer signal.'}
                  {gpsQuality === 'stale' && 'This GPS fix is stale. Refresh it near the vehicle before continuing.'}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
                  We store accuracy and capture time along with the coordinates so location quality can be audited later.
                </p>
              </div>

              {hasAcceptableGps && gps && (
                <div style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 7 }}>
                      Map confirmation
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                      Confirm the curb, junction, or roadside stretch
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                      This nearby-road context is pulled from OpenStreetMap and helps the officer verify the exact scene.
                    </div>
                  </div>

                  <div style={{ position: 'relative', height: 200, background: 'var(--surface-2)' }}>
                    <iframe
                      title="Location confirmation map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${getMapBounds(gps).minLng}%2C${getMapBounds(gps).minLat}%2C${getMapBounds(gps).maxLng}%2C${getMapBounds(gps).maxLat}&layer=mapnik&marker=${gps.lat}%2C${gps.lng}`}
                      style={{ width: '100%', height: '100%', border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>
                      {nearbyStatus === 'loading' && 'Looking up nearby roads and landmarks…'}
                      {nearbyStatus === 'error' && 'Map loaded, but nearby-road lookup is unavailable right now.'}
                      {nearbyStatus === 'ready' && (getNearbySummary(nearbyContext) || nearbyContext?.displayName || 'Nearby context found')}
                    </div>

                    {nearbyStatus === 'ready' && nearbyContext && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Road', value: nearbyContext.road ?? 'Not identified' },
                          { label: 'Area', value: nearbyContext.neighbourhood ?? nearbyContext.suburb ?? 'Not identified' },
                          { label: 'City', value: nearbyContext.city ?? 'Not identified' },
                          { label: 'Postcode', value: nearbyContext.postcode ?? 'Not identified' },
                        ].map((item) => (
                          <div key={item.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 11px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: 5 }}>
                              {item.label}
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.45 }}>
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            <div style={{ marginTop: 'auto', padding: '14px 20px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              <button
                onClick={goNext}
                disabled={!canNext}
                className="btn btn-primary"
                style={{
                  width: '100%', height: 48, fontSize: 14, borderRadius: 12,
                  opacity: canNext ? 1 : 0.45,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                }}
              >
                {locStatus === 'requesting' ? 'Waiting for GPS…' : 'Confirm location →'}
              </button>
              {!hasAcceptableGps && (
                <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
                  Capture a fresh GPS fix within about ±60m to continue
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 2: Category ─── */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>Violation type</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>What did you observe?</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>Pick the closest match. Officers can still correct the category during review.</p>
            </div>

            <div style={{ flex: 1, padding: '8px 20px 0', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CATEGORIES.map(cat => {
                  const selected = selectedCat === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCat(cat.id)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: selected ? 'var(--primary-soft)' : 'var(--surface)',
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--line)'}`,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                        background: selected ? 'var(--primary)' : 'var(--surface-2)',
                        color: selected ? 'white' : 'var(--ink-3)',
                        display: 'grid', placeItems: 'center',
                        transition: 'all 0.15s ease',
                      }}>
                        {cat.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{cat.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{cat.description}</div>
                        <div style={{ fontFamily: 'var(--font-kn)', fontSize: 11, color: 'var(--muted-2)', marginTop: 2 }}>{cat.kn}</div>
                      </div>

                      <div style={{
                        width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                        background: selected ? 'var(--primary)' : 'transparent',
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--line)'}`,
                        display: 'grid', placeItems: 'center',
                        transition: 'all 0.15s ease',
                      }}>
                        {selected && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 12 2 2 4-4"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: '14px 20px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              <button onClick={goNext} disabled={!canNext} className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 14, borderRadius: 12, opacity: canNext ? 1 : 0.45 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Review ─── */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>Final check</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>Review and submit</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
                Check the summary below, then add an optional note only if it helps the officer review faster.
              </p>
            </div>

            <div style={{ flex: 1, padding: '0 20px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Photo strip */}
              {previews.length > 0 ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ width: 72, height: 60, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', flexShrink: 0, position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ width: 72, height: 60, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
                  <Image src="/images/1.png" alt="Photo" fill style={{ objectFit: 'cover' }} />
                </div>
              )}

              {/* Summary card */}
              <div className="grain" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
                {[
                  { label: 'Violation', value: CATEGORIES.find(c => c.id === selectedCat)?.name ?? '—' },
                  { label: 'Fine',      value: CATEGORIES.find(c => c.id === selectedCat)?.fine ?? '—' },
                  { label: 'Location',  value: address || 'Landmark not added' },
                  { label: 'Nearby',    value: getNearbySummary(nearbyContext) || nearbyContext?.displayName || 'Context unavailable' },
                  { label: 'GPS',       value: gps ? `${gps.lat.toFixed(4)}°N · ${gps.lng.toFixed(4)}°E · ±${gps.accuracy}m` : 'Not acquired' },
                  { label: 'Photos',    value: photos.length > 0 ? `${photos.length} attached` : 'None' },
                  { label: 'Note',      value: note || '—' },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '12px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', flexShrink: 0, paddingTop: 1 }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, textAlign: 'right', maxWidth: '65%', lineHeight: 1.4 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 8 }}>
                  Optional note
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Vehicle has been parked here since 8 AM. No-parking sign is clearly visible in photo 2."
                  rows={4}
                  style={{
                    width: '100%', fontFamily: 'inherit',
                    fontSize: 14, color: 'var(--ink)',
                    background: 'transparent',
                    border: 'none', outline: 'none',
                    resize: 'none', lineHeight: 1.6,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {NOTE_CHIPS.map(chip => (
                      <button
                        key={chip}
                        onClick={() => setNote(chip)}
                        style={{
                          padding: '7px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: 999,
                          background: note === chip ? 'var(--primary-soft)' : 'var(--surface)',
                          borderColor: note === chip ? 'var(--primary)' : 'var(--line)',
                          fontSize: 12.5, color: note === chip ? 'var(--primary-ink)' : 'var(--ink-2)',
                          cursor: 'pointer',
                          fontWeight: note === chip ? 500 : 400,
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>{note.length} chars</span>
                </div>
              </div>

              {/* Privacy notice */}
              <div style={{ display: 'flex', gap: 11, padding: '13px 15px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}>
                  <ShieldIcon />
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>
                  This report will be issued as <strong style={{ color: 'var(--ink)' }}>"City of Bangalore"</strong>. Your name and contact are never disclosed to the vehicle owner.
                </p>
              </div>

              {submitError && (
                <div style={{ padding: '11px 14px', background: 'var(--error-bg)', border: '1px solid rgba(180,51,56,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--error)', lineHeight: 1.5 }}>
                  {submitError}
                </div>
              )}
            </div>

            <div style={{ padding: '14px 20px 28px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', height: 52, fontSize: 15, borderRadius: 14, opacity: submitting ? 0.65 : 1, letterSpacing: '-0.01em' }}
              >
                {submitting ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 999, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Submitting…
                  </span>
                ) : 'Submit report'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
                By submitting you confirm this report is accurate to the best of your knowledge.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

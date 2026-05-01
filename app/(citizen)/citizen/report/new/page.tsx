'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  {
    id: 'no-parking',
    name: 'No Parking',
    kn: 'ನೋ ಪಾರ್ಕಿಂಗ್',
    fine: '₹1,000',
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
    fine: '₹500',
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
  { id: 'category', label: 'Violation' },
  { id: 'location', label: 'Location' },
  { id: 'note',     label: 'Details' },
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
  const [gps, setGps]             = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [locStatus, setLocStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [address, setAddress]     = useState('')
  const [animKey, setAnimKey]     = useState(0)
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const galleryInputRef           = useRef<HTMLInputElement>(null)

  function requestLocation() {
    if (!navigator.geolocation) { setLocStatus('denied'); return }
    setLocStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) })
        setLocStatus('granted')
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  // Auto-request when user reaches step 2
  useEffect(() => {
    if (step === 2 && locStatus === 'idle') requestLocation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    setAnimKey(k => k + 1)
  }, [step])

  useEffect(() => {
    const urls = photos.map(f => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [photos])

  const canNext = step === 0 ? photos.length > 0 : step === 1 ? !!selectedCat : true

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
      fd.append('note', note)
      for (const p of photos) fd.append('photos', p)
      const res  = await fetch('/api/reports', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      setSubmitted(true)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4)
    setPhotos(files)
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
              {/* Preview image */}
              <div style={{ flex: 1, position: 'relative' }}>
                {previews[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[0]} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.92 }} />
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
                      style={{
                        width: 46, height: 46,
                        borderRadius: 8,
                        border: previews[n] ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px dashed rgba(255,255,255,0.2)',
                        overflow: 'hidden',
                        position: 'relative',
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      {previews[n] && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={previews[n]} alt={`Photo ${n + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', bottom: 2, right: 3, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{n + 1}</div>
                        </>
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
                Photo is required as proof · shutter = camera · gallery icon = library
              </p>
            </div>
          </div>
        )}

        {/* ─── Step 1: Category ─── */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>Violation type</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>What did you observe?</h2>
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

                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: selected ? 'var(--primary)' : 'var(--ink-3)' }}>{cat.fine}</div>
                        <div style={{
                          width: 20, height: 20, borderRadius: 999,
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
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: '14px 20px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              <button onClick={goNext} disabled={!canNext} className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 14, borderRadius: 12 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Location ─── */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>GPS location</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>Confirm location</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
                {locStatus === 'granted' ? 'GPS locked. Adjust address if needed.' : 'We need your location to file the report.'}
              </p>
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* ── Requesting state ── */}
              {locStatus === 'requesting' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '48px 24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 999, background: 'var(--primary-soft)', display: 'grid', placeItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Requesting location…</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Allow location access in the browser prompt that appeared.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--primary)', opacity: 0.3, animation: `fadeIn 0.6s ease ${i * 0.2}s infinite alternate both` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Denied state ── */}
              {locStatus === 'denied' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '36px 24px', background: 'var(--error-bg)', border: '1px solid rgba(180,51,56,0.2)', borderRadius: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 999, background: 'rgba(180,51,56,0.12)', display: 'grid', placeItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="m4 4 16 16"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--error)', marginBottom: 4 }}>Location access denied</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                      To enable it: open your browser settings → Site permissions → Location → Allow for this site. Then tap retry below.
                    </div>
                  </div>
                  <button onClick={requestLocation} className="btn btn-secondary" style={{ height: 42, fontSize: 13.5 }}>
                    Retry
                  </button>
                </div>
              )}

              {/* ── Granted state — map + address ── */}
              {locStatus === 'granted' && gps && (
                <>
                  {/* Map placeholder with GPS pin */}
                  <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative', height: 200 }}>
                    <Image src="/images/5.png" alt="Location map" fill style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50% 50% 50% 4px', background: 'var(--primary)', transform: 'rotate(-45deg)', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                    </div>
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#22C55E', flexShrink: 0 }} />
                      Locked · ±{gps.accuracy}m
                    </div>
                  </div>

                  {/* Address input */}
                  <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 7 }}>Address / Landmark</div>
                    <input
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="e.g. Near City Market, MG Road…"
                      style={{ width: '100%', fontSize: 14.5, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', letterSpacing: '-0.01em' }}
                    />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)', marginTop: 7 }}>
                      {gps.lat.toFixed(5)}°N · {gps.lng.toFixed(5)}°E
                    </div>
                  </div>

                  {/* Zone badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--status-rejected-bg)', border: '1px solid rgba(180,51,56,0.2)', borderRadius: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-rejected)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <span style={{ fontSize: 12.5, color: 'var(--status-rejected)', fontWeight: 500 }}>No-parking zone · MV Act §122</span>
                  </div>
                </>
              )}

            </div>

            <div style={{ marginTop: 'auto', padding: '14px 20px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              {locStatus === 'denied' ? (
                /* Skip option when denied */
                <button onClick={goNext} className="btn btn-secondary" style={{ width: '100%', height: 48, fontSize: 14, borderRadius: 12 }}>
                  Skip location and continue →
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={locStatus === 'requesting'}
                  className="btn btn-primary"
                  style={{ width: '100%', height: 48, fontSize: 14, borderRadius: 12 }}
                >
                  {locStatus === 'requesting' ? 'Waiting for location…' : 'Confirm location →'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 3: Note ─── */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>Optional</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>Add details</h2>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>Help the reviewing officer with context.</p>
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Vehicle has been parked here since 8 AM. No-parking sign is clearly visible in photo 2."
                  rows={5}
                  style={{
                    width: '100%', fontFamily: 'inherit',
                    fontSize: 14, color: 'var(--ink)',
                    background: 'transparent',
                    border: 'none', outline: 'none',
                    resize: 'none', lineHeight: 1.6,
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>{note.length} chars</span>
                </div>
              </div>

              {/* Quick-fill chips */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 8 }}>Quick fill</div>
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
              </div>
            </div>

            <div style={{ marginTop: 'auto', padding: '14px 20px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
              <button onClick={goNext} className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 14, borderRadius: 12 }}>
                Review & submit →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Review ─── */}
        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 20px 12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--muted)', marginBottom: 6 }}>Final check</p>
              <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', margin: 0, color: 'var(--ink)' }}>Review report</h2>
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
                  { label: 'Location',  value: address || '—' },
                  { label: 'GPS',       value: gps ? `${gps.lat.toFixed(4)}°N · ${gps.lng.toFixed(4)}°E` : 'Not acquired' },
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

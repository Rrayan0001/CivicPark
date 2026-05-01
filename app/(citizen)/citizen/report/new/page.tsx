'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  { id: 'no-parking',    name: 'No parking',      kn: 'ನೋ ಪಾರ್ಕಿಂಗ್',     fine: '₹1,000', icon: <path d="M9 12h6M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9Z"/> },
  { id: 'footpath',      name: 'Footpath parking', kn: 'ಫುಟ್ ಪಾತ್ ನಿಲ್ಲಿಸಿದ',  fine: '₹500',   icon: <><path d="M4 17H2a10 10 0 0 1 20 0h-2"/><path d="M12 7v4M8 21h8"/></> },
  { id: 'blocking',      name: 'Blocking traffic', kn: 'ಟ್ರಾಫಿಕ್ ತಡೆ',       fine: '₹500',   icon: <><path d="M8 3h8l3 6H5l3-6Z"/><path d="M5 9v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M9 17v-4h6v4"/></> },
  { id: 'wrong-side',    name: 'Wrong parking',    kn: 'ತಪ್ಪು ಪಾರ್ಕಿಂಗ್',    fine: '₹500',   icon: <><path d="M3 9h12m-4-4 4 4-4 4"/><path d="M21 15H9m4 4-4-4 4-4"/></> },
  { id: 'double',        name: 'Double parking',   kn: 'ಡಬಲ್ ಪಾರ್ಕಿಂಗ್',    fine: '₹500',   icon: <><rect x="2" y="8" width="8" height="10" rx="2"/><rect x="14" y="8" width="8" height="10" rx="2"/></> },
  { id: 'disabled-bay',  name: 'Disabled bay',     kn: 'ವಿಕಲಾಂಗ ಸ್ಥಳ',      fine: '₹500',   icon: <><circle cx="12" cy="5" r="2"/><path d="M12 7v5l3 4"/><path d="M9 17a3 3 0 1 0 6 0"/></> },
]

const STEPS = ['Photos', 'Category', 'Location', 'Note', 'Submit']

export default function ReportNewPage() {
  const [step, setStep] = useState(0)
  const [selectedCat, setSelectedCat] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [address, setAddress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  const canNext = step === 0 ? true : step === 1 ? !!selectedCat : true

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

      const res = await fetch('/api/reports', { method: 'POST', body: fd })
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
    if (files.length > 0) setStep(1)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 22px', textAlign: 'center', gap: 20 }}>
        <div style={{ width: 80, height: 80, borderRadius: 999, background: 'var(--status-approved-bg)', border: '2px solid var(--status-approved)', display: 'grid', placeItems: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--status-approved)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Report submitted!</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.6, maxWidth: 300 }}>
            Your report is now in the review queue. You&apos;ll be notified when an officer acts on it.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
            The vehicle owner will see this as issued by <strong style={{ color: 'var(--ink)' }}>"City of Bangalore"</strong>. Your identity is never shared.
          </p>
          <Link href="/citizen/my-reports" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: 44 }}>View my reports</Link>
          <button onClick={() => { setSubmitted(false); setStep(0); setSelectedCat(''); setNote(''); setPhotos([]) }} className="btn btn-secondary" style={{ width: '100%', height: 44 }}>File another report</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Step header */}
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '12px 18px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--ink-2)', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
            </button>
          ) : (
            <Link href="/citizen/my-reports" style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid var(--line)', background: 'var(--surface)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6"/></svg>
            </Link>
          )}
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.01em' }}>{STEPS[step]}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)' }}>{step + 1} / {STEPS.length}</span>
        </div>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, padding: '0 18px 12px' }}>
          {STEPS.map((_, i) => (
            <span key={i} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? 'var(--primary)' : 'var(--surface-3)' }} />
          ))}
        </div>
      </div>

      {/* Step 0: Photo capture */}
      {step === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: '#0A0F19', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              {photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(photos[0])} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9, position: 'absolute', inset: 0 }} />
              ) : (
                <Image src="/images/1.png" alt="Camera preview" fill style={{ objectFit: 'cover', opacity: 0.9 }} priority />
              )}
              {/* Frame guide */}
              <div style={{ position: 'absolute', left: '14%', right: '14%', top: '26%', bottom: '32%', border: '1.5px dashed rgba(255,255,255,0.55)', borderRadius: 8 }}>
                {[
                  { top: -2, left: -2, borderRight: 0, borderBottom: 0 },
                  { top: -2, right: -2, borderLeft: 0, borderBottom: 0 },
                  { bottom: -2, left: -2, borderRight: 0, borderTop: 0 },
                  { bottom: -2, right: -2, borderLeft: 0, borderTop: 0 },
                ].map((s, i) => (
                  <span key={i} style={{ position: 'absolute', width: 18, height: 18, border: '2px solid #F8E55C', ...s }} />
                ))}
              </div>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: '14%', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, color: 'white', display: 'inline-flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#F8E55C' }} />
                Frame the plate + no-parking sign
              </div>
              <div style={{ position: 'absolute', bottom: 18, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                {gps ? (
                  <>
                    <span>GPS locked · ±{gps.accuracy}m</span>
                    <span>{gps.lat.toFixed(4)}°N {gps.lng.toFixed(4)}°E</span>
                  </>
                ) : (
                  <span>Acquiring GPS…</span>
                )}
              </div>
            </div>
            {/* Camera controls */}
            <div style={{ padding: '18px 22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0A0F19' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2, 3].map(n => (
                  <div key={n} style={{ width: 44, height: 44, borderRadius: 6, border: photos[n] ? '1px solid rgba(255,255,255,0.4)' : '1px dashed rgba(255,255,255,0.25)', position: 'relative', overflow: 'hidden' }}>
                    {photos[n] && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(photos[n])} alt={`Photo ${n + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', bottom: 2, right: 3, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.9)' }}>{n + 1}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {/* Shutter */}
              <button onClick={() => fileInputRef.current?.click()} style={{ width: 70, height: 70, borderRadius: 999, background: 'white', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer' }} />
              <button style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="4"/></svg>
              </button>
            </div>
          </div>
          <div style={{ padding: '14px 22px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            <button onClick={() => setStep(1)} className="btn btn-primary" style={{ width: '100%', height: 44 }}>
              {photos.length > 0 ? `Use ${photos.length} photo${photos.length > 1 ? 's' : ''} →` : 'Skip photos →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Tap shutter to open camera or gallery. Min 1 photo recommended.</p>
          </div>
        </div>
      )}

      {/* Step 1: Category */}
      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px 8px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>What violation?</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>Select the type of parking violation.</p>
          </div>
          <div style={{ flex: 1, padding: '8px 22px 0', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  style={{
                    padding: '16px 14px', background: selectedCat === cat.id ? 'var(--primary-soft)' : 'var(--surface)',
                    border: `1px solid ${selectedCat === cat.id ? 'var(--primary)' : 'var(--line)'}`,
                    borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120, position: 'relative', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--surface-2)', color: 'var(--primary-ink)', display: 'grid', placeItems: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{cat.icon}</svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{cat.name}</div>
                  <div style={{ fontFamily: 'var(--font-kn)', fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>{cat.kn}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{cat.fine} fine</div>
                  {selectedCat === cat.id && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 999, background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 22px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            <button onClick={() => { if (canNext) setStep(2) }} disabled={!canNext} className="btn btn-primary" style={{ width: '100%', height: 44 }}>Continue →</button>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px 8px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Confirm location</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>GPS auto-detected. Drag to adjust if needed.</p>
          </div>
          <div style={{ flex: 1, padding: '8px 22px 0' }}>
            <div style={{ height: 220, borderRadius: 10, border: '1px solid var(--line)', overflow: 'hidden', position: 'relative' }}>
              <Image src="/images/5.png" alt="Location map" fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50% 50% 50% 4px', background: 'var(--primary)', transform: 'rotate(-45deg)', border: '3px solid var(--surface)' }} />
              </div>
            </div>
            <div style={{ padding: 14, marginTop: 14, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter address or landmark…"
                style={{ width: '100%', fontSize: 14.5, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)', letterSpacing: '-0.01em' }}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
                {gps ? `${gps.lat.toFixed(4)}°N ${gps.lng.toFixed(4)}°E · ±${gps.accuracy}m · GPS locked` : 'Acquiring GPS…'}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '4px 10px', background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: 'currentColor' }} />
                No-parking zone · MV Act §122
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 22px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            <button onClick={() => setStep(3)} className="btn btn-primary" style={{ width: '100%', height: 44 }}>Confirm location →</button>
          </div>
        </div>
      )}

      {/* Step 3: Note */}
      {step === 3 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px 8px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Add a note</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>Optional. Helps the reviewing officer.</p>
          </div>
          <div style={{ flex: 1, padding: '8px 22px 0' }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Vehicle has been here since 8 AM. Sign clearly visible in photo 2."
              rows={5}
              style={{ width: '100%', padding: '12px 14px', fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, outline: 'none', resize: 'none', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {['Vehicle blocking footpath', 'No-parking sign visible', 'Vehicle here 2+ hours', 'Hazard to pedestrians'].map(chip => (
                <button key={chip} onClick={() => setNote(chip)} style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 999, background: 'var(--surface)', fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer' }}>{chip}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 22px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            <button onClick={() => setStep(4)} className="btn btn-primary" style={{ width: '100%', height: 44 }}>Review & submit →</button>
          </div>
        </div>
      )}

      {/* Step 4: Review & submit */}
      {step === 4 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px 8px' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>Review report</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5, marginTop: 4 }}>Check everything before submitting.</p>
          </div>
          <div style={{ flex: 1, padding: '8px 22px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Photo preview strip */}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ width: 80, height: 60, borderRadius: 7, overflow: 'hidden', position: 'relative', border: '1px solid var(--line)', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(p)} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            {photos.length === 0 && (
              <div style={{ width: 80, height: 60, borderRadius: 7, overflow: 'hidden', position: 'relative', border: '1px solid var(--line)' }}>
                <Image src="/images/1.png" alt="Photo 1" fill style={{ objectFit: 'cover' }} />
              </div>
            )}

            {/* Summary card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
              {[
                { k: 'Category', v: CATEGORIES.find(c => c.id === selectedCat)?.name ?? '—' },
                { k: 'Location', v: address || '—' },
                { k: 'GPS', v: gps ? `${gps.lat.toFixed(4)}°N ${gps.lng.toFixed(4)}°E · ±${gps.accuracy}m` : 'Not acquired' },
                { k: 'Photos', v: photos.length > 0 ? `${photos.length} attached ✓` : 'None' },
                { k: 'Note', v: note || '—' },
              ].map(row => (
                <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                  <span style={{ color: 'var(--muted)' }}>{row.k}</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{row.v}</span>
                </div>
              ))}
            </div>

            {/* Privacy notice */}
            <div style={{ display: 'flex', gap: 10, padding: 12, background: 'var(--chip)', border: '1px solid var(--line)', borderRadius: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}>
                <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>
              </svg>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                The vehicle owner will see this as issued by <strong style={{ color: 'var(--ink)' }}>"City of Bangalore"</strong>. Your name and number are never shared.
              </p>
            </div>

            {submitError && (
              <div style={{ padding: '10px 14px', background: '#F8DCDC', border: '1px solid #B43338', borderRadius: 8, fontSize: 13, color: '#B43338' }}>
                {submitError}
              </div>
            )}
          </div>
          <div style={{ padding: '16px 22px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface)' }}>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: 15, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

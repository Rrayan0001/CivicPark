'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...code]
    next[index] = value.slice(-1)
    setCode(next)
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = code.join('')
    if (token.length < 6) { setError('Enter the 6-digit code'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/citizen/my-reports')
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    if (error) { setError(error.message); return }
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--pad-x)',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            color: 'var(--ink)',
          }}>Civic Park</span>
        </Link>
      </nav>

      {/* Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vh, 64px) var(--pad-x)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 28 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Verify your email</p>
            <h1 style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 12 }}>
              Enter your code
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6 }}>
              We sent a 6-digit code to <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{email}</span>
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {resent && (
            <div className="alert" style={{ marginBottom: 20, background: 'var(--chip)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              Code resent — check your inbox.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* OTP inputs */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 48,
                    height: 52,
                    textAlign: 'center',
                    fontSize: 22,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    border: `1px solid ${error ? 'var(--error)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg)',
                    outline: 'none',
                    caretColor: 'transparent',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--ink)'}
                  onBlur={e => e.target.style.borderColor = error ? 'var(--error)' : 'var(--line)'}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ height: 48, fontSize: 'var(--text-sm)' }}
            >
              {loading ? <span className="spinner" /> : 'Verify Email'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              Didn&apos;t receive it?{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: resending ? 'default' : 'pointer',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--ink)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  padding: 0,
                }}
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

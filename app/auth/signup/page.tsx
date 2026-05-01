'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, type SignUpInput } from '@/lib/validations'

export default function SignupPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) })

  async function onSubmit(data: SignUpInput) {
    setLoading(true)
    setServerError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
      },
    })
    if (error) {
      setServerError(error.message)
      setLoading(false)
      return
    }
    router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`)
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
        <Link href="/auth/login" className="btn btn-secondary btn-sm">
          Sign in
        </Link>
      </nav>

      {/* Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vh, 48px) var(--pad-x)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 28 }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Join the movement</p>
            <h1 style={{ fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              Create your account
            </h1>
          </div>

          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label className="field-label" htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                {...register('full_name')}
                type="text"
                autoCapitalize="words"
                autoCorrect="off"
                className={`input${errors.full_name ? ' input-error' : ''}`}
                placeholder="Ravi Kumar"
                autoComplete="name"
              />
              {errors.full_name && <span className="field-error">{errors.full_name.message}</span>}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
                {...register('email')}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                className={`input${errors.email ? ' input-error' : ''}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="phone">
                Mobile{' '}
                <span style={{ color: 'var(--muted-2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                id="phone"
                {...register('phone')}
                type="tel"
                inputMode="numeric"
                className={`input${errors.phone ? ' input-error' : ''}`}
                placeholder="9876543210"
                autoComplete="tel"
              />
              {errors.phone && <span className="field-error">{errors.phone.message}</span>}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`input${errors.password ? ' input-error' : ''}`}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 48,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginTop: 4, width: '100%', height: 48, fontSize: 'var(--text-sm)' }}
            >
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 'var(--text-xs)', color: 'var(--muted)', lineHeight: 1.6 }}>
            Your identity is never shared with vehicle owners. Disputes show "City of Bangalore" as the source.
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations'

export function AdminLoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    setServerError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      setServerError(signInError.message)
      setLoading(false)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      await supabase.auth.signOut()
      setServerError('Unable to verify the signed-in admin account.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = (profile as { role: 'citizen' | 'officer' | 'admin' } | null)?.role

    if (profileError || role !== 'admin') {
      await supabase.auth.signOut()
      setServerError('This account does not have admin access.')
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
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
          User sign in
        </Link>
      </nav>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vh, 64px) var(--pad-x)',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{
            marginBottom: 28,
            padding: '18px 18px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-1)',
          }}>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Restricted access</p>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 8 }}>
              Admin console sign in
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6 }}>
              This sign-in is reserved for city operations and platform administrators.
            </p>
          </div>

          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="field-label" htmlFor="email">Admin email</label>
              <input
                id="email"
                {...register('email')}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                className={`input${errors.email ? ' input-error' : ''}`}
                placeholder="admin@example.com"
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email.message}</span>}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`input${errors.password ? ' input-error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: 56 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
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
              {loading ? <span className="spinner" /> : 'Sign In to Admin Console'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line-2)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.6 }}>
              Need the regular platform login instead?{' '}
              <Link href="/auth/login" style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Open user sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

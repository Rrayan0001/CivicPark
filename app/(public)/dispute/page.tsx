'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { disputeSchema, type DisputeInput } from '@/lib/validations'
import { ArrowLeft, Search, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function DisputePage() {
  const [step, setStep] = useState<'find' | 'form' | 'success'>('find')
  const [challanId, setChallanId] = useState('')
  const [reportId, setReportId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<DisputeInput>({
    resolver: zodResolver(disputeSchema),
  })

  async function handleFindChallan(e: React.FormEvent) {
    e.preventDefault()
    if (!challanId.trim()) return

    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      const { data, error: fetchError } = await (supabase
        .from('reports') as any)
        .select('id, challan_id, status')
        .eq('challan_id', challanId.trim())
        .single()

      const report = data as { id: string; status: string; challan_id: string } | null

      if (fetchError || !report) {
        setError('Challan ID not found. Please check and try again.')
      } else if (report.status === 'disputed') {
        setError('A dispute has already been filed for this challan.')
      } else {
        setReportId(report.id)
        setStep('form')
      }
    } catch (err) {
      setError('An error occurred while searching. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: DisputeInput) {
    if (!reportId) return

    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      // 1. Create dispute record
      const { error: disputeError } = await (supabase
        .from('disputes') as any)
        .insert({
          report_id: reportId,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone || null,
          reason: data.reason,
        })

      if (disputeError) throw disputeError

      // 2. Update report status
      const { error: updateError } = await (supabase
        .from('reports') as any)
        .update({ status: 'disputed' })
        .eq('id', reportId)

      if (updateError) throw updateError

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="route-page-transition" style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <nav style={{
        height: 'var(--header-height)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--pad-x)',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/auth/login" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 'var(--text-xs)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <ArrowLeft size={14} />
            Back
          </Link>
          <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
          <span className="eyebrow" style={{ color: 'var(--ink)' }}>Dispute Resolution</span>
        </div>
        <Link href="/" className="label" style={{ color: 'var(--ink)', textDecoration: 'none' }}>Civic Park</Link>
      </nav>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--pad-y) var(--pad-x)' }}>
        <div className="card animate-fade-up" style={{ width: '100%', maxWidth: step === 'form' ? 600 : 440, padding: '40px 32px' }}>
          
          {step === 'find' && (
            <>
              <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Search size={24} />
                </div>
                <h1 className="h2" style={{ marginBottom: 8 }}>Find your Challan</h1>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
                  Enter the Challan ID sent to you via SMS or email to begin the dispute process.
                </p>
              </div>

              {error && (
                <div className="badge badge-error" style={{ width: '100%', padding: '10px 12px', marginBottom: 20, justifyContent: 'center' }}>
                  <ShieldAlert size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={handleFindChallan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field">
                  <label className="field-label">Challan ID</label>
                  <input
                    className="input"
                    placeholder="e.g. BTP-2024-XXXX"
                    value={challanId}
                    onChange={(e) => setChallanId(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading || !challanId} style={{ height: 44 }}>
                  {loading ? 'Searching...' : 'Continue'}
                </button>
              </form>
            </>
          )}

          {step === 'form' && (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 className="h2" style={{ marginBottom: 8 }}>Submit Dispute</h1>
                <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
                  Challan found: <strong style={{ color: 'var(--ink)' }}>{challanId}</strong>. Please provide your contact details and a clear reason for contesting this violation.
                </p>
              </div>

              {error && (
                <div className="badge badge-error" style={{ width: '100%', padding: '10px 12px', marginBottom: 20, justifyContent: 'center' }}>
                  <ShieldAlert size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="field">
                    <label className="field-label" htmlFor="contact_email">Contact Email</label>
                    <input
                      id="contact_email"
                      {...register('contact_email')}
                      className={`input ${errors.contact_email ? 'input-error' : ''}`}
                      placeholder="email@example.com"
                    />
                    {errors.contact_email && <span className="field-error">{errors.contact_email.message}</span>}
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="contact_phone">Phone (Optional)</label>
                    <input
                      id="contact_phone"
                      {...register('contact_phone')}
                      className={`input ${errors.contact_phone ? 'input-error' : ''}`}
                      placeholder="9876543210"
                    />
                    {errors.contact_phone && <span className="field-error">{errors.contact_phone.message}</span>}
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="reason">Reason for Dispute</label>
                  <textarea
                    id="reason"
                    {...register('reason')}
                    className={`textarea ${errors.reason ? 'input-error' : ''}`}
                    placeholder="Provide details on why this challan is incorrect (e.g., wrong vehicle number, legal parking zone, etc.)"
                    rows={5}
                    style={{ minHeight: 120 }}
                  />
                  {errors.reason && <span className="field-error">{errors.reason.message}</span>}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep('find')} disabled={loading} style={{ flex: 1, height: 44 }}>
                    Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, height: 44 }}>
                    {loading ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--status-approved-bg)', color: 'var(--status-approved)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h1 className="h2" style={{ marginBottom: 12 }}>Dispute Received</h1>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, marginBottom: 32 }}>
                Your dispute for challan <strong>{challanId}</strong> has been submitted successfully. 
                A verification officer will review your claim within 3–5 business days. 
                You will be notified via email of the outcome.
              </p>
              <Link href="/" className="btn btn-primary" style={{ width: '100%', height: 44 }}>
                Return Home
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '24px var(--pad-x)', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Civic Park — Official Dispute Resolution Portal
        </p>
      </footer>
    </div>
  )
}

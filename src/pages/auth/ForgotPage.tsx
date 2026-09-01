import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { AuthShell } from '../../components/AuthShell'

export default function ForgotPage() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('That email address doesn’t look right.')
      return
    }
    setError(null)
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSent(true)
    }, 600)
  }

  return (
    <AuthShell
      title={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={sent ? `We sent a recovery link to ${email}.` : 'We will email you a secure link to reset your password.'}
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <div>
                <div className="font-semibold text-ink-900">Email sent</div>
                <p className="mt-0.5 text-xs">
                  Didn’t get the email? Check spam or try again in a minute.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
            className="btn-secondary w-full"
          >
            Use a different email
          </button>
          <Link to="/login" className="btn-primary w-full">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="label" htmlFor="re">Email</label>
            <input
              id="re"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              autoComplete="email"
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </button>
          <p className="text-center text-sm text-ink-500">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-ink-900 hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}

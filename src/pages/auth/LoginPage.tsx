import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthShell } from '../../components/AuthShell'
import { setAuth } from '../../store'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('demo@ezsale.app')
  const [password, setPassword] = useState('demo1234')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('That email address doesn’t look right.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }
    if (password.length < 4) {
      setError('Password is too short.')
      return
    }
    setSubmitting(true)
    // Simulate the auth round-trip so the loading state is visible.
    setTimeout(() => {
      setAuth(trimmedEmail)
      const onboarded = localStorage.getItem('ezsale:onboarded')
      navigate(onboarded ? '/app/pos' : '/setup')
    }, 350)
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your EzSale workspace.">
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
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            autoComplete="email"
            required
            aria-invalid={!!error && !email}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot" className="text-xs font-medium text-ink-600 hover:text-ink-900">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              className="input pr-20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? (
                <span className="inline-flex items-center gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> Hide
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Show
                </span>
              )}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          Remember me on this device
        </label>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>

        <p className="text-center text-sm text-ink-500">
          New to EzSale?{' '}
          <Link to="/signup" className="font-semibold text-ink-900 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { AuthShell } from '../../components/AuthShell'
import { setAuth } from '../../store'

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    if (!name.trim()) return 'Please enter your name.'
    if (name.trim().length < 2) return 'Name should be at least 2 characters.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email.'
    if (!password) return 'Please choose a password.'
    if (password.length < 8) return 'Password should be at least 8 characters.'
    if (!agree) return 'Please accept the Terms to continue.'
    return null
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    const issue = validate()
    if (issue) {
      setError(issue)
      return
    }
    setError(null)
    setSubmitting(true)
    setTimeout(() => {
      setAuth(email.trim())
      navigate('/setup')
    }, 350)
  }

  return (
    <AuthShell title="Create your account" subtitle="Start your free EzSale workspace — no credit card required.">
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
          <label className="label" htmlFor="name">Full name</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Jane Cooper"
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label" htmlFor="email2">Work email</label>
          <input
            id="email2"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@business.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
          />
          {password && password.length < 8 && (
            <p className="mt-1 text-[11px] text-amber-700">
              Password should be at least 8 characters.
            </p>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>
            I agree to the{' '}
            <a className="font-semibold text-ink-900 hover:underline" href="#">Terms</a> and{' '}
            <a className="font-semibold text-ink-900 hover:underline" href="#">Privacy Policy</a>.
          </span>
        </label>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating your workspace…
            </>
          ) : (
            'Create account'
          )}
        </button>

        <p className="text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink-900 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  )
}

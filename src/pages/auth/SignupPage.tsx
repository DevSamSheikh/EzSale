import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/AuthShell'
import { setAuth } from '../../store'

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agree, setAgree] = useState(true)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setAuth(email)
    navigate('/setup')
  }

  return (
    <AuthShell title="Create your account" subtitle="Start your free EzSale workspace — no credit card required.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Cooper" />
        </div>
        <div>
          <label className="label" htmlFor="email2">Work email</label>
          <input id="email2" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@business.com" />
        </div>
        <div>
          <label className="label" htmlFor="pw">Password</label>
          <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters" />
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

        <button type="submit" className="btn-primary w-full" disabled={!agree}>Create account</button>

        <p className="text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-ink-900 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  )
}

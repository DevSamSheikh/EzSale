import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/AuthShell'
import { setAuth } from '../../store'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('demo@ezsale.app')
  const [password, setPassword] = useState('demo1234')
  const [show, setShow] = useState(false)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setAuth(email)
    const onboarded = localStorage.getItem('ezsale:onboarded')
    navigate(onboarded ? '/app/pos' : '/setup')
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your EzSale workspace.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            required
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
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input type="checkbox" className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500" defaultChecked />
          Remember me on this device
        </label>

        <button type="submit" className="btn-primary w-full">Sign in</button>

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

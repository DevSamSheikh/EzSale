import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/AuthShell'

export default function ForgotPage() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <AuthShell
      title={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={sent ? `We sent a recovery link to ${email}.` : 'We will email you a secure link to reset your password.'}
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-800">
            Didn’t get the email? Check spam or try again in a minute.
          </div>
          <Link to="/login" className="btn-secondary w-full">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="re">Email</label>
            <input id="re" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
          </div>
          <button type="submit" className="btn-primary w-full">Send reset link</button>
          <p className="text-center text-sm text-ink-500">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-ink-900 hover:underline">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}

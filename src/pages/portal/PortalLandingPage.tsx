import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Nfc,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { PortalShell } from './PortalShell'
import { getMemberByIdentifier, verifyMemberPassword } from '../../card-store'
import { getBusiness } from '../../store'
import { playCue } from '../../audio'

type Step = 'card' | 'password'

export default function PortalLandingPage() {
  const navigate = useNavigate()
  const business = getBusiness()
  const termMember = business?.terminology.member ?? 'member'

  const [step, setStep] = useState<Step>('card')
  const [candidate, setCandidate] = useState<{ id: string; name: string; hint: string } | null>(null)
  const [tapping, setTapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  function reset() {
    setStep('card')
    setCandidate(null)
    setError(null)
    setPassword('')
    setShow(false)
  }

  function identifyByCard(uid: string) {
    setError(null)
    if (typeof window === 'undefined') return
    let card: { memberId: string | null; nfcUid?: string } | undefined
    try {
      const cards = JSON.parse(localStorage.getItem('ezsale:cards') ?? '[]') as {
        nfcUid?: string
        memberId: string | null
      }[]
      card = cards.find((c) => (c.nfcUid ?? '').toLowerCase() === uid.toLowerCase())
    } catch {
      card = undefined
    }
    if (!card || !card.memberId) {
      setError(`Card ${uid} isn't linked to an account yet. Please ask staff to enroll it.`)
      return null
    }
    const member = getMemberByIdentifier(card.memberId)
    if (!member) {
      setError('No account is connected to this card.')
      return null
    }
    if (member.status === 'suspended') {
      setError('This account is suspended. Please contact support.')
      return null
    }
    return member
  }

  function simulateNfcRead() {
    if (tapping) return
    setTapping(true)
    setError(null)
    setTimeout(() => {
      const uids = [
        '04:A3:BC:11:80:5F:90',
        '04:7C:1A:2D:33:9E:01',
        '04:11:22:33:44:55:66',
        '04:AA:BB:CC:DD:EE:FF',
        '04:9F:8E:7D:6C:5B:4A',
        '04:12:34:56:78:9A:BC',
        '04:FE:DC:BA:98:76:54',
      ]
      const uid = uids[Math.floor(Math.random() * uids.length)]
      const member = identifyByCard(uid)
      setTapping(false)
      if (member) {
        setCandidate({
          id: member.id,
          name: member.name,
          hint: member.email ?? member.phone ?? member.slug ?? member.id,
        })
        setStep('password')
        playCue('success')
      }
    }, 900)
  }

  function goBack() {
    reset()
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!candidate) return
    setError(null)
    const res = verifyMemberPassword(candidate.id, password)
    if (!res.ok) {
      if (res.reason === 'wrong_password') {
        setError('Wrong password. Please try again.')
      } else if (res.reason === 'suspended') {
        setError('This account is suspended. Please contact support.')
        return
      } else {
        setError('We could not verify your account. Please try again.')
        return
      }
      return
    }
    playCue('success')
    navigate(`/u/${res.member.slug}`)
  }

  useEffect(() => {
    if (!tapping) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setTapping(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tapping])

  return (
    <PortalShell>
      <Stepper step={step} />

      {step === 'card' && (
        <CardStep
          tapping={tapping}
          onTap={simulateNfcRead}
          error={error}
        />
      )}

      {step === 'password' && candidate && (
        <PasswordStep
          candidate={candidate}
          password={password}
          setPassword={setPassword}
          show={show}
          setShow={setShow}
          onSubmit={submitPassword}
          onBack={goBack}
          error={error}
        />
      )}

      <FeatureGrid termMember={termMember} />
    </PortalShell>
  )
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold">
      <Step n={1} label="Find your card" active={step === 'card'} done={step === 'password'} />
      <span className="h-px w-4 bg-ink-200" />
      <Step n={2} label="Enter password" active={step === 'password'} done={false} />
    </div>
  )
}

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-pill bg-ink-900 px-2.5 py-1 text-white'
          : done
          ? 'inline-flex items-center gap-1.5 rounded-pill bg-emerald-50 px-2.5 py-1 text-emerald-700'
          : 'inline-flex items-center gap-1.5 rounded-pill bg-ink-100 px-2.5 py-1 text-ink-500'
      }
    >
      <span
        className={
          active
            ? 'grid h-4 w-4 place-items-center rounded-full bg-white/20 text-[10px] font-bold'
            : done
            ? 'grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white'
            : 'grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-bold text-ink-500'
        }
      >
        {done ? '✓' : n}
      </span>
      {label}
    </span>
  )
}

function CardStep({
  tapping,
  onTap,
  error,
}: {
  tapping: boolean
  onTap: () => void
  error: string | null
}) {
  return (
    <>
      <section className="text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 text-brand-400 shadow-pop">
          <Nfc className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Find your card
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Hold your NFC card against the back of your phone. We'll sign you in once it's
          detected.
        </p>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
        <button
          onClick={onTap}
          disabled={tapping}
          className="relative flex w-full items-center gap-4 bg-gradient-to-br from-ink-900 to-ink-700 p-5 text-left text-white disabled:opacity-90"
        >
          <div
            className={
              tapping
                ? 'grid h-14 w-14 shrink-0 animate-pulse place-items-center rounded-xl bg-white/15 text-brand-400'
                : 'grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/15 text-brand-400'
            }
          >
            <Nfc className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">
              {tapping ? 'Reading your card…' : 'Tap to detect'}
            </div>
            <div className="mt-0.5 text-xs text-white/70">
              {tapping
                ? 'Hold it steady on the back of your phone.'
                : `Simulated tap — reads one of the demo cards.`}
            </div>
          </div>
          {tapping ? (
            <span className="rounded-pill bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Reading
            </span>
          ) : (
            <ArrowRight className="h-4 w-4 text-white/60" />
          )}
        </button>
        {error && (
          <div className="border-t border-ink-100 px-4 py-3 text-[11px] text-rose-700">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-ink-100 px-4 py-3 text-[11px] text-ink-500">
          <ShieldCheck className="h-3.5 w-3.5 text-ink-400" />
          We never store your card number — only the encrypted UID.
        </div>
      </section>
    </>
  )
}

function PasswordStep({
  candidate,
  password,
  setPassword,
  show,
  setShow,
  onSubmit,
  onBack,
  error,
}: {
  candidate: { id: string; name: string; hint: string }
  password: string
  setPassword: (s: string) => void
  show: boolean
  setShow: (v: boolean) => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
  error: string | null
}) {
  return (
    <>
      <section className="text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-800 shadow-soft">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Welcome, {candidate.name.split(' ')[0]}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Enter your portal password to continue. Default password is{' '}
          <span className="font-mono font-semibold text-ink-700">1234</span> for demo
          accounts.
        </p>
      </section>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-500">
            <KeyRound className="h-3.5 w-3.5" /> Account
          </div>
          <div className="text-sm font-semibold text-ink-900">{candidate.name}</div>
          <div className="truncate text-[11px] text-ink-500">{candidate.hint}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
          <label className="label" htmlFor="portal-pw">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="portal-pw"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your portal password"
              className="input pl-9 pr-10"
              autoFocus
              autoComplete="current-password"
              inputMode="text"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink-100"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary mt-3 w-full py-3">
            <ArrowRight className="h-4 w-4" /> Open my portal
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
        >
          Use a different card
        </button>
      </form>
    </>
  )
}

function FeatureGrid({ termMember }: { termMember: string }) {
  const items = useMemo(
    () => [
      {
        Icon: Wallet,
        title: 'Live balance',
        desc: 'See your reloadable balance and limits at a glance.',
        tone: 'bg-brand-50 text-brand-800',
      },
      {
        Icon: Sparkles,
        title: 'Top-up requests',
        desc: 'Ask staff to top up your card — no cashier line.',
        tone: 'bg-emerald-50 text-emerald-700',
      },
      {
        Icon: ShieldCheck,
        title: 'No login',
        desc: `Your card and password sign you in — no app required.`,
        tone: 'bg-indigo-50 text-indigo-700',
      },
    ],
    [],
  )
  return (
    <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => {
        const Icon = it.Icon
        return (
          <div
            key={it.title}
            className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft"
          >
            <div
              className={`grid h-8 w-8 place-items-center rounded-lg ${it.tone}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="mt-2 text-sm font-bold text-ink-900">{it.title}</div>
            <div className="mt-0.5 text-[11px] text-ink-500">{it.desc}</div>
          </div>
        )
      })}
    </section>
  )
}

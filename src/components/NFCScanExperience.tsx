import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeftRight,
  BatteryWarning,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Keyboard,
  Loader2,
  Lock,
  Nfc as NfcIcon,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Volume2,
  X,
} from 'lucide-react'
import {
  formatCardNumber,
  getCardByNumber,
  getCards,
  getMembers,
  isCardUsable,
} from '../payment-store'
import { memberStatusLabel } from '../card-store'
import { playCue } from '../audio'
import { getBusiness } from '../store'
import type {
  MembershipCard,
  MembershipCardStatus,
  Member,
} from '../types'

export type ScanOutcome =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'loading' }
  | { kind: 'success'; card: MembershipCard; member: Member | null }
  | { kind: 'error'; code: ScanErrorCode; message: string; detail?: string }

export type ScanErrorCode =
  | 'unknown_card'
  | 'unassigned'
  | 'blocked'
  | 'expired'
  | 'inactive'
  | 'lost'
  | 'replaced'
  | 'insufficient'
  | 'cross_location_blocked'
  | 'empty_input'
  | 'reader_error'

function money(n: number) {
  return `$${n.toFixed(2)}`
}

function statusPillClass(s: MembershipCardStatus) {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'inactive':
      return 'bg-ink-100 text-ink-700 border-ink-200'
    case 'blocked':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'expired':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'lost':
      return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'replaced':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
}

function statusLabel(s: MembershipCardStatus) {
  switch (s) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'blocked':
      return 'Blocked'
    case 'expired':
      return 'Expired'
    case 'lost':
      return 'Lost'
    case 'replaced':
      return 'Replaced'
  }
}

function tierBadgeClass(tier: string) {
  const t = tier.toLowerCase()
  if (t.includes('gold') || t.includes('plat'))
    return 'bg-amber-50 text-amber-800 border-amber-200'
  if (t.includes('silver') || t.includes('plus'))
    return 'bg-sky-50 text-sky-700 border-sky-200'
  return 'bg-ink-100 text-ink-700 border-ink-200'
}

export interface NFCScanExperienceProps {
  total: number
  /** Resolved with the chosen card/member when the operator confirms. */
  onConfirm: (payload: { card: MembershipCard; member: Member | null }) => void
  /** Optional cancel to return to method picker. */
  onCancel?: () => void
  /** Label shown at the top of the screen (e.g. "Pay with membership card"). */
  heading?: string
}

interface SearchHit {
  card: MembershipCard
  member: Member | null
  reason: string
}

/**
 * Big, touch-friendly NFC scan flow for the POS payment screen.
 *
 * States: idle → scanning → loading → success | error
 * Error codes drive copy + visuals (blocked, expired, insufficient, …).
 */
export function NFCScanExperience({
  total,
  onConfirm,
  onCancel,
  heading = 'Tap membership card',
}: NFCScanExperienceProps) {
  const business = getBusiness()
  const nfc = business?.nfc
  const [outcome, setOutcome] = useState<ScanOutcome>({ kind: 'idle' })
  const [manualOpen, setManualOpen] = useState(false)
  const [manualQuery, setManualQuery] = useState('')
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const scanTimerRef = useRef<number | null>(null)

  // Reset confirmation whenever we move to a new card.
  useEffect(() => {
    if (outcome.kind !== 'success') setConfirmStep(0)
  }, [outcome.kind, outcome.kind === 'success' ? outcome.card.id : null])

  // Cleanup any pending fake-reader timer on unmount.
  useEffect(
    () => () => {
      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current)
        scanTimerRef.current = null
      }
    },
    [],
  )

  function runLookup(input: string) {
    const formatted = formatCardNumber(input)
    if (!formatted) {
      setOutcome({
        kind: 'error',
        code: 'empty_input',
        message: 'No card number received',
        detail: 'The reader did not return a card number. Try again or enter it manually.',
      })
      playCue('error')
      return
    }
    const result = getCardByNumber(formatted)
    if (!result) {
      setOutcome({
        kind: 'error',
        code: 'unknown_card',
        message: 'Unknown card',
        detail: `No membership card is registered for ${formatted}. Ask the customer to check the card, or search by name.`,
      })
      playCue('error')
      return
    }
    evaluate(result.card, result.member)
  }

  function evaluate(card: MembershipCard, member: Member | null) {
    if (!member) {
      setOutcome({
        kind: 'error',
        code: 'unassigned',
        message: 'Card is not assigned to a member',
        detail: `Card ${card.cardNumber} has no linked member. Issue a new card or link the existing one to a member.`,
      })
      playCue('error')
      return
    }
    const usable = isCardUsable(card)
    if (!usable.ok) {
      const code: ScanErrorCode =
        card.status === 'blocked'
          ? 'blocked'
          : card.status === 'expired' ||
            new Date(card.expiresAt).getTime() < Date.now()
          ? 'expired'
          : card.status === 'inactive'
          ? 'inactive'
          : card.status === 'lost'
          ? 'lost'
          : card.status === 'replaced'
          ? 'replaced'
          : 'reader_error'
      setOutcome({
        kind: 'error',
        code,
        message: errorTitle(code),
        detail: usable.reason ?? 'This card cannot be used for payment.',
      })
      playCue('error')
      return
    }
    if (card.balance < total) {
      setOutcome({
        kind: 'error',
        code: 'insufficient',
        message: 'Insufficient balance',
        detail: `Available ${money(card.balance)} · Order total ${money(total)}. Ask the customer to top up or choose another payment method.`,
      })
      playCue('error')
      return
    }
    setOutcome({ kind: 'success', card, member })
    if (nfc?.tapSound !== false) playCue('success')
  }

  function beginScan() {
    if (outcome.kind === 'scanning' || outcome.kind === 'loading') return
    setOutcome({ kind: 'scanning' })
    if (nfc?.tapSound !== false) playCue('tap')
    // Simulate a hardware tap: most readers resolve in 200–800ms.
    const delay = 600 + Math.floor(Math.random() * 400)
    scanTimerRef.current = window.setTimeout(() => {
      // Simulate the reader producing a UID → resolved to a card number
      // via the NFC UID prefix mapping. We pick a random active card here.
      scanTimerRef.current = window.setTimeout(() => {
        setOutcome({ kind: 'loading' })
        scanTimerRef.current = window.setTimeout(() => {
          // Try a random active NFC card so the demo shows real data.
          const candidates = getCards().filter(
            (c) => c.status === 'active' && c.nfcUid,
          )
          const pool = candidates.length ? candidates : getCards().filter((c) => c.status === 'active')
          if (pool.length === 0) {
            setOutcome({
              kind: 'error',
              code: 'reader_error',
              message: 'No active card on file',
              detail: 'The reader picked up a tap but no active card is registered in this business. Issue a card from the Cards screen.',
            })
            playCue('error')
            return
          }
          const pick = pool[Math.floor(Math.random() * pool.length)]
          runLookup(pick.cardNumber)
        }, 450)
      }, delay)
    }, 350)
  }

  function cancelScan() {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
    setOutcome({ kind: 'idle' })
  }

  function reset() {
    cancelScan()
    setOutcome({ kind: 'idle' })
    setManualQuery('')
    setMemberFilter(null)
    setConfirmStep(0)
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-ink-900">{heading}</div>
          <p className="mt-0.5 text-xs text-ink-500">
            Ask the customer to hold their card flat against the reader.
            The screen will turn green when a valid card is detected.
          </p>
        </div>
        <div className="hidden text-right text-[11px] text-ink-500 sm:block">
          <div className="font-semibold text-ink-700">{business?.nfc?.readerProtocol?.toUpperCase() ?? 'NFC'}</div>
          <div>Order · {money(total)}</div>
        </div>
      </div>

      <div className="mt-4">
        {outcome.kind === 'idle' && <IdlePanel onScan={beginScan} onManual={() => setManualOpen(true)} />}
        {outcome.kind === 'scanning' && (
          <ScanningPanel onCancel={cancelScan} onManual={() => setManualOpen(true)} />
        )}
        {outcome.kind === 'loading' && <LoadingPanel />}
        {outcome.kind === 'success' && (
          <SuccessPanel
            card={outcome.card}
            member={outcome.member}
            total={total}
            step={confirmStep}
            onBack={reset}
            onContinue={() => setConfirmStep(1)}
            onConfirm={() => onConfirm({ card: outcome.card, member: outcome.member })}
            onCancelStep={() => setConfirmStep(0)}
          />
        )}
        {outcome.kind === 'error' && (
          <ErrorPanel
            code={outcome.code}
            message={outcome.message}
            detail={outcome.detail ?? ''}
            onRetry={reset}
            onManual={() => setManualOpen(true)}
          />
        )}
      </div>

      {manualOpen && (
        <ManualEntryPanel
          total={total}
          query={manualQuery}
          onQueryChange={setManualQuery}
          memberFilter={memberFilter}
          onMemberFilterChange={setMemberFilter}
          onClose={() => setManualOpen(false)}
          onPick={(card, member) => {
            setManualOpen(false)
            evaluate(card, member)
          }}
        />
      )}

      {outcome.kind === 'idle' && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-500">
          <div className="flex items-center gap-1.5">
            {nfc?.tapSound !== false ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <BatteryWarning className="h-3.5 w-3.5" />
            )}
            <span>
              {nfc?.tapSound !== false
                ? 'Reader sound on'
                : 'Reader sound muted'}{' '}
              · auto-charge {nfc?.autoChargeOnSale ? 'on' : 'off'}
            </span>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 font-semibold text-ink-700 hover:text-ink-900"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Switch payment method
            </button>
          )}
        </div>
      )}

      {outcome.kind === 'success' && confirmStep === 0 && (
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-semibold text-ink-700 hover:text-ink-900"
          >
            Switch payment method
          </button>
        </div>
      )}
    </div>
  )
}

// ---- State panels -------------------------------------------------------

function IdlePanel({ onScan, onManual }: { onScan: () => void; onManual: () => void }) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onScan}
        className="group flex w-full flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50/40 px-6 py-10 text-center transition-colors hover:border-brand-500 hover:bg-brand-50 active:scale-[0.99]"
      >
        <span className="relative grid h-24 w-24 place-items-center rounded-full bg-brand-500 text-ink-900 shadow-soft">
          <NfcIcon className="h-12 w-12" strokeWidth={1.8} />
          <span className="pointer-events-none absolute -inset-2 rounded-full border border-brand-500/30" />
          <span className="pointer-events-none absolute -inset-4 rounded-full border border-brand-500/15" />
        </span>
        <div>
          <div className="text-base font-bold text-ink-900">Tap to start NFC reader</div>
          <div className="mt-0.5 text-xs text-ink-600">
            Hold the card steady on the reader until you hear the confirmation tone.
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">
          <Sparkles className="h-3.5 w-3.5" /> Start scan
        </span>
      </button>
      <div className="flex items-center justify-center gap-2 text-[11px] text-ink-500">
        <span>Reader not working?</span>
        <button
          type="button"
          onClick={onManual}
          className="inline-flex items-center gap-1 font-semibold text-ink-700 hover:text-ink-900"
        >
          <Keyboard className="h-3.5 w-3.5" /> Enter card manually
        </button>
      </div>
    </div>
  )
}

function ScanningPanel({ onCancel, onManual }: { onCancel: () => void; onManual: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-brand-500 bg-gradient-to-br from-brand-50 to-white px-6 py-10 text-center">
      <span className="pointer-events-none absolute inset-0">
        <span className="absolute -inset-1 animate-pulse-ring rounded-full border-2 border-brand-500/40" />
        <span className="scan-ripple absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500/60" />
        <span className="scan-ripple-2 absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-500/40" />
      </span>
      <div className="relative flex flex-col items-center gap-3">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-500 text-ink-900 shadow-pop">
          <NfcIcon className="h-12 w-12 animate-pulse" strokeWidth={1.8} />
        </span>
        <div>
          <div className="text-base font-bold text-ink-900">Waiting for tap…</div>
          <div className="mt-0.5 text-xs text-ink-600">
            Hold the card against the reader. We&apos;ll detect it automatically.
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading card…
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onManual}
            className="inline-flex items-center gap-1 rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            <Keyboard className="h-3.5 w-3.5" /> Enter manually
          </button>
        </div>
      </div>
      <style>{`
        @keyframes scanRipple {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        .scan-ripple { animation: scanRipple 1.6s ease-out infinite; }
        .scan-ripple-2 { animation: scanRipple 1.6s ease-out infinite; animation-delay: 0.55s; }
        @keyframes pulseRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.04); opacity: 0; }
        }
        .animate-pulse-ring { animation: pulseRing 1.4s ease-out infinite; }
      `}</style>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="rounded-3xl border-2 border-brand-200 bg-brand-50/40 px-6 py-10 text-center">
      <span className="relative mx-auto grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
        <CreditCard className="h-7 w-7 text-brand-700" />
      </span>
      <div className="mt-3 text-sm font-bold text-ink-900">Card detected</div>
      <div className="mt-0.5 text-xs text-ink-600">Looking up the member…</div>
    </div>
  )
}

function ErrorPanel({
  code,
  message,
  detail,
  onRetry,
  onManual,
}: {
  code: ScanErrorCode
  message: string
  detail: string
  onRetry: () => void
  onManual: () => void
}) {
  const Icon = errorIcon(code)
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border-2 border-rose-300 bg-rose-50 px-6 py-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-500 text-white shadow-pop">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold text-rose-800">{message}</div>
            <p className="mt-1 text-xs text-rose-700">{detail}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-soft hover:bg-rose-700"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <button
            type="button"
            onClick={onManual}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-pill border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50"
          >
            <Keyboard className="h-4 w-4" /> Enter manually
          </button>
        </div>
      </div>
    </div>
  )
}

function SuccessPanel({
  card,
  member,
  total,
  step,
  onBack,
  onContinue,
  onConfirm,
  onCancelStep,
}: {
  card: MembershipCard
  member: Member | null
  total: number
  step: 0 | 1 | 2
  onBack: () => void
  onContinue: () => void
  onConfirm: () => void
  onCancelStep: () => void
}) {
  const usable = isCardUsable(card)
  const afterBalance = Math.max(0, card.balance - total)
  return (
    <div className="space-y-3">
      <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-pop">
              <Check className="h-6 w-6" />
            </span>
            <div>
              <div className="text-base font-bold text-ink-900">
                {member?.name ?? 'Member'}
              </div>
              <div className="text-[11px] text-ink-500">
                {member?.email || member?.phone || '—'}
              </div>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-semibold ${statusPillClass(card.status)}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel(card.status)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DataTile label="Card" value={card.cardNumber} mono />
          <DataTile
            label="Tier"
            value={
              <span
                className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[11px] font-bold ${tierBadgeClass(card.tier)}`}
              >
                {card.tier}
              </span>
            }
          />
          <DataTile
            label="Available"
            value={money(card.balance)}
            tone="brand"
            big
          />
          <DataTile
            label="Status"
            value={member ? memberStatusLabel(member.status) : '—'}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-500">Charge</div>
              <div className="mt-0.5 text-base font-bold text-ink-900">{money(total)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-500">Before</div>
              <div className="mt-0.5 text-base font-bold text-ink-900">{money(card.balance)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-500">After</div>
              <div className="mt-0.5 text-base font-bold text-emerald-700">
                {money(afterBalance)}
              </div>
            </div>
          </div>
        </div>

        {step === 0 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-500">
              Review the details, then continue to confirm the charge.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                Wrong card
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center gap-2 rounded-pill bg-ink-900 px-4 py-3 text-sm font-bold text-white hover:bg-ink-800"
              >
                <ChevronRight className="h-4 w-4" /> Review &amp; charge
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-500">
              Confirming charge of {money(total)} from {card.cardNumber}.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancelStep}
                className="rounded-pill border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex items-center gap-2 rounded-pill bg-emerald-600 px-5 py-3 text-base font-extrabold text-white shadow-soft hover:bg-emerald-700"
              >
                <ShieldCheck className="h-4 w-4" /> Yes, charge {money(total)}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-pill bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" /> Charge submitted
          </div>
        )}

        {!usable.ok && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Card usable in read-only mode</div>
              <div className="text-xs">{usable.reason}</div>
            </div>
          </div>
        )}
      </div>

      {step < 2 && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500 hover:text-ink-700"
        >
          ← Scan a different card
        </button>
      )}
    </div>
  )
}

function DataTile({
  label,
  value,
  mono,
  tone,
  big,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  tone?: 'brand'
  big?: boolean
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div
        className={`mt-0.5 ${
          big ? 'text-2xl' : 'text-base'
        } font-extrabold ${
          tone === 'brand' ? 'text-brand-700' : 'text-ink-900'
        } ${mono ? 'font-mono tracking-wide' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function ManualEntryPanel({
  total,
  query,
  onQueryChange,
  memberFilter,
  onMemberFilterChange,
  onClose,
  onPick,
}: {
  total: number
  query: string
  onQueryChange: (v: string) => void
  memberFilter: string | null
  onMemberFilterChange: (v: string | null) => void
  onClose: () => void
  onPick: (card: MembershipCard, member: Member | null) => void
}) {
  const [tab, setTab] = useState<'card' | 'member'>('card')
  const inputRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [tab])

  const cards = getCards()
  const members = getMembers()
  const cardHits: SearchHit[] = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return cards
      .filter((c) => {
        if (
          c.cardNumber.toLowerCase().includes(q) ||
          (c.nfcUid ?? '').toLowerCase().includes(q) ||
          c.tier.toLowerCase().includes(q)
        ) {
          return true
        }
        return false
      })
      .slice(0, 12)
      .map((card) => {
        const member = card.memberId
          ? members.find((m) => m.id === card.memberId) ?? null
          : null
        return {
          card,
          member,
          reason: !member
            ? 'Card has no member assigned.'
            : isCardUsable(card).ok
            ? 'Ready to charge'
            : isCardUsable(card).reason ?? 'Card unavailable',
        }
      })
  }, [cards, members, query])

  const memberHits: SearchHit[] = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return cards
      .filter((c) => {
        if (memberFilter && c.memberId !== memberFilter) return false
        if (!c.memberId) return false
        const m = members.find((mm) => mm.id === c.memberId)
        if (!m) return false
        return (
          m.name.toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q) ||
          (m.phone ?? '').toLowerCase().includes(q) ||
          c.cardNumber.toLowerCase().includes(q)
        )
      })
      .slice(0, 12)
      .map((card) => {
        const member = members.find((m) => m.id === card.memberId) ?? null
        const usable = isCardUsable(card)
        return {
          card,
          member,
          reason: !usable.ok
            ? usable.reason ?? 'Card unavailable'
            : card.balance < total
            ? `Insufficient balance (${money(card.balance)})`
            : 'Ready to charge',
        }
      })
  }, [cards, members, memberFilter, query, total])

  const hits = tab === 'card' ? cardHits : memberHits
  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.name })),
    [members],
  )

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-stretch justify-center sm:items-center sm:p-4">
        <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl">
          <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
            <div>
              <div className="text-base font-bold text-ink-900">Find a card</div>
              <p className="mt-0.5 text-[11px] text-ink-500">
                Type the card number, NFC UID, member name, email or phone.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-ink-100 px-5">
            <div
              role="tablist"
              className="inline-flex h-10 items-center rounded-full border border-ink-200 bg-white p-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'card'}
                onClick={() => setTab('card')}
                className={
                  tab === 'card'
                    ? 'inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3 text-xs font-semibold text-white'
                    : 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                }
              >
                <CreditCard className="h-3.5 w-3.5" /> By card
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'member'}
                onClick={() => setTab('member')}
                className={
                  tab === 'member'
                    ? 'inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3 text-xs font-semibold text-white'
                    : 'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-700 hover:bg-ink-50'
                }
              >
                <UserIcon className="h-3.5 w-3.5" /> By member
              </button>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => onQueryChange(formatCardNumber(e.target.value))}
                placeholder={
                  tab === 'card' ? 'EZ-1000-0000 or NFC UID' : 'Member name, email, phone'
                }
                className={`input pl-9 ${tab === 'card' ? 'font-mono tracking-wide' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && hits[0]) {
                    onPick(hits[0].card, hits[0].member)
                  }
                }}
              />
            </div>
            {tab === 'member' && (
              <select
                className="input"
                value={memberFilter ?? ''}
                onChange={(e) => onMemberFilterChange(e.target.value || null)}
              >
                <option value="">All members</option>
                {memberOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="max-h-[40vh] flex-1 overflow-y-auto border-t border-ink-100">
            {query.trim() === '' ? (
              <div className="px-5 py-8 text-center text-xs text-ink-500">
                Start typing to see matches.
              </div>
            ) : hits.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-ink-500">
                No matches. Try a different search.
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {hits.map((hit) => {
                  const ok = isCardUsable(hit.card).ok && hit.card.balance >= total
                  return (
                    <li key={hit.card.id}>
                      <button
                        type="button"
                        onClick={() => onPick(hit.card, hit.member)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-ink-50"
                      >
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                            ok
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-ink-100 text-ink-700'
                          }`}
                        >
                          {tab === 'card' ? (
                            <CreditCard className="h-4 w-4" />
                          ) : (
                            <UserIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-ink-900">
                            {hit.member?.name ?? 'Unassigned member'}
                          </div>
                          <div className="truncate font-mono text-[11px] text-ink-500">
                            {hit.card.cardNumber} · {hit.card.tier}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-sm font-bold ${
                              ok ? 'text-emerald-700' : 'text-ink-700'
                            }`}
                          >
                            {money(hit.card.balance)}
                          </div>
                          <div
                            className={`text-[10px] font-semibold ${
                              ok ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {hit.reason}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function errorIcon(code: ScanErrorCode) {
  switch (code) {
    case 'blocked':
    case 'lost':
      return ShieldAlert
    case 'expired':
      return AlertTriangle
    case 'insufficient':
    case 'cross_location_blocked':
      return BatteryWarning
    case 'empty_input':
    case 'reader_error':
    case 'unknown_card':
    case 'unassigned':
    case 'inactive':
    case 'replaced':
    default:
      return ShieldAlert
  }
}

function errorTitle(code: ScanErrorCode) {
  switch (code) {
    case 'blocked':
      return 'Card is blocked'
    case 'expired':
      return 'Card has expired'
    case 'inactive':
      return 'Card is inactive'
    case 'lost':
      return 'Card reported lost'
    case 'replaced':
      return 'Card has been replaced'
    case 'unassigned':
      return 'Card has no member'
    case 'insufficient':
      return 'Insufficient balance'
    case 'cross_location_blocked':
      return 'Card not accepted at this location'
    case 'empty_input':
      return 'Reader did not return a card'
    case 'reader_error':
      return 'Reader error'
    case 'unknown_card':
    default:
      return 'Unknown card'
  }
}

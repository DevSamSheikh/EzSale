import { PageHeader } from '../../components/Primitives'
import { Plus, CreditCard, Wifi, Nfc } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Award, Crown, Star } from 'lucide-react'

const CARDS = [
  { holder: 'Sara Khan', tier: 'Gold', balance: 240.0, last: 'Today, 9:12', num: '4421' },
  { holder: 'Adil Raza', tier: 'Silver', balance: 60.5, last: 'Yesterday', num: '9012' },
  { holder: 'Mehak Ali', tier: 'Bronze', balance: 12.0, last: '3 days ago', num: '2244' },
  { holder: 'Hassan Tariq', tier: 'Gold', balance: 410.75, last: 'Today, 14:05', num: '7733' },
]

const TIER_ICON: Record<string, LucideIcon> = {
  Gold: Crown,
  Silver: Star,
  Bronze: Award,
}
const TIER_PILL: Record<string, string> = {
  Gold: 'bg-amber-100 text-amber-800',
  Silver: 'bg-ink-100 text-ink-700',
  Bronze: 'bg-orange-100 text-orange-800',
}

export default function CardsPage() {
  return (
    <div>
      <PageHeader
        title="NFC membership cards"
        subtitle="Issue, top up, and manage member cards."
        actions={
          <>
            <button className="btn-secondary"><Nfc className="h-4 w-4" /> Tap to enroll</button>
            <button className="btn-primary"><Plus className="h-4 w-4" /> New card</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((c) => {
          const Icon = TIER_ICON[c.tier] ?? CreditCard
          return (
            <div key={c.holder} className="card overflow-hidden p-0">
              <div className="relative h-28 bg-ink-900 p-4 text-white">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                    <Icon className="h-3 w-3" /> {c.tier}
                  </span>
                  <Wifi className="h-4 w-4 text-brand-400" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Card</div>
                    <div className="font-mono text-sm tracking-widest">•••• {c.num}</div>
                  </div>
                  <CreditCard className="h-7 w-7 text-white/80" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-ink-900">{c.holder}</div>
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_PILL[c.tier]}`}>
                    {c.tier}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-ink-500">Balance</div>
                  <div className="text-2xl font-bold text-ink-900">${c.balance.toFixed(2)}</div>
                </div>
                <div className="mt-1 text-xs text-ink-500">Last used {c.last}</div>
                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1 text-xs">Top up</button>
                  <button className="btn-ghost flex-1 text-xs">Details</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

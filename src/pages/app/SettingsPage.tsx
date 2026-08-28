import { useState } from 'react'
import { PageHeader } from '../../components/Primitives'
import { BUSINESS_TYPES, CURRENCIES, TIMEZONES, TERMINOLOGY_BY_TYPE, getBusiness, saveBusiness } from '../../store'
import type { Business } from '../../types'
import { Save, Volume2, VolumeX } from 'lucide-react'
import {
  getAudioSettings,
  playCue,
  setAudioEnabled,
  setAudioVolume,
} from '../../audio'

const TABS = ['General', 'Localization', 'Tax & receipts', 'POS', 'Billing'] as const

export default function SettingsPage() {
  const existing = getBusiness()
  const [tab, setTab] = useState<(typeof TABS)[number]>('General')
  const [b, setB] = useState<Business>(
    existing ?? {
      id: 'preview',
      name: 'Bistro Aurora',
      type: 'restaurant',
      currency: 'USD',
      timezone: 'UTC',
      taxRate: 5,
      taxInclusive: false,
      receiptHeader: 'Thanks for visiting!',
      receiptFooter: 'See you again soon!',
      contactEmail: 'hello@bistroaurora.com',
      contactPhone: '+1 555 0123',
      posMode: 'standard',
      address: '',
      categories: ['Mains', 'Drinks', 'Desserts'],
      paymentMethods: ['Cash', 'Card', 'NFC Card'],
      membership: { enabled: false, tiers: [] },
      terminology: TERMINOLOGY_BY_TYPE.restaurant,
    },
  )
  const [saved, setSaved] = useState(false)

  function save() {
    saveBusiness(b)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace, POS, and integrations."
        actions={
          <button onClick={save} className="btn-primary">
            <Save className="h-4 w-4" /> {saved ? 'Saved' : 'Save changes'}
          </button>
        }
      />

      <div className="card p-0">
        <div className="border-b border-ink-100 px-3 py-3">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={tab === t ? 'pill-active whitespace-nowrap' : 'pill whitespace-nowrap'}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {tab === 'General' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Business name</label>
                <input className="input" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Business type</label>
                <select className="input" value={b.type} onChange={(e) => setB({ ...b, type: e.target.value as Business['type'] })}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Contact email</label>
                <input className="input" value={b.contactEmail} onChange={(e) => setB({ ...b, contactEmail: e.target.value })} />
              </div>
              <div>
                <label className="label">Contact phone</label>
                <input className="input" value={b.contactPhone} onChange={(e) => setB({ ...b, contactPhone: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'Localization' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Currency</label>
                <select className="input" value={b.currency} onChange={(e) => setB({ ...b, currency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select className="input" value={b.timezone} onChange={(e) => setB({ ...b, timezone: e.target.value })}>
                  {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {tab === 'Tax & receipts' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Default tax rate (%)</label>
                <input type="number" className="input" value={b.taxRate} onChange={(e) => setB({ ...b, taxRate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Receipt header</label>
                <input className="input" value={b.receiptHeader} onChange={(e) => setB({ ...b, receiptHeader: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'POS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(['standard', 'restaurant', 'quick'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setB({ ...b, posMode: m })}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      b.posMode === m ? 'border-brand-500 bg-brand-50' : 'border-ink-200 bg-white hover:bg-ink-50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-ink-900 capitalize">{m}</div>
                    <div className="mt-1 text-xs text-ink-500">Configure your default POS layout.</div>
                  </button>
                ))}
              </div>

              <SoundsSettings />
            </div>
          )}

          {tab === 'Billing' && (
            <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5">
              <div className="text-sm font-semibold text-ink-900">Current plan</div>
              <div className="mt-1 text-xs text-ink-500">You’re on the Free trial — upgrade any time.</div>
              <button className="btn-primary mt-4">Upgrade plan</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SoundsSettings() {
  const initial = getAudioSettings()
  const [enabled, setEnabled] = useState(initial.enabled)
  const [volume, setVolume] = useState(initial.volume)

  function toggle(v: boolean) {
    setEnabled(v)
    setAudioEnabled(v)
    if (v) playCue('success')
  }

  function changeVolume(v: number) {
    setVolume(v)
    setAudioVolume(v)
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-ink-900">Sound effects</div>
          <p className="mt-1 max-w-md text-xs text-ink-500">
            Play short beeps when items are added, quantities change, or the cart is cleared.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-600">
            {enabled ? 'On' : 'Off'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => toggle(!enabled)}
            className={enabled ? 'switch-track-on' : 'switch-track'}
          >
            <span className={enabled ? 'switch-thumb-on' : 'switch-thumb'} />
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-ink-700">
            {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="font-semibold">Volume</span>
          </div>
          <span className="text-xs text-ink-500">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          disabled={!enabled}
          className="w-full accent-brand-500 disabled:opacity-50"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => playCue('success')}
          disabled={!enabled}
          className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
        >
          Test success
        </button>
        <button
          onClick={() => playCue('warning')}
          disabled={!enabled}
          className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
        >
          Test warning
        </button>
        <button
          onClick={() => playCue('danger')}
          disabled={!enabled}
          className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
        >
          Test danger
        </button>
        <button
          onClick={() => playCue('error')}
          disabled={!enabled}
          className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-40"
        >
          Test error
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/Primitives'
import { BUSINESS_TYPES, CURRENCIES, TIMEZONES, TERMINOLOGY_BY_TYPE, getBusiness, saveBusiness } from '../../store'
import type { Business, BusinessType, Terminology } from '../../types'
import { Check, Layers, Palette, RotateCcw, Save, Volume2, VolumeX } from 'lucide-react'
import { BusinessTypeIcon } from '../../icons'
import {
  getAudioSettings,
  playCue,
  setAudioEnabled,
  setAudioVolume,
} from '../../audio'
import {
  applyTheme,
  DEFAULT_THEME,
  getTheme,
  SECONDARY_PRESETS,
  setBoth,
  setPrimary,
  setSecondary,
  subscribeTheme,
  THEME_PRESETS,
  type Theme,
} from '../../theme'

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
            <div className="space-y-6">
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

              <TerminologySection
                terminology={b.terminology}
                businessType={b.type}
                onChange={(terminology) => setB({ ...b, terminology })}
              />

              <AppearanceSection />
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

// ---------------------------------------------------------------------------
// Appearance section
// ---------------------------------------------------------------------------

function AppearanceSection() {
  const [theme, setThemeState] = useState<Theme>(() => getTheme())

  useEffect(() => {
    return subscribeTheme((next) => setThemeState(next))
  }, [])

  function pickPrimary(hex: string) {
    setPrimary(hex)
  }

  function pickSecondary(hex: string) {
    setSecondary(hex)
  }

  function reset() {
    setBoth(DEFAULT_THEME.primary, DEFAULT_THEME.secondary)
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Palette className="h-4 w-4 text-ink-500" /> Appearance
          </div>
          <p className="mt-1 max-w-md text-xs text-ink-500">
            Pick an accent color and a neutral text color. Changes apply instantly across the entire app.
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
        >
          Reset to default
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Theme color
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {THEME_PRESETS.map((p) => {
              const active = p.primary.toLowerCase() === theme.primary.toLowerCase()
              return (
                <button
                  key={p.id}
                  onClick={() => pickPrimary(p.primary)}
                  className="group flex flex-col items-center gap-1.5"
                  title={p.name}
                  aria-label={p.name}
                  aria-pressed={active}
                >
                  <span
                    className={`relative grid h-9 w-9 place-items-center rounded-xl border transition-all ${
                      active
                        ? 'border-ink-900 ring-2 ring-ink-900/20'
                        : 'border-ink-200 hover:border-ink-400'
                    }`}
                    style={{ background: p.primary }}
                  >
                    {active && (
                      <Check
                        className="h-4 w-4"
                        style={{ color: isLight(p.primary) ? '#13171c' : '#ffffff' }}
                      />
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      active ? 'text-ink-900' : 'text-ink-500'
                    }`}
                  >
                    {p.primary}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-500">
            Pick a preset. The matching button label shows the hex value.
          </p>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Secondary color
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SECONDARY_PRESETS.map((s) => {
              const active = s.value.toLowerCase() === theme.secondary.toLowerCase()
              return (
                <button
                  key={s.id}
                  onClick={() => pickSecondary(s.value)}
                  className={`group relative grid h-9 w-9 place-items-center rounded-xl border transition-all ${
                    active
                      ? 'border-ink-900 ring-2 ring-ink-900/20'
                      : 'border-ink-200 hover:border-ink-400'
                  }`}
                  style={{ background: s.value }}
                  title={s.name}
                  aria-label={s.name}
                  aria-pressed={active}
                >
                  {active && (
                    <Check
                      className="h-4 w-4"
                      style={{ color: isLight(s.value) ? '#13171c' : '#ffffff' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-ink-500">
            Used for dark surfaces (footer, dark stat cards, headings).
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Live preview
        </div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg"
                style={{ background: theme.primary }}
              >
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ background: isLight(theme.primary) ? '#13171c' : '#ffffff' }}
                />
              </span>
              <div>
                <div className="text-sm font-bold text-ink-900">EzSale</div>
                <div className="text-[11px] text-ink-500">Brand square on neutral</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-4">
            <span
              className="inline-flex items-center rounded-pill px-3 py-1 text-[11px] font-bold"
              style={{ background: theme.primary, color: isLight(theme.primary) ? '#13171c' : '#ffffff' }}
            >
              Primary action
            </span>
            <div className="mt-2 text-xs text-ink-500">Active buttons, chips, links.</div>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ background: theme.secondary }}
          >
            <div className="text-xs" style={{ color: '#ffffff' }}>
              Dark surface
            </div>
            <div className="text-[11px]" style={{ color: '#b1b7c0' }}>
              Used for dark stat cards and footers.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function isLight(hex: string): boolean {
  const cleaned = hex.replace('#', '').trim()
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return true
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.6
}

// ---------------------------------------------------------------------------
// Business configuration: terminology
// ---------------------------------------------------------------------------

function TerminologySection({
  terminology,
  businessType,
  onChange,
}: {
  terminology: Terminology
  businessType: BusinessType
  onChange: (t: Terminology) => void
}) {
  const defaults = TERMINOLOGY_BY_TYPE[businessType]
  const dirty =
    terminology.product !== defaults.product ||
    terminology.productPlural !== defaults.productPlural ||
    terminology.member !== defaults.member ||
    terminology.memberPlural !== defaults.memberPlural ||
    terminology.unit !== defaults.unit ||
    terminology.order !== defaults.order

  function set<K extends keyof Terminology>(key: K, value: Terminology[K]) {
    onChange({ ...terminology, [key]: value })
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Layers className="h-4 w-4 text-ink-500" /> Business configuration
          </div>
          <p className="mt-1 max-w-md text-xs text-ink-500">
            Customize the words the app uses for your catalog. The defaults change
            based on the business type you picked.
          </p>
        </div>
        {dirty && (
          <button
            onClick={() => onChange({ ...defaults })}
            className="rounded-pill border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-700 hover:bg-ink-50"
          >
            <RotateCcw className="mr-1 inline h-3 w-3" /> Reset to defaults
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50/40 p-3">
        <BusinessTypeIcon type={businessType} className="h-5 w-5 text-ink-700" />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            Current business type
          </div>
          <div className="text-sm font-semibold text-ink-900">
            {BUSINESS_TYPES.find((b) => b.value === businessType)?.label ?? 'Custom'}
          </div>
        </div>
        <p className="ml-auto max-w-md text-[11px] text-ink-500">
          Switching business type resets the terminology defaults above. You can still
          fine-tune every word below.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TermInput
          label={`What do you call a single ${defaults.product.toLowerCase()}?`}
          value={terminology.product}
          placeholder={defaults.product}
          onChange={(v) => set('product', v)}
        />
        <TermInput
          label={`What do you call multiple ${defaults.productPlural.toLowerCase()}?`}
          value={terminology.productPlural}
          placeholder={defaults.productPlural}
          onChange={(v) => set('productPlural', v)}
        />
        <TermInput
          label={`What do you call a single ${defaults.member.toLowerCase()}?`}
          value={terminology.member}
          placeholder={defaults.member}
          onChange={(v) => set('member', v)}
        />
        <TermInput
          label={`What do you call multiple ${defaults.memberPlural.toLowerCase()}?`}
          value={terminology.memberPlural}
          placeholder={defaults.memberPlural}
          onChange={(v) => set('memberPlural', v)}
        />
        <TermInput
          label={`What is the unit you sell by?`}
          value={terminology.unit}
          placeholder={defaults.unit}
          onChange={(v) => set('unit', v)}
        />
        <TermInput
          label={`What do you call a single order?`}
          value={terminology.order}
          placeholder={defaults.order}
          onChange={(v) => set('order', v)}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Preview
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-ink-700 sm:grid-cols-2">
          <div>
            “Add new <span className="font-bold text-ink-900">{terminology.product.toLowerCase()}</span>” · {terminology.productPlural} list
          </div>
          <div>
            “Top <span className="font-bold text-ink-900">{terminology.memberPlural.toLowerCase()}</span> this month”
          </div>
          <div>
            “Choose a <span className="font-bold text-ink-900">{terminology.unit.toLowerCase()}</span>”
          </div>
          <div>
            “View <span className="font-bold text-ink-900">{terminology.order.toLowerCase()}</span> details”
          </div>
        </div>
      </div>
    </div>
  )
}

function TermInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

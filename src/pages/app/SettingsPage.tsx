import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  KeyRound,
  Link2,
  Lock,
  Mail,
  MapPin,
  MonitorPlay,
  Nfc,
  Phone,
  Printer,
  Receipt,
  Save,
  Shield,
  ShieldCheck,
  Smartphone,
  Store,
  Tag,
  Trash2,
  User as UserIcon,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { SettingCard, SettingsShell, Toggle, Field } from '../../components/SettingsShell'
import {
  BUSINESS_TYPES,
  CURRENCIES,
  DEFAULT_CURRENCY_DISPLAY,
  DEFAULT_MEMBERSHIP_CARD_SETTINGS,
  DEFAULT_NFC_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_POS_SETTINGS,
  DEFAULT_RECEIPT_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_TAX_SETTINGS,
  TIMEZONES,
  getBusiness,
  saveBusiness,
  withDefaults,
} from '../../store'
import { getLocations } from '../../orders-store'
import { getCurrentOperator, operatorHas } from '../../operators-store'
import { getAuth } from '../../store'
import { BusinessTypeIcon } from '../../icons'
import type { Business, BusinessType, Terminology } from '../../types'
import { TERMINOLOGY_BY_TYPE } from '../../store'
import { playCue } from '../../audio'

const SECTIONS = [
  'business',
  'pos',
  'payments',
  'tax',
  'currency',
  'receipt',
  'notifications',
  'membership',
  'nfc',
  'locations',
  'team',
  'security',
  'account',
] as const

type SectionId = (typeof SECTIONS)[number]

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const paramSection = params.get('section') as SectionId | null
  const [section, setSection] = useState<SectionId>(
    paramSection && SECTIONS.includes(paramSection) ? paramSection : 'business',
  )
  const [b, setB] = useState<Business>(() => withDefaults(getBusiness() ?? makeDefault()))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSection((paramSection && SECTIONS.includes(paramSection) ? paramSection : 'business'))
  }, [paramSection])

  // Reload from local storage when the user revisits (in case another tab saved)
  useEffect(() => {
    function onFocus() {
      setB(withDefaults(getBusiness() ?? makeDefault()))
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  function select(id: string) {
    const next = id as SectionId
    setSection(next)
    setParams((p) => {
      const out = new URLSearchParams(p)
      out.set('section', next)
      return out
    }, { replace: true })
  }

  function save() {
    saveBusiness(b)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    playCue('success')
  }

  const me = getCurrentOperator()
  const canManageSettings = operatorHas(me, 'settings.manage')
  const dirty = JSON.stringify(b) !== JSON.stringify(withDefaults(getBusiness() ?? makeDefault()))

  return (
    <SettingsShell
      active={section}
      onSelect={select}
      onSave={save}
      saved={saved}
      dirty={dirty || saved}
    >
      {section === 'business' && (
        <BusinessProfileSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'pos' && (
        <POSConfigSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'payments' && (
        <PaymentMethodsSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'tax' && (
        <TaxSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'currency' && (
        <CurrencySection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'receipt' && (
        <ReceiptSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'notifications' && (
        <NotificationsSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'membership' && (
        <MembershipCardsSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'nfc' && (
        <NFCConfigSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'locations' && (
        <LocationsSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'team' && <UsersRolesSection />}
      {section === 'security' && (
        <SecuritySection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
      {section === 'account' && (
        <AccountSection b={b} setB={setB} readOnly={!canManageSettings} />
      )}
    </SettingsShell>
  )
}

function makeDefault(): Parameters<typeof withDefaults>[0] {
  return withDefaults({
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
    categories: ['Mains', 'Drinks', 'Desserts'],
    paymentMethods: ['Cash', 'Card', 'Bank Transfer', 'Digital Wallet', 'Membership Card'],
    membership: { enabled: true, tiers: [{ name: 'Gold', discount: 10 }] },
    terminology: TERMINOLOGY_BY_TYPE.restaurant,
    address: '',
    website: '',
    pos: DEFAULT_POS_SETTINGS,
    receipt: DEFAULT_RECEIPT_SETTINGS,
    tax: DEFAULT_TAX_SETTINGS,
    currencyDisplay: DEFAULT_CURRENCY_DISPLAY,
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    membershipCards: DEFAULT_MEMBERSHIP_CARD_SETTINGS,
    nfc: DEFAULT_NFC_SETTINGS,
    security: DEFAULT_SECURITY_SETTINGS,
    locations: { multiLocation: true, defaultLocationId: 'loc-main', tagTransactionsWithTerminal: true, cardsUsableAcrossLocations: true, requireLocationSelectionAtPOS: false },
  })
}

// ---- Business Profile ---------------------------------------------------

function BusinessProfileSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  return (
    <>
      <SettingCard
        title="Identity"
        description="Name, logo and business type appear on receipts, the portal, and the customer dashboard."
        icon={Store}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Business name">
            <input
              className="input"
              value={b.name}
              disabled={readOnly}
              onChange={(e) => setB({ ...b, name: e.target.value })}
            />
          </Field>
          <Field label="Business type">
            <select
              className="input"
              value={b.type}
              disabled={readOnly}
              onChange={(e) =>
                setB({
                  ...b,
                  type: e.target.value as BusinessType,
                  terminology: TERMINOLOGY_BY_TYPE[e.target.value as BusinessType],
                })
              }
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Logo" hint="Square PNG or JPG. Shown on receipts and the member portal.">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
                {b.logo ? (
                  <img src={b.logo} alt="logo" className="h-full w-full object-cover" />
                ) : (
                  <BusinessTypeIcon type={b.type} className="h-6 w-6 text-ink-700" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={readOnly}
                  className="btn-secondary text-xs"
                  onClick={() =>
                    setB({
                      ...b,
                      logo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                        b.name,
                      )}`,
                    })
                  }
                >
                  Generate placeholder
                </button>
                {b.logo && (
                  <button
                    type="button"
                    disabled={readOnly}
                    className="btn-secondary text-xs"
                    onClick={() => setB({ ...b, logo: undefined })}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Contact"
        description="How customers and members can reach this business."
        icon={Mail}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Contact email" hint="Used for receipts and support replies.">
            <input
              type="email"
              className="input"
              value={b.contactEmail}
              disabled={readOnly}
              onChange={(e) => setB({ ...b, contactEmail: e.target.value })}
            />
          </Field>
          <Field label="Contact phone">
            <input
              className="input"
              value={b.contactPhone}
              disabled={readOnly}
              onChange={(e) => setB({ ...b, contactPhone: e.target.value })}
            />
          </Field>
          <Field label="Website" hint="Optional. Shown on receipts if provided.">
            <div className="relative">
              <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                className="input pl-9"
                value={b.website ?? ''}
                disabled={readOnly}
                onChange={(e) => setB({ ...b, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </Field>
          <Field label="Address" hint="Printed on receipts and used for tax defaults.">
            <input
              className="input"
              value={b.address ?? ''}
              disabled={readOnly}
              onChange={(e) => setB({ ...b, address: e.target.value })}
              placeholder="12 Aurora Ave, Downtown"
            />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Terminology"
        description="Customise the words the app uses for your catalog."
        icon={Tag}
      >
        <TerminologyEditor
          value={b.terminology}
          businessType={b.type}
          readOnly={readOnly}
          onChange={(terminology) => setB({ ...b, terminology })}
        />
      </SettingCard>
    </>
  )
}

// ---- POS Configuration --------------------------------------------------

function POSConfigSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const pos = b.pos
  function update<K extends keyof typeof pos>(key: K, value: (typeof pos)[K]) {
    setB({ ...b, pos: { ...pos, [key]: value } })
  }
  return (
    <>
      <SettingCard
        title="POS layout"
        description="How products and the cart behave by default at the till."
        icon={MonitorPlay}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Default POS mode">
            <div className="grid grid-cols-3 gap-2">
              {(['standard', 'restaurant', 'quick'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setB({ ...b, posMode: m })}
                  className={
                    b.posMode === m
                      ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-semibold text-ink-900 capitalize ring-1 ring-brand-500/30'
                      : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 capitalize hover:bg-ink-50'
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Default product sort">
            <select
              className="input"
              value={pos.productSort}
              disabled={readOnly}
              onChange={(e) => update('productSort', e.target.value as typeof pos.productSort)}
            >
              <option value="popularity">Most popular</option>
              <option value="name">Name (A → Z)</option>
              <option value="priceAsc">Price (low → high)</option>
              <option value="priceDesc">Price (high → low)</option>
              <option value="newest">Newest first</option>
            </select>
          </Field>
          <Field label="Default category filter">
            <select
              className="input"
              value={pos.defaultCategoryFilter}
              disabled={readOnly}
              onChange={(e) =>
                update('defaultCategoryFilter', e.target.value as typeof pos.defaultCategoryFilter)
              }
            >
              <option value="all">All categories</option>
              <option value="favorites">Favorites only</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Toggle
            label="Show favorites row"
            description="Display a quick-access row of starred items at the top."
            checked={pos.showFavorites}
            disabled={readOnly}
            onChange={(v) => update('showFavorites', v)}
          />
          <Toggle
            label="Show quantity stepper"
            description="+/- buttons on each product card."
            checked={pos.showQuantityStepper}
            disabled={readOnly}
            onChange={(v) => update('showQuantityStepper', v)}
          />
          <Toggle
            label="Allow duplicate lines"
            description="When off, the cart merges re-adds into the same line."
            checked={pos.allowDuplicateLines}
            disabled={readOnly}
            onChange={(v) => update('allowDuplicateLines', v)}
          />
          <Toggle
            label="Show running subtotal"
            description="Display subtotal in the cart header at all times."
            checked={pos.showRunningSubtotal}
            disabled={readOnly}
            onChange={(v) => update('showRunningSubtotal', v)}
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Checkout"
        description="Defaults applied when an operator starts a checkout."
        icon={CreditCard}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Default tip %" hint="Suggested tip shown for cash / card sales.">
            <select
              className="input"
              value={pos.defaultTipPercent}
              disabled={readOnly}
              onChange={(e) => update('defaultTipPercent', Number(e.target.value))}
            >
              {[0, 5, 10, 12.5, 15, 18, 20].map((t) => (
                <option key={t} value={t}>
                  {t === 0 ? 'No tip' : `${t}%`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Auto-lock POS after" hint="Idle time before the POS requires sign-in again.">
            <select
              className="input"
              value={b.security.autoLockMinutes}
              disabled={readOnly}
              onChange={(e) =>
                setB({
                  ...b,
                  security: { ...b.security, autoLockMinutes: Number(e.target.value) },
                })
              }
            >
              {[1, 5, 10, 15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minute{m === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Toggle
            label="Auto-clear cart after checkout"
            description="Reset the cart as soon as the sale completes."
            checked={pos.autoClearCart}
            disabled={readOnly}
            onChange={(v) => update('autoClearCart', v)}
          />
          <Toggle
            label="Require customer"
            description="Operator must attach a member or walk-in tag before payment."
            checked={pos.requireCustomer}
            disabled={readOnly}
            onChange={(v) => update('requireCustomer', v)}
          />
          <Toggle
            label="Always show change-due"
            description="Even when the customer paid the exact amount."
            checked={pos.alwaysShowChangeDue}
            disabled={readOnly}
            onChange={(v) => update('alwaysShowChangeDue', v)}
          />
          <Toggle
            label="Round cash to nearest 0.05"
            description="Useful in regions where 1¢ / 2¢ coins are out of circulation."
            checked={pos.roundCashToNickel}
            disabled={readOnly}
            onChange={(v) => update('roundCashToNickel', v)}
          />
        </div>
      </SettingCard>
    </>
  )
}

// ---- Payment methods ----------------------------------------------------

const PAYMENT_METHODS: { id: string; label: string; description: string; icon: typeof CreditCard }[] = [
  { id: 'Cash', label: 'Cash', description: 'Tendered with change-due screen.', icon: Wallet },
  { id: 'Card', label: 'Card', description: 'Debit / credit via integrated terminal.', icon: CreditCard },
  { id: 'Bank Transfer', label: 'Bank Transfer', description: 'Manual capture with reference code.', icon: Building2 },
  { id: 'Digital Wallet', label: 'Digital Wallet', description: 'Apple Pay, Google Pay and similar.', icon: Smartphone },
  { id: 'Membership Card', label: 'Membership Card', description: 'NFC or virtual card balance.', icon: CreditCard },
]

function PaymentMethodsSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  function toggle(id: string, on: boolean) {
    const next = on
      ? Array.from(new Set([...b.paymentMethods, id]))
      : b.paymentMethods.filter((p) => p !== id)
    setB({ ...b, paymentMethods: next })
  }
  return (
    <SettingCard
      title="Payment methods"
      description="Choose which payment options are available at the till. Disabled methods are hidden from the POS checkout."
      icon={CreditCard}
    >
      <ul className="space-y-2">
        {PAYMENT_METHODS.map((m) => {
          const enabled = b.paymentMethods.includes(m.id)
          const Icon = m.icon
          return (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3"
            >
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={readOnly}
                onClick={() => toggle(m.id, !enabled)}
                className={enabled ? 'switch-track-on mt-0.5' : 'switch-track mt-0.5'}
              >
                <span className={enabled ? 'switch-thumb-on' : 'switch-thumb'} />
              </button>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{m.label}</span>
                  <span
                    className={
                      enabled
                        ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700'
                        : 'rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-700'
                    }
                  >
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-ink-500">{m.description}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </SettingCard>
  )
}

// ---- Tax ----------------------------------------------------------------

function TaxSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const tax = b.tax
  function update<K extends keyof typeof tax>(key: K, value: (typeof tax)[K]) {
    setB({ ...b, tax: { ...tax, [key]: value } })
  }
  function addRate() {
    update('categoryRates', [...tax.categoryRates, { category: b.categories[0] ?? 'General', rate: 0 }])
  }
  function updateRate(idx: number, patch: Partial<{ category: string; rate: number }>) {
    const next = tax.categoryRates.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    update('categoryRates', next)
  }
  function removeRate(idx: number) {
    update(
      'categoryRates',
      tax.categoryRates.filter((_, i) => i !== idx),
    )
  }
  return (
    <>
      <SettingCard
        title="Tax defaults"
        description="Tax applies on top of the item price (exclusive) or is included in the listed price (inclusive)."
        icon={Receipt}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Tax mode">
            <div className="grid grid-cols-2 gap-2">
              {(['exclusive', 'inclusive'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    update('inclusive', m === 'inclusive')
                    setB({ ...b, taxInclusive: m === 'inclusive' })
                  }}
                  className={
                    (m === 'inclusive') === tax.inclusive
                      ? 'rounded-xl border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-semibold text-ink-900 capitalize ring-1 ring-brand-500/30'
                      : 'rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 capitalize hover:bg-ink-50'
                  }
                >
                  {m === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Default tax rate" hint="Used when a category has no override.">
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                className="input pr-8"
                value={tax.rate}
                disabled={readOnly}
                onChange={(e) => {
                  const r = Number(e.target.value) || 0
                  update('rate', r)
                  setB({ ...b, taxRate: r })
                }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
                %
              </span>
            </div>
          </Field>
          <Field label="Tax / VAT ID" hint="Printed on receipts if provided.">
            <input
              className="input"
              value={tax.taxId}
              disabled={readOnly}
              onChange={(e) => update('taxId', e.target.value)}
              placeholder="e.g. TAX-12345"
            />
          </Field>
        </div>
        <Toggle
          label="Show tax line on receipts"
          description="Print a dedicated 'Tax' row beneath the subtotal."
          checked={tax.showOnReceipt}
          disabled={readOnly}
          onChange={(v) => update('showOnReceipt', v)}
        />
      </SettingCard>

      <SettingCard
        title="Per-category overrides"
        description="Different categories (e.g. alcohol, food, services) can have different tax rates."
        icon={Tag}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-ink-500">Add one row per category that needs a custom rate.</p>
          <button
            type="button"
            disabled={readOnly}
            onClick={addRate}
            className="btn-secondary text-xs"
          >
            + Add rate
          </button>
        </div>
        {tax.categoryRates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/40 p-5 text-center text-xs text-ink-500">
            No category overrides yet. The default rate applies to every category.
          </div>
        ) : (
          <ul className="space-y-2">
            {tax.categoryRates.map((r, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-2.5"
              >
                <select
                  className="input min-w-[160px] flex-1"
                  value={r.category}
                  disabled={readOnly}
                  onChange={(e) => updateRate(idx, { category: e.target.value })}
                >
                  {b.categories.length > 0 ? (
                    b.categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  ) : (
                    <option value={r.category}>{r.category}</option>
                  )}
                </select>
                <div className="relative w-28">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    className="input pr-7"
                    value={r.rate}
                    disabled={readOnly}
                    onChange={(e) => updateRate(idx, { rate: Number(e.target.value) || 0 })}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => removeRate(idx)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 hover:bg-rose-50 hover:text-rose-700"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingCard>
    </>
  )
}

// ---- Currency & Locale --------------------------------------------------

function CurrencySection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const cd = b.currencyDisplay
  function update<K extends keyof typeof cd>(key: K, value: (typeof cd)[K]) {
    setB({ ...b, currencyDisplay: { ...cd, [key]: value } })
  }
  return (
    <SettingCard
      title="Currency & locale"
      description="How money is formatted across the app, on receipts, and in reports."
      icon={Wallet}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Currency code" hint="ISO 4217 — used by the payments API.">
          <select
            className="input"
            value={cd.code}
            disabled={readOnly}
            onChange={(e) => {
              update('code', e.target.value)
              setB({ ...b, currency: e.target.value })
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Symbol">
          <input
            className="input"
            value={cd.symbol}
            disabled={readOnly}
            onChange={(e) => update('symbol', e.target.value)}
          />
        </Field>
        <Field label="Symbol position">
          <select
            className="input"
            value={cd.position}
            disabled={readOnly}
            onChange={(e) => update('position', e.target.value as typeof cd.position)}
          >
            <option value="before">Before amount ($10)</option>
            <option value="after">After amount (10 €)</option>
          </select>
        </Field>
        <Field label="Decimal separator">
          <select
            className="input"
            value={cd.decimal}
            disabled={readOnly}
            onChange={(e) => update('decimal', e.target.value as typeof cd.decimal)}
          >
            <option value=".">Period (1,234.56)</option>
            <option value=",">Comma (1.234,56)</option>
          </select>
        </Field>
        <Field label="Thousands separator">
          <select
            className="input"
            value={cd.thousands}
            disabled={readOnly}
            onChange={(e) => update('thousands', e.target.value as typeof cd.thousands)}
          >
            <option value=",">Comma (1,234)</option>
            <option value=".">Period (1.234)</option>
            <option value=" ">Space (1 234)</option>
            <option value="’">Apostrophe (1’234)</option>
            <option value="">None (1234)</option>
          </select>
        </Field>
        <Field label="Decimal places">
          <select
            className="input"
            value={cd.decimals}
            disabled={readOnly}
            onChange={(e) => update('decimals', Number(e.target.value) as typeof cd.decimals)}
          >
            <option value={0}>0 (whole units)</option>
            <option value={2}>2 (e.g. cents)</option>
          </select>
        </Field>
        <Field label="Timezone" hint="Used by reports and the daily digest.">
          <select
            className="input"
            value={b.timezone}
            disabled={readOnly}
            onChange={(e) => setB({ ...b, timezone: e.target.value })}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Preview
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-base font-bold text-ink-900 sm:grid-cols-4">
          <div>{formatPreview(1234.5, cd)}</div>
          <div>{formatPreview(99, cd)}</div>
          <div>{formatPreview(0, cd)}</div>
          <div>{formatPreview(1234567.89, cd)}</div>
        </div>
      </div>
    </SettingCard>
  )
}

function formatPreview(n: number, cd: { code: string; symbol: string; decimals: number; decimal: '.' | ','; thousands: ',' | '.' | ' ' | '’' | ''; position: 'before' | 'after' }): string {
  const fixed = n.toFixed(cd.decimals)
  const [int, frac] = fixed.split('.')
  const intGrouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, cd.thousands)
  const value = frac !== undefined ? `${intGrouped}${cd.decimal}${frac}` : intGrouped
  return cd.position === 'before' ? `${cd.symbol}${value}` : `${value} ${cd.symbol}`
}

// ---- Receipt ------------------------------------------------------------

function ReceiptSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const r = b.receipt
  function update<K extends keyof typeof r>(key: K, value: (typeof r)[K]) {
    setB({ ...b, receipt: { ...r, [key]: value } })
  }
  return (
    <SettingCard
      title="Receipt"
      description="Configure what gets printed on every receipt and how the printer behaves."
      icon={Printer}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Header text" hint="Shown at the top of every receipt.">
          <input
            className="input"
            value={b.receiptHeader}
            disabled={readOnly}
            onChange={(e) => setB({ ...b, receiptHeader: e.target.value })}
          />
        </Field>
        <Field label="Footer text" hint="Shown at the bottom of every receipt.">
          <input
            className="input"
            value={b.receiptFooter}
            disabled={readOnly}
            onChange={(e) => setB({ ...b, receiptFooter: e.target.value })}
          />
        </Field>
        <Field label="Footer override" hint="Replaces the default footer if set.">
          <input
            className="input"
            value={r.footer}
            disabled={readOnly}
            onChange={(e) => update('footer', e.target.value)}
            placeholder="e.g. Free drink on your birthday!"
          />
        </Field>
        <Field label="Copies" hint="How many copies to print per sale.">
          <select
            className="input"
            value={r.copies}
            disabled={readOnly}
            onChange={(e) => update('copies', Number(e.target.value))}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'copy' : 'copies'}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Toggle
          label="Show logo"
          checked={r.showLogo}
          disabled={readOnly}
          onChange={(v) => update('showLogo', v)}
        />
        <Toggle
          label="Show business address"
          checked={r.showAddress}
          disabled={readOnly}
          onChange={(v) => update('showAddress', v)}
        />
        <Toggle
          label="Show email & phone"
          checked={r.showEmail}
          disabled={readOnly}
          onChange={(v) => update('showEmail', v)}
        />
        <Toggle
          label="Show cashier name"
          checked={r.showCashier}
          disabled={readOnly}
          onChange={(v) => update('showCashier', v)}
        />
        <Toggle
          label="Show customer name"
          checked={r.showCustomer}
          disabled={readOnly}
          onChange={(v) => update('showCustomer', v)}
        />
        <Toggle
          label="Print barcode"
          description="Adds a Code-128 barcode for the order id."
          checked={r.showBarcode}
          disabled={readOnly}
          onChange={(v) => update('showBarcode', v)}
        />
        <Toggle
          label="Show return policy"
          checked={r.showReturnPolicy}
          disabled={readOnly}
          onChange={(v) => update('showReturnPolicy', v)}
        />
        <Toggle
          label="Auto-print after every sale"
          description="Print immediately when a sale completes."
          checked={r.autoPrint}
          disabled={readOnly}
          onChange={(v) => update('autoPrint', v)}
        />
        <Toggle
          label="Auto-open receipt preview"
          description="Open the digital receipt after every sale."
          checked={r.autoOpenPreview}
          disabled={readOnly}
          onChange={(v) => update('autoOpenPreview', v)}
        />
      </div>
    </SettingCard>
  )
}

// ---- Notifications ------------------------------------------------------

function NotificationsSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const n = b.notifications
  function update<K extends keyof typeof n>(key: K, value: (typeof n)[K]) {
    setB({ ...b, notifications: { ...n, [key]: value } })
  }
  return (
    <SettingCard
      title="Notifications"
      description="Email and push alerts for the events your team cares about."
      icon={Bell}
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Toggle
          label="Email — new orders"
          description="Sent for every successful sale."
          checked={n.emailNewOrder}
          disabled={readOnly}
          onChange={(v) => update('emailNewOrder', v)}
        />
        <Toggle
          label="Email — refunds"
          description="Sent whenever a refund or partial refund is issued."
          checked={n.emailRefund}
          disabled={readOnly}
          onChange={(v) => update('emailRefund', v)}
        />
        <Toggle
          label="Email — low stock"
          description="Sent when a product drops below its reorder threshold."
          checked={n.emailLowStock}
          disabled={readOnly}
          onChange={(v) => update('emailLowStock', v)}
        />
        <Toggle
          label="Email — low card balance"
          description="Sent when a member's card drops below the threshold below."
          checked={n.emailLowBalance}
          disabled={readOnly}
          onChange={(v) => update('emailLowBalance', v)}
        />
        <Toggle
          label="Daily summary email"
          description="A recap of yesterday's sales, sent at 8am."
          checked={n.dailyDigest}
          disabled={readOnly}
          onChange={(v) => update('dailyDigest', v)}
        />
        <Toggle
          label="Push — critical events"
          description="Browser push for refunds, security, and integration failures."
          checked={n.pushCritical}
          disabled={readOnly}
          onChange={(v) => update('pushCritical', v)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Low card balance threshold"
          hint="Members below this amount trigger a low-balance alert."
        >
          <div className="relative">
            <input
              type="number"
              min={0}
              step="1"
              className="input pr-12"
              value={n.lowBalanceThreshold}
              disabled={readOnly}
              onChange={(e) => update('lowBalanceThreshold', Number(e.target.value) || 0)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
              {b.currencyDisplay.symbol}
            </span>
          </div>
        </Field>
      </div>
    </SettingCard>
  )
}

// ---- Membership Cards ---------------------------------------------------

function MembershipCardsSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const m = b.membershipCards
  function update<K extends keyof typeof m>(key: K, value: (typeof m)[K]) {
    setB({ ...b, membershipCards: { ...m, [key]: value } })
  }
  return (
    <>
      <SettingCard
        title="Card naming & status"
        description="How cards are labelled and what happens when they're first issued."
        icon={CreditCard}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Card label" hint="e.g. 'Loyalty Card', 'EzCard'…">
            <input
              className="input"
              value={m.cardLabel}
              disabled={readOnly}
              onChange={(e) => update('cardLabel', e.target.value)}
            />
          </Field>
          <Field label="Default status for new cards">
            <select
              className="input"
              value={m.defaultStatus}
              disabled={readOnly}
              onChange={(e) => update('defaultStatus', e.target.value as typeof m.defaultStatus)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Validity (months)">
            <input
              type="number"
              min={1}
              className="input"
              value={m.validityMonths}
              disabled={readOnly}
              onChange={(e) => update('validityMonths', Number(e.target.value) || 24)}
            />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Balance rules"
        description="Defaults applied when a card is issued."
        icon={Wallet}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Starting balance">
            <div className="relative">
              <input
                type="number"
                min={0}
                className="input pr-12"
                value={m.defaultStartingBalance}
                disabled={readOnly}
                onChange={(e) => update('defaultStartingBalance', Number(e.target.value) || 0)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
                {b.currencyDisplay.symbol}
              </span>
            </div>
          </Field>
          <Field label="Daily transaction limit">
            <div className="relative">
              <input
                type="number"
                min={0}
                className="input pr-12"
                value={m.defaultDailyLimit}
                disabled={readOnly}
                onChange={(e) => update('defaultDailyLimit', Number(e.target.value) || 0)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
                {b.currencyDisplay.symbol}
              </span>
            </div>
          </Field>
          <Field label="Monthly transaction limit">
            <div className="relative">
              <input
                type="number"
                min={0}
                className="input pr-12"
                value={m.defaultMonthlyLimit}
                disabled={readOnly}
                onChange={(e) => update('defaultMonthlyLimit', Number(e.target.value) || 0)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
                {b.currencyDisplay.symbol}
              </span>
            </div>
          </Field>
          <Field label="Low-balance warning threshold">
            <div className="relative">
              <input
                type="number"
                min={0}
                className="input pr-12"
                value={m.lowBalanceWarning}
                disabled={readOnly}
                onChange={(e) => update('lowBalanceWarning', Number(e.target.value) || 0)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-500">
                {b.currencyDisplay.symbol}
              </span>
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Toggle
            label="Allow negative balance"
            description="Card can be charged past zero — useful for credit-style cards."
            checked={m.allowOverdraft}
            disabled={readOnly}
            onChange={(v) => update('allowOverdraft', v)}
          />
          <Toggle
            label="Block card when reported lost"
            description="Lost cards are automatically blocked from the POS."
            checked={m.blockOnLost}
            disabled={readOnly}
            onChange={(v) => update('blockOnLost', v)}
          />
          <Toggle
            label="Require approval for refunds"
            description="Card refunds must be reviewed by a manager before processing."
            checked={m.requireApprovalForRefund}
            disabled={readOnly}
            onChange={(v) => update('requireApprovalForRefund', v)}
          />
          <Toggle
            label="Membership programme enabled"
            description="Disable to remove all membership features from the POS."
            checked={b.membership.enabled}
            disabled={readOnly}
            onChange={(v) => setB({ ...b, membership: { ...b.membership, enabled: v } })}
          />
        </div>
      </SettingCard>
    </>
  )
}

// ---- NFC Configuration --------------------------------------------------

function NFCConfigSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const n = b.nfc
  function update<K extends keyof typeof n>(key: K, value: (typeof n)[K]) {
    setB({ ...b, nfc: { ...n, [key]: value } })
  }
  return (
    <>
      <SettingCard
        title="NFC readers"
        description="Supported integrations for contactless membership cards. Secret keys and credentials are configured outside this dashboard."
        icon={Nfc}
      >
        <Toggle
          label="Enable NFC reader support"
          description="When disabled, the POS hides all card-tap actions."
          checked={n.enabled}
          disabled={readOnly}
          onChange={(v) => update('enabled', v)}
        />
        <Field label="Reader protocol" hint="Pick the closest match; we use a generic driver for everything else.">
          <select
            className="input"
            value={n.readerProtocol}
            disabled={readOnly}
            onChange={(e) => update('readerProtocol', e.target.value as typeof n.readerProtocol)}
          >
            <option value="generic">Generic (recommended)</option>
            <option value="acrfid">ACR122U / ACR1255 family</option>
            <option value="pn532">PN532 (libnfc)</option>
            <option value="none">No reader attached</option>
          </select>
        </Field>
        <Field label="UID prefix" hint="Last 8 hex characters of the reader's serial to bind it to this terminal.">
          <input
            className="input font-mono"
            value={n.uidPrefix}
            disabled={readOnly}
            onChange={(e) => update('uidPrefix', e.target.value.toUpperCase())}
            placeholder="04:A3:BC:11"
          />
        </Field>
      </SettingCard>

      <SettingCard
        title="Tap behaviour"
        description="What happens when a customer taps a card at the till."
        icon={KeyRound}
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Toggle
            label="Auto-fill member from card tap"
            description="Attach the tapped card's member to the sale automatically."
            checked={n.autoFillMember}
            disabled={readOnly}
            onChange={(v) => update('autoFillMember', v)}
          />
          <Toggle
            label="Auto-charge card on POS checkout"
            description="Charge the tapped card without prompting. Off = operator confirms."
            checked={n.autoChargeOnSale}
            disabled={readOnly}
            onChange={(v) => update('autoChargeOnSale', v)}
          />
          <Toggle
            label="Play sound on tap"
            description="Audible confirmation when a card is read."
            checked={n.tapSound}
            disabled={readOnly}
            onChange={(v) => update('tapSound', v)}
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Secrets"
        description="Sensitive credentials are never stored in the dashboard. They live in your terminal's secure vault."
        icon={Shield}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4" /> Read-only summary
          </div>
          <p className="mt-1 text-xs">
            {n.note ||
              'Card reader keys and API credentials are managed outside this dashboard.'}
          </p>
        </div>
        <Field label="Internal note" hint="Shown on this page only. Use it to remind yourself where secrets are stored.">
          <textarea
            className="input min-h-[90px]"
            value={n.note}
            disabled={readOnly}
            onChange={(e) => update('note', e.target.value)}
          />
        </Field>
      </SettingCard>
    </>
  )
}

// ---- Locations ----------------------------------------------------------

function LocationsSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const list = getLocations()
  const l = b.locations
  // In single-location mode we deliberately hide the chrome that only makes
  // sense for multi-location operations (per-location tagging, "Pick a
  // location" pickers, etc.) so the operator isn't shown controls that
  // don't actually do anything. The toggle + primary location picker stay
  // visible so the operator can re-enable multi-location at any time.
  const multi = l.multiLocation
  function update<K extends keyof typeof l>(key: K, value: (typeof l)[K]) {
    setB({ ...b, locations: { ...l, [key]: value } })
  }
  return (
    <>
      <SettingCard
        title="Multi-location"
        description="If you operate more than one store / kiosk / register, enable multi-location tagging."
        icon={MapPin}
      >
        <Toggle
          label="Enable multi-location"
          description="Each sale can be tagged with the location it was rung up at."
          checked={l.multiLocation}
          disabled={readOnly}
          onChange={(v) => update('multiLocation', v)}
        />
        {!multi && (
          <div className="rounded-2xl border border-ink-200 bg-ink-50/60 p-3 text-[11px] text-ink-600">
            <div className="font-semibold text-ink-800">Multi-location is off</div>
            <div className="mt-0.5">
              This business is running in single-location mode. Per-location tagging,
              location pickers, and the locations management screen are hidden across
              the admin. Enable multi-location above to restore them.
            </div>
          </div>
        )}
        <div
          className={multi ? '' : 'pointer-events-none opacity-50'}
          aria-disabled={!multi}
        >
          <Toggle
            label="Tag every transaction with a terminal id"
            description="Useful when you have multiple registers in the same location."
            checked={l.tagTransactionsWithTerminal}
            disabled={readOnly || !multi}
            onChange={(v) => update('tagTransactionsWithTerminal', v)}
          />
          <Toggle
            label="Membership cards usable across locations"
            description="Members can tap their card at any active location. Disable to restrict cards to a single home location."
            checked={l.cardsUsableAcrossLocations}
            disabled={readOnly || !multi}
            onChange={(v) => update('cardsUsableAcrossLocations', v)}
          />
          <Toggle
            label="Require location selection at POS"
            description="Operators must pick a location before ringing up a sale."
            checked={l.requireLocationSelectionAtPOS}
            disabled={readOnly || !multi}
            onChange={(v) => update('requireLocationSelectionAtPOS', v)}
          />
        </div>
        <Field
          label="Primary location"
          hint="Used by the POS when no operator or terminal override is supplied."
        >
          <select
            className="input"
            value={l.defaultLocationId}
            disabled={readOnly}
            onChange={(e) => update('defaultLocationId', e.target.value)}
          >
            {list.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} · {loc.code}
              </option>
            ))}
          </select>
        </Field>
      </SettingCard>

      <SettingCard
        title="Registered locations"
        description={
          multi
            ? 'All stores, kiosks and counters currently attached to this business. Open the locations page to add or update any of them.'
            : 'Your single registered location. Multi-location management is disabled, so the locations page is hidden.'
        }
        icon={Building2}
      >
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {list.map((loc) => (
            <li
              key={loc.id}
              className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-50 text-ink-700">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink-900">{loc.name}</span>
                  <span className="rounded-full border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-bold text-ink-700">
                    {loc.code}
                  </span>
                  {loc.isPrimary && (
                    <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-ink-900">
                      Primary
                    </span>
                  )}
                </div>
                <div className="truncate text-[11px] text-ink-500">
                  {loc.address ?? 'No address'}
                  {loc.city ? ` · ${loc.city}` : ''}
                </div>
                <div className="mt-1 truncate text-[10px] text-ink-400">
                  {loc.terminals.length} terminal{loc.terminals.length === 1 ? '' : 's'} · {loc.managerIds.length} manager{loc.managerIds.length === 1 ? '' : 's'}
                </div>
              </div>
              <span
                className={
                  loc.status === 'active'
                    ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700'
                    : loc.status === 'maintenance'
                    ? 'rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700'
                    : 'rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-700'
                }
              >
                {loc.status === 'active'
                  ? 'Active'
                  : loc.status === 'maintenance'
                  ? 'Maintenance'
                  : loc.status === 'inactive'
                  ? 'Inactive'
                  : 'Archived'}
              </span>
            </li>
          ))}
        </ul>
        {multi ? (
          <div className="border-t border-ink-100 pt-3">
            <Link to="/app/locations" className="btn-secondary text-xs">
              <Building2 className="h-3.5 w-3.5" /> Manage locations, managers &amp; terminals
            </Link>
          </div>
        ) : (
          <div className="border-t border-ink-100 pt-3 text-[11px] text-ink-500">
            Enable multi-location above to manage additional stores, kiosks, and
            terminals.
          </div>
        )}
      </SettingCard>
    </>
  )
}

// ---- Users & Roles (links) ----------------------------------------------

function UsersRolesSection() {
  return (
    <>
      <SettingCard
        title="Staff & operators"
        description="Invite employees, manage their roles, and set per-location access."
        icon={Users}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <LinkCard
            to="/app/staff"
            title="Manage staff"
            description="Invite, suspend, and re-activate operators. Track last login and activity."
            icon={Users}
          />
          <LinkCard
            to="/app/roles"
            title="Manage roles"
            description="Create custom roles and adjust granular permissions per module."
            icon={ShieldCheck}
          />
        </div>
      </SettingCard>

      <SettingCard
        title="Operators & roles live in dedicated pages"
        description="The full editors give you every option — invite flow, activity timeline, permission toggles, and more."
        icon={UserCog}
      >
        <p className="text-xs text-ink-500">
          Open the <Link to="/app/staff" className="font-semibold text-ink-900 underline">Staff</Link>{' '}
          page to invite a new operator or <Link to="/app/roles" className="font-semibold text-ink-900 underline">Roles</Link>{' '}
          to define what each role can do.
        </p>
      </SettingCard>
    </>
  )
}

function LinkCard({
  to,
  title,
  description,
  icon: Icon,
}: {
  to: string
  title: string
  description: string
  icon: typeof UserIcon
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-ink-900">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-ink-900">{title}</div>
        <div className="mt-0.5 text-[11px] text-ink-500">{description}</div>
      </div>
      <span className="self-center text-xs font-bold text-brand-700 opacity-0 transition-opacity group-hover:opacity-100">
        Open →
      </span>
    </Link>
  )
}

// ---- Security -----------------------------------------------------------

function SecuritySection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const s = b.security
  function update<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    setB({ ...b, security: { ...s, [key]: value } })
  }
  return (
    <>
      <SettingCard
        title="Operator authentication"
        description="What an operator must do before performing sensitive actions."
        icon={KeyRound}
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Toggle
            label="Require PIN for refunds"
            description="Force a manager PIN before any refund can be issued."
            checked={s.requirePinForRefund}
            disabled={readOnly}
            onChange={(v) => update('requirePinForRefund', v)}
          />
          <Toggle
            label="Require PIN for manager actions"
            description="Edit products, void sales, change settings — all require PIN."
            checked={s.requirePinForManager}
            disabled={readOnly}
            onChange={(v) => update('requirePinForManager', v)}
          />
          <Toggle
            label="Two-factor for admin login"
            description="Admins must enter a 2FA code from their authenticator app."
            checked={s.twoFactorAdmin}
            disabled={readOnly}
            onChange={(v) => update('twoFactorAdmin', v)}
          />
        </div>
        <Field label="Session length" hint="Idle time before the dashboard signs out automatically.">
          <select
            className="input"
            value={s.sessionHours}
            disabled={readOnly}
            onChange={(e) => update('sessionHours', Number(e.target.value))}
          >
            {[1, 2, 4, 8, 12, 24].map((h) => (
              <option key={h} value={h}>
                {h} hour{h === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </Field>
      </SettingCard>

      <SettingCard
        title="Network"
        description="Transport security and IP-based restrictions."
        icon={Shield}
      >
        <Toggle
          label="Force HTTPS only"
          description="Reject any non-TLS connection to the dashboard."
          checked={s.forceHttps}
          disabled={readOnly}
          onChange={(v) => update('forceHttps', v)}
        />
        <Field
          label="IP allow-list"
          hint="One CIDR or IP per line. Empty = allow all."
        >
          <textarea
            className="input min-h-[90px] font-mono text-xs"
            value={s.ipAllowList}
            disabled={readOnly}
            onChange={(e) => update('ipAllowList', e.target.value)}
            placeholder={'192.168.1.0/24\n10.0.0.0/8'}
          />
        </Field>
      </SettingCard>
    </>
  )
}

// ---- Account ------------------------------------------------------------

function AccountSection({
  b,
  setB,
  readOnly,
}: {
  b: Business
  setB: (b: Business) => void
  readOnly: boolean
}) {
  const auth = getAuth()
  const owner = auth?.email ?? 'admin@ezsale.app'
  return (
    <>
      <SettingCard
        title="Workspace owner"
        description="The primary contact and billing owner for this business."
        icon={UserCog}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Owner email" hint="Used for billing receipts and security alerts.">
            <input
              type="email"
              className="input"
              value={b.contactEmail}
              disabled={readOnly}
              onChange={(e) => setB({ ...b, contactEmail: e.target.value })}
            />
          </Field>
          <Field label="Workspace ID">
            <input className="input font-mono" value={b.id} readOnly />
          </Field>
          <Field label="Owner">
            <input className="input" value={owner} readOnly />
          </Field>
        </div>
      </SettingCard>

      <SettingCard
        title="Plan & billing"
        description="Manage your subscription and view upcoming invoices."
        icon={ShieldCheck}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Current plan</div>
            <div className="mt-1 text-base font-bold text-ink-900">Free trial</div>
            <div className="mt-0.5 text-[11px] text-ink-500">14 days remaining</div>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Next invoice</div>
            <div className="mt-1 text-base font-bold text-ink-900">$0.00</div>
            <div className="mt-0.5 text-[11px] text-ink-500">Renews Mar 12</div>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-700">Upgrade</div>
            <div className="mt-1 text-base font-bold text-ink-900">Pro · $29/mo</div>
            <div className="mt-0.5 text-[11px] text-ink-700">Unlimited staff + locations.</div>
            <button className="btn-primary mt-3 text-xs">Choose plan</button>
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-4 w-4" /> Danger zone
          </div>
          <p className="mt-1 text-xs">
            Closing the workspace is permanent. All transactions, members and cards will be
            retained for 30 days for compliance, then permanently deleted.
          </p>
          <button className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100">
            <Trash2 className="h-3.5 w-3.5" /> Close workspace
          </button>
        </div>
      </SettingCard>
    </>
  )
}

// ---- Terminology editor -------------------------------------------------

function TerminologyEditor({
  value,
  businessType,
  readOnly,
  onChange,
}: {
  value: Terminology
  businessType: BusinessType
  readOnly: boolean
  onChange: (t: Terminology) => void
}) {
  const defaults = TERMINOLOGY_BY_TYPE[businessType]
  const dirty =
    value.product !== defaults.product ||
    value.productPlural !== defaults.productPlural ||
    value.member !== defaults.member ||
    value.memberPlural !== defaults.memberPlural ||
    value.unit !== defaults.unit ||
    value.order !== defaults.order
  function set<K extends keyof Terminology>(key: K, v: Terminology[K]) {
    onChange({ ...value, [key]: v })
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-500">
          These words replace "product", "customer", etc. across the dashboard.
        </p>
        {dirty && (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange({ ...defaults })}
            className="btn-secondary text-xs"
          >
            Reset to defaults
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TermField label="Single product" value={value.product} readOnly={readOnly} onChange={(v) => set('product', v)} />
        <TermField label="Plural product" value={value.productPlural} readOnly={readOnly} onChange={(v) => set('productPlural', v)} />
        <TermField label="Single member" value={value.member} readOnly={readOnly} onChange={(v) => set('member', v)} />
        <TermField label="Plural member" value={value.memberPlural} readOnly={readOnly} onChange={(v) => set('memberPlural', v)} />
        <TermField label="Unit" value={value.unit} readOnly={readOnly} onChange={(v) => set('unit', v)} />
        <TermField label="Single order" value={value.order} readOnly={readOnly} onChange={(v) => set('order', v)} />
      </div>
    </>
  )
}

function TermField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string
  value: string
  readOnly: boolean
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <input className="input" value={value} disabled={readOnly} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// unused imports kept for tree-shaking-safe exports
void Save
void Link2
void Mail
void Phone
void Globe
void Building2
void Tag
void Nfc
void KeyRound
void CreditCard
void Printer
void Receipt
void Store
void Bell
void MapPin
void ShieldCheck
void UserCog
void Users
void UserIcon
void Wallet
void Smartphone
void Lock
void Shield
void CheckCircle2
void MapPin
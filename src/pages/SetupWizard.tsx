import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronsRight,
  CreditCard,
  Globe,
  Layers,
  ListChecks,
  PartyPopper,
  Receipt,
  Tag,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
import { Logo } from '../components/Primitives'
import { Switch } from '../components/Switch'
import { BusinessTypeIcon } from '../icons'
import { BUSINESS_TYPES, CURRENCIES, TERMINOLOGY_BY_TYPE, TIMEZONES, saveBusiness } from '../store'
import type { Business, BusinessType, MembershipTier, Terminology } from '../types'

type StepId = 'business' | 'type' | 'money' | 'receipt' | 'categories' | 'payments' | 'membership' | 'finish'

interface Step {
  id: StepId
  title: string
  short: string
  icon: typeof Building2
  optional?: boolean
}

const STEPS: Step[] = [
  { id: 'business', title: 'Business information', short: 'Business', icon: Building2 },
  { id: 'type', title: 'Business type', short: 'Type', icon: Tag },
  { id: 'money', title: 'Currency & tax', short: 'Money', icon: Globe },
  { id: 'receipt', title: 'Receipt configuration', short: 'Receipt', icon: Receipt },
  { id: 'categories', title: 'Product categories', short: 'Categories', icon: Layers, optional: true },
  { id: 'payments', title: 'Payment methods', short: 'Payments', icon: Wallet },
  { id: 'membership', title: 'Membership cards', short: 'Members', icon: CreditCard, optional: true },
  { id: 'finish', title: 'Finish setup', short: 'Finish', icon: PartyPopper },
]

const DEFAULT_CATEGORIES: Record<BusinessType, string[]> = {
  restaurant: ['Mains', 'Starters', 'Drinks', 'Desserts'],
  school: ['Tuition', 'Canteen', 'Library', 'Services'],
  mall: ['Fashion', 'Electronics', 'Food court', 'Beauty'],
  gaming: ['Sessions', 'Tokens', 'Snacks', 'Merchandise'],
  retail: ['New arrivals', 'Best sellers', 'Clearance'],
  custom: ['General'],
}

const DEFAULT_PAYMENT_METHODS = ['Cash', 'Card', 'NFC Card', 'Mobile wallet']

const SUGGESTED_TIERS: MembershipTier[] = [
  { name: 'Bronze', discount: 5 },
  { name: 'Silver', discount: 10 },
  { name: 'Gold', discount: 15 },
]

function defaultTerminology(t: BusinessType): Terminology {
  return { ...TERMINOLOGY_BY_TYPE[t] }
}

type TaxMode = 'exclusive' | 'inclusive' | 'none'

export default function SetupWizard() {
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const step = STEPS[stepIndex]

  const [name, setName] = useState('')
  const [logo, setLogo] = useState<string | undefined>()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [type, setType] = useState<BusinessType>('restaurant')
  const [terminology, setTerminology] = useState<Terminology>(defaultTerminology('restaurant'))
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('UTC')
  const [taxEnabled, setTaxEnabled] = useState(true)
  const [taxRate, setTaxRate] = useState(5)
  const [taxMode, setTaxMode] = useState<'exclusive' | 'inclusive'>('exclusive')
  const [taxId, setTaxId] = useState('')
  const [receiptHeader, setReceiptHeader] = useState('Thanks for visiting!')
  const [receiptFooter, setReceiptFooter] = useState('See you again soon!')
  const [showLogo, setShowLogo] = useState(true)
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES.restaurant)
  const [newCategory, setNewCategory] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(DEFAULT_PAYMENT_METHODS)
  const [newPayment, setNewPayment] = useState('')
  const [membershipEnabled, setMembershipEnabled] = useState(true)
  const [tiers, setTiers] = useState<MembershipTier[]>(SUGGESTED_TIERS)

  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex])

  function pickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogo(reader.result as string)
    reader.readAsDataURL(file)
  }

  function setTypeAndTerminology(t: BusinessType) {
    setType(t)
    setTerminology(defaultTerminology(t))
  }

  function addCategory() {
    const v = newCategory.trim()
    if (!v || categories.includes(v)) return
    setCategories((c) => [...c, v])
    setNewCategory('')
  }

  function removeCategory(c: string) {
    setCategories((arr) => arr.filter((x) => x !== c))
  }

  function togglePayment(method: string) {
    setPaymentMethods((arr) =>
      arr.includes(method) ? arr.filter((m) => m !== method) : [...arr, method],
    )
  }

  function addPayment() {
    const v = newPayment.trim()
    if (!v || paymentMethods.includes(v)) return
    setPaymentMethods((arr) => [...arr, v])
    setNewPayment('')
  }

  function updateTier(i: number, patch: Partial<MembershipTier>) {
    setTiers((arr) => arr.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  function addTier() {
    setTiers((arr) => [...arr, { name: `Tier ${arr.length + 1}`, discount: 0 }])
  }

  function removeTier(i: number) {
    setTiers((arr) => arr.filter((_, idx) => idx !== i))
  }

  const errors = useMemo(
    () => validateStep(step.id, { name, email, type, paymentMethods }),
    [step.id, name, email, type, paymentMethods],
  )
  const visibleErrors = submitAttempted ? errors : []
  const canContinue = errors.length === 0

  function goNext() {
    if (!canContinue) {
      setSubmitAttempted(true)
      return
    }
    setSubmitAttempted(false)
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1)
  }
  function goBack() {
    setSubmitAttempted(false)
    if (stepIndex > 0) setStepIndex((i) => i - 1)
  }
  function skip() {
    setSubmitAttempted(false)
    if (step.optional) goNext()
  }

  function finish() {
    const business: Business = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      logo: showLogo ? logo : undefined,
      currency,
      timezone,
      taxRate: taxEnabled ? taxRate : 0,
      taxInclusive: taxEnabled && taxMode === 'inclusive',
      receiptHeader,
      receiptFooter,
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
      address: address.trim(),
      posMode: 'standard',
      categories,
      paymentMethods,
      membership: { enabled: membershipEnabled, tiers: membershipEnabled ? tiers : [] },
      terminology,
    }
    saveBusiness(business)
    localStorage.setItem('ezsale:onboarded', '1')
    navigate('/app/pos')
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={() => navigate('/app/pos')}
            className="text-sm font-medium text-ink-500 hover:text-ink-900"
          >
            Skip for now
          </button>
        </div>

        {/* Stepper */}
        <div className="mt-6">
          <Stepper stepIndex={stepIndex} onJump={(i) => setStepIndex(i)} />
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink-200">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Content card */}
        <div className="card mt-5 flex-1 p-5 sm:p-7 lg:p-9">
          {step.id === 'business' && (
            <Section
              title="Tell us about your business"
              description="We'll use this on receipts, reports, and member cards."
            >
              <div className="grid gap-5 md:grid-cols-[180px,1fr]">
                <div>
                  <label className="label">Logo</label>
                  <div className="h-32 w-full">
                    <label
                      htmlFor="logo"
                      className="relative grid h-full w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-center text-xs text-ink-500 hover:border-brand-400 hover:bg-brand-50"
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt="Logo preview"
                          className="absolute inset-0 m-auto max-h-full max-w-full object-contain p-2"
                        />
                      ) : (
                        <span className="flex flex-col items-center gap-1.5">
                          <Upload className="h-5 w-5" />
                          <span className="font-semibold">Upload logo</span>
                          <span>PNG or JPG</span>
                        </span>
                      )}
                      <input
                        id="logo"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={pickLogo}
                      />
                    </label>
                  </div>
                  {logo && (
                    <button
                      onClick={() => setLogo(undefined)}
                      className="mt-2 text-xs font-semibold text-ink-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  <Field label="Business name" required error={visibleErrors.find((e) => e.field === 'name')?.message}>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Bistro Aurora"
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact email" required error={visibleErrors.find((e) => e.field === 'email')?.message}>
                      <input
                        type="email"
                        className="input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hello@business.com"
                      />
                    </Field>
                    <Field label="Contact phone">
                      <input
                        className="input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 555 0123"
                      />
                    </Field>
                  </div>
                  <Field label="Street address (optional)">
                    <input
                      className="input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Market Street, Suite 4"
                    />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {step.id === 'type' && (
            <Section
              title="What kind of business do you run?"
              description="This sets the default terminology and screens throughout EzSale."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BUSINESS_TYPES.map((t) => {
                  const active = type === t.value
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTypeAndTerminology(t.value)}
                      className={active ? 'radio-card-active' : 'radio-card'}
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                          active ? 'bg-ink-900 text-brand-400' : 'bg-ink-100 text-ink-700'
                        }`}
                      >
                        <BusinessTypeIcon type={t.value} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-900">{t.label}</div>
                        <div className="mt-0.5 text-xs text-ink-500">{t.description}</div>
                      </div>
                      {active && (
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-ink-900">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50 p-5">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-ink-700" />
                  <div className="text-sm font-semibold text-ink-900">Terminology</div>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  Edit the labels EzSale will use across the POS, dashboard, and receipts.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {([
                    ['product', `${terminology.product} (singular)`],
                    ['productPlural', `${terminology.productPlural} (plural)`],
                    ['unit', `Primary unit (e.g. ${terminology.unit})`],
                    ['member', `${terminology.member} (singular)`],
                    ['memberPlural', `${terminology.memberPlural} (plural)`],
                    ['order', `Order label (e.g. ${terminology.order})`],
                  ] as const).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        className="input"
                        value={terminology[key]}
                        onChange={(e) => setTerminology((t) => ({ ...t, [key]: e.target.value }))}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {step.id === 'money' && (
            <Section
              title="Currency, timezone, and tax"
              description="Prices, tax, and timestamps will follow these settings."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Currency">
                  <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Timezone">
                  <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-6">
                <Switch
                  checked={taxEnabled}
                  onChange={setTaxEnabled}
                  label="Enable tax"
                  description="Apply tax to sales. You can configure the rate and mode below."
                />
              </div>

              {taxEnabled && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="label">Tax mode</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <TaxModeCard
                        active={taxMode === 'exclusive'}
                        onClick={() => setTaxMode('exclusive')}
                        title="Exclusive"
                        description="Tax is added on top of the price."
                      />
                      <TaxModeCard
                        active={taxMode === 'inclusive'}
                        onClick={() => setTaxMode('inclusive')}
                        title="Inclusive"
                        description="Price already includes tax."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Default tax rate (%)">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        className="input"
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                      />
                    </Field>
                    <Field label="Tax ID / VAT number (optional)">
                      <input
                        className="input"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="e.g. EU3729102"
                      />
                    </Field>
                  </div>
                </div>
              )}
            </Section>
          )}

          {step.id === 'receipt' && (
            <Section
              title="Configure receipts"
              description="Customize what customers see on printed and emailed receipts."
            >
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,320px]">
                <div className="space-y-4">
                  <Field label="Receipt header">
                    <input className="input" value={receiptHeader} onChange={(e) => setReceiptHeader(e.target.value)} />
                  </Field>
                  <Field label="Receipt footer">
                    <input className="input" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} />
                  </Field>
                  <Switch
                    checked={showLogo}
                    onChange={setShowLogo}
                    label="Show business logo on receipts"
                    description="Logo will appear at the top of every printed receipt."
                  />
                </div>
                <div className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
                  <div className="text-xs font-semibold text-ink-500">Live preview</div>
                  <div className="mt-3 rounded-xl bg-white p-4 font-mono text-[11px] text-ink-700 shadow-soft">
                    <div className="text-center">
                      {showLogo && logo ? (
                        <div className="mx-auto mb-1 h-12 w-20">
                          <img src={logo} alt="" className="h-full w-full object-contain" />
                        </div>
                      ) : null}
                      <div className="font-bold text-ink-900">{name || 'Your business'}</div>
                      <div>{email || '—'}</div>
                      <div>{phone || '—'}</div>
                    </div>
                    <div className="my-2 border-t border-dashed border-ink-200" />
                    <div className="text-center italic text-ink-500">{receiptHeader}</div>
                    <div className="my-2 border-t border-dashed border-ink-200" />
                    <div className="flex justify-between"><span>Subtotal</span><span>0.00 {currency}</span></div>
                    <div className="flex justify-between">
                      <span>
                        Tax{' '}
                        {!taxEnabled
                          ? '(off)'
                          : `(${taxRate}% ${taxMode === 'inclusive' ? 'incl.' : 'excl.'})`}
                      </span>
                      <span>0.00 {currency}</span>
                    </div>
                    <div className="mt-1 flex justify-between font-bold"><span>Total</span><span>0.00 {currency}</span></div>
                    <div className="my-2 border-t border-dashed border-ink-200" />
                    <div className="text-center text-ink-500">{receiptFooter}</div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {step.id === 'categories' && (
            <Section
              title={`${terminology.productPlural} categories`}
              description={`Group your ${terminology.productPlural.toLowerCase()} to keep the POS organized. You can change these anytime.`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {categories.length === 0 && (
                  <div className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-sm text-ink-500">
                    No categories yet — add one below or skip this step.
                  </div>
                )}
                {categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-pill border border-ink-200 bg-white px-3 py-1 text-sm font-medium text-ink-800"
                  >
                    {c}
                    <button
                      onClick={() => removeCategory(c)}
                      className="rounded-full p-0.5 text-ink-400 hover:bg-ink-100 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className="input flex-1"
                  placeholder={`e.g. ${type === 'restaurant' ? 'Combos' : 'New arrival'}`}
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                />
                <button onClick={addCategory} className="btn-secondary">
                  <PlusIcon className="h-4 w-4" /> Add
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-500">
                Suggested for {type}:{' '}
                <button
                  className="font-semibold text-ink-700 hover:text-ink-900"
                  onClick={() => setCategories(DEFAULT_CATEGORIES[type])}
                >
                  use defaults
                </button>
              </p>
            </Section>
          )}

          {step.id === 'payments' && (
            <Section
              title="Payment methods"
              description="Pick the ways your customers can pay. At least one is required."
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {['Cash', 'Card', 'NFC Card', 'Mobile wallet', 'Bank transfer', 'Voucher', 'Cheque'].map((m) => {
                  const on = paymentMethods.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => togglePayment(m)}
                      className={on ? 'radio-card-active' : 'radio-card'}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                          on ? 'border-brand-500 bg-brand-500 text-ink-900' : 'border-ink-300 bg-white'
                        }`}
                      >
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="text-sm font-medium">{m}</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  className="input flex-1"
                  placeholder="Add a custom method…"
                  value={newPayment}
                  onChange={(e) => setNewPayment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPayment())}
                />
                <button onClick={addPayment} className="btn-secondary">
                  <PlusIcon className="h-4 w-4" /> Add
                </button>
              </div>
              {visibleErrors.find((e) => e.field === 'paymentMethods') && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Select at least one payment method.
                </p>
              )}
            </Section>
          )}

          {step.id === 'membership' && (
            <Section
              title="Membership cards"
              description={`Issue NFC cards to your ${terminology.memberPlural.toLowerCase()} for reloadable balances and tier-based discounts.`}
            >
              <Switch
                checked={membershipEnabled}
                onChange={setMembershipEnabled}
                label="Enable membership cards"
                description={`Track ${terminology.memberPlural.toLowerCase()} with reloadable balances and tiers.`}
              />

              {membershipEnabled && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink-900">Membership tiers</div>
                    <button onClick={addTier} className="btn-ghost text-xs">
                      <PlusIcon className="h-3.5 w-3.5" /> Add tier
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tiers.map((t, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr,120px,40px] items-center gap-2 rounded-xl border border-ink-200 bg-white p-3"
                      >
                        <input
                          className="input"
                          value={t.name}
                          onChange={(e) => updateTier(i, { name: e.target.value })}
                          placeholder="Tier name"
                        />
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            className="input pr-7"
                            value={t.discount}
                            onChange={(e) => updateTier(i, { discount: Number(e.target.value) })}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">%</span>
                        </div>
                        <button
                          onClick={() => removeTier(i)}
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove tier"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {step.id === 'finish' && (
            <Section
              title="Review and finish"
              description="Here's a summary of your setup. You can change any of this later in Settings."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SummaryRow label="Business" value={name || '—'} sub={email || undefined} />
                <SummaryRow label="Type" value={BUSINESS_TYPES.find((t) => t.value === type)?.label ?? type} />
                <SummaryRow label="Currency / Timezone" value={`${currency} · ${timezone}`} />
                <SummaryRow
                  label="Tax"
                  value={
                    !taxEnabled
                      ? 'Disabled'
                      : `${taxRate}% ${taxMode === 'inclusive' ? 'inclusive' : 'exclusive'}`
                  }
                />
                <SummaryRow label="Payment methods" value={paymentMethods.join(' · ')} />
                <SummaryRow
                  label="Membership"
                  value={
                    membershipEnabled
                      ? `${tiers.length} tier${tiers.length === 1 ? '' : 's'}`
                      : 'Disabled'
                  }
                  sub={membershipEnabled ? tiers.map((t) => `${t.name} ${t.discount}%`).join(' · ') : undefined}
                />
                <SummaryRow
                  label={terminology.productPlural}
                  value={categories.length ? `${categories.length} categories` : 'No categories'}
                  sub={categories.join(' · ')}
                />
                <SummaryRow
                  label="Terminology"
                  value={`${terminology.product} · ${terminology.member} · ${terminology.unit}`}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-ink-900 p-5 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold text-brand-300">
                  <ChevronsRight className="h-4 w-4" /> You’re all set!
                </div>
                <div className="mt-1 text-lg font-bold">EzSale will open the POS screen next.</div>
                <p className="mt-1 text-sm text-white/70">
                  We’ll add a sample catalog and admin so you can start exploring immediately.
                </p>
              </div>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={goBack} disabled={stepIndex === 0} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {step.optional && stepIndex < STEPS.length - 1 && (
              <button onClick={skip} className="btn-ghost">
                Skip this step
              </button>
            )}
            {stepIndex < STEPS.length - 1 ? (
              <button onClick={goNext} className="btn-primary">
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={finish} className="btn-primary">
                Complete setup <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stepper({ stepIndex, onJump }: { stepIndex: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2">
      {STEPS.map((s, i) => {
        const done = i < stepIndex
        const active = i === stepIndex
        const Icon = s.icon
        return (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(i)}
              aria-current={active ? 'step' : undefined}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                done
                  ? 'bg-brand-500 text-ink-900'
                  : active
                  ? 'bg-ink-900 text-white'
                  : 'bg-white text-ink-500 border border-ink-200'
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </button>
            {active && (
              <div className="min-w-0 max-w-[180px] sm:max-w-[220px]">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                  Step {i + 1}
                </div>
                <div className="truncate text-sm font-semibold text-ink-900">{s.title}</div>
              </div>
            )}
            {i < STEPS.length - 1 && (
              <div
                className={`hidden h-px w-6 shrink-0 sm:block md:w-8 ${done ? 'bg-brand-400' : 'bg-ink-200'}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function TaxModeCard({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button type="button" onClick={onClick} className={active ? 'radio-card-active' : 'radio-card'}>
      <span
        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
          active ? 'border-brand-500 bg-brand-500' : 'border-ink-300 bg-white'
        }`}
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-ink-900">{title}</div>
        <div className="mt-0.5 text-xs text-ink-500">{description}</div>
      </div>
    </button>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-ink-900 sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </div>
  )
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface ValidationFields {
  name: string
  email: string
  type: BusinessType
  paymentMethods: string[]
}

interface ValidationError {
  field: string
  message: string
}

function validateStep(step: StepId, v: ValidationFields): ValidationError[] {
  const errors: ValidationError[] = []
  if (step === 'business') {
    if (!v.name.trim()) errors.push({ field: 'name', message: 'Business name is required.' })
    if (!v.email.trim()) {
      errors.push({ field: 'email', message: 'Contact email is required.' })
    } else if (!/^\S+@\S+\.\S+$/.test(v.email)) {
      errors.push({ field: 'email', message: 'Enter a valid email address.' })
    }
  }
  if (step === 'payments' && v.paymentMethods.length === 0) {
    errors.push({ field: 'paymentMethods', message: 'Select at least one payment method.' })
  }
  return errors
}

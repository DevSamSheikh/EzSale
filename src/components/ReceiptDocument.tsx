import { CreditCard, Mail, MapPin, Store } from 'lucide-react'
import type {
  Business,
  Location,
  Member,
  MembershipCard,
  POSTerminal,
  Transaction,
} from '../types'
import { memberStatusLabel } from '../card-store'

export type ReceiptLayout = 'thermal' | 'standard'

export interface ReceiptContext {
  business: Business
  transaction: Transaction
  /** Optional — filled in when the transaction is linked to a member. */
  member?: Member | null
  /** Optional — membership card charged for the sale. */
  card?: MembershipCard | null
  /** Remaining balance on the card AFTER the charge. */
  cardBalanceAfter?: number
  /** Location & terminal where the sale was rung up. */
  location?: Location | null
  terminal?: POSTerminal | null
  /** Operator display name (resolved from the seeded data). */
  operatorName?: string
}

function formatMoney(n: number, currency: string) {
  return `${currency}${n.toFixed(2)}`
}

function joinAddress(loc: Location | null | undefined) {
  if (!loc) return null
  const parts: string[] = []
  if (loc.address) parts.push(loc.address)
  if (loc.city) parts.push(loc.city)
  if (loc.region) parts.push(loc.region)
  if (loc.country && (!loc.region || loc.country !== loc.region)) parts.push(loc.country)
  return parts.filter(Boolean).join(', ')
}

/**
 * Plain-text rendering of a receipt. Used by the .txt download and the
 * email subject/body fallback. The thermal printer driver and the email
 * body share this representation so what you see is what is sent.
 */
export function receiptToText(ctx: ReceiptContext): string {
  const { business, transaction: t, member, card, cardBalanceAfter, location, terminal, operatorName } = ctx
  const currency = business.currencyDisplay.symbol
  const dash = '--------------------------------'
  const equals = '================================'
  const lines: string[] = []

  lines.push(business.name.toUpperCase())
  const address = joinAddress(location)
  if (address) lines.push(address)
  if (location?.contact?.phone) lines.push('Tel: ' + location.contact.phone)
  if (location?.contact?.email || business.contactEmail) {
    lines.push('Email: ' + (location?.contact?.email || business.contactEmail || ''))
  }
  if (business.tax.taxId) lines.push('Tax ID: ' + business.tax.taxId)
  lines.push(equals)

  lines.push('RECEIPT #' + t.id)
  lines.push('Date : ' + new Date(t.createdAt).toLocaleString())
  lines.push('Cashier: ' + (operatorName || t.operatorEmail))
  if (location) {
    lines.push('Location: ' + location.name + (location.code ? ' (' + location.code + ')' : ''))
  }
  if (terminal) {
    lines.push('Terminal: ' + terminal.name + (terminal.code ? ' (' + terminal.code + ')' : ''))
  }
  lines.push('Method : ' + methodLabel(t.method))
  if (member) {
    lines.push(
      'Customer: ' + member.name + (member.email ? ' <' + member.email + '>' : ''),
    )
    if (member.id) lines.push('Member ID: ' + member.id)
  } else {
    lines.push('Customer: Walk-in')
  }
  if (card) {
    lines.push('Card   : ' + card.cardNumber + ' (' + card.tier + ')')
  }
  lines.push(dash)

  lines.push('ITEMS')
  t.items.forEach((it) => {
    const lineTotal = it.price * it.qty - (it.lineDiscount ?? 0)
    lines.push(
      '  ' +
        it.name.padEnd(20, ' ').slice(0, 20) +
        ' x' +
        String(it.qty).padStart(2, ' ') +
        '  ' +
        formatMoney(lineTotal, currency).padStart(10, ' '),
    )
  })
  lines.push(dash)

  const itemsCount = t.items.reduce((s, i) => s + i.qty, 0)
  lines.push('Items   : ' + itemsCount)
  lines.push('Subtotal: ' + formatMoney(t.subtotal, currency))
  if (t.discount > 0) {
    lines.push('Discount: -' + formatMoney(t.discount, currency))
  }
  if (t.tax > 0) {
    const taxLabel = business.tax.inclusive ? 'Tax (incl.)' : 'Tax'
    lines.push(taxLabel.padEnd(9, ' ') + ': ' + formatMoney(t.tax, currency))
    if (business.tax.taxId) {
      lines.push('  ' + business.tax.taxId)
    }
  }
  lines.push(equals)
  lines.push('TOTAL   : ' + formatMoney(t.total, currency))
  lines.push(equals)

  // Method-specific block
  if (t.method === 'cash' && typeof t.change === 'number') {
    lines.push('Tendered: ' + formatMoney(t.amountTendered ?? t.total, currency))
    lines.push('Change  : ' + formatMoney(t.change, currency))
  } else if (t.method === 'card' || t.method === 'bank' || t.method === 'wallet') {
    if (t.reference) lines.push('Reference: ' + t.reference)
  } else if (t.method === 'membership' && card) {
    const before = card.balance
    const after = typeof cardBalanceAfter === 'number' ? cardBalanceAfter : Math.max(0, before - t.total)
    lines.push('Card balance before: ' + formatMoney(before, currency))
    lines.push('Card balance after : ' + formatMoney(after, currency))
  }

  if (t.note) {
    lines.push(dash)
    lines.push('Note: ' + t.note)
  }

  lines.push(dash)
  lines.push(business.receiptHeader || 'Thanks for your visit!')
  if (business.receiptFooter) lines.push(business.receiptFooter)
  if (business.receipt.showReturnPolicy && business.terminology.order) {
    lines.push('Returns accepted within 14 days with this ' + business.terminology.order.toLowerCase() + '.')
  }
  return lines.join('\n')
}

/** HTML body of a receipt, used for the email body fallback and inline print. */
export function receiptToHtml(ctx: ReceiptContext): string {
  const { business, transaction: t, member, card, cardBalanceAfter, location, terminal, operatorName } = ctx
  const currency = business.currencyDisplay.symbol
  const itemsCount = t.items.reduce((s, i) => s + i.qty, 0)
  const address = joinAddress(location)
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const rows = t.items
    .map(
      (it) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${escape(it.name)}</td>
          <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #eee;">${it.qty}</td>
          <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee;">${formatMoney(it.price, currency)}</td>
          <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee;font-weight:600;">${formatMoney(it.price * it.qty - (it.lineDiscount ?? 0), currency)}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Receipt ${escape(t.id)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#13171c;max-width:640px;margin:0 auto;padding:24px;">
  <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #13171c;">
    <div style="font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">${escape(business.name)}</div>
    ${address ? `<div style="font-size:12px;color:#535b6a;margin-top:2px;">${escape(address)}</div>` : ''}
    ${location?.contact?.phone ? `<div style="font-size:12px;color:#535b6a;">Tel: ${escape(location.contact.phone)}</div>` : ''}
    ${business.contactEmail ? `<div style="font-size:12px;color:#535b6a;">${escape(business.contactEmail)}</div>` : ''}
    ${business.tax.taxId ? `<div style="font-size:11px;color:#7e8694;margin-top:2px;">Tax ID: ${escape(business.tax.taxId)}</div>` : ''}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;padding:16px 0;font-size:12px;">
    <div><strong>Receipt</strong><br/><span style="font-family:monospace;">${escape(t.id)}</span></div>
    <div><strong>Date</strong><br/>${new Date(t.createdAt).toLocaleString()}</div>
    <div><strong>Cashier</strong><br/>${escape(operatorName || t.operatorEmail)}</div>
    <div><strong>Method</strong><br/>${escape(methodLabel(t.method))}</div>
    ${location ? `<div><strong>Location</strong><br/>${escape(location.name)}${location.code ? ` <span style="color:#7e8694;">(${escape(location.code)})</span>` : ''}</div>` : ''}
    ${terminal ? `<div><strong>Terminal</strong><br/>${escape(terminal.name)}${terminal.code ? ` <span style="color:#7e8694;">(${escape(terminal.code)})</span>` : ''}</div>` : ''}
    <div><strong>Customer</strong><br/>${member ? escape(member.name) + (member.email ? `<br/><span style="color:#7e8694;">${escape(member.email)}</span>` : '') : 'Walk-in'}</div>
    ${card ? `<div><strong>Card</strong><br/><span style="font-family:monospace;">${escape(card.cardNumber)}</span> <span style="color:#7e8694;">(${escape(card.tier)})</span></div>` : ''}
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead>
      <tr style="background:#f6f7f8;">
        <th style="padding:8px;text-align:left;">Item</th>
        <th style="padding:8px;text-align:center;width:48px;">Qty</th>
        <th style="padding:8px;text-align:right;width:80px;">Price</th>
        <th style="padding:8px;text-align:right;width:90px;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding:14px 0 0;font-size:13px;">
    <div>Items</div><div style="text-align:right;">${itemsCount}</div>
    <div>Subtotal</div><div style="text-align:right;">${formatMoney(t.subtotal, currency)}</div>
    ${t.discount > 0 ? `<div>Discount</div><div style="text-align:right;color:#be123c;">−${formatMoney(t.discount, currency)}</div>` : ''}
    ${t.tax > 0 ? `<div>${business.tax.inclusive ? 'Tax (incl.)' : 'Tax'}</div><div style="text-align:right;">${formatMoney(t.tax, currency)}</div>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding:10px 0 6px;border-top:2px solid #13171c;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">
    <div>Total</div><div style="text-align:right;">${formatMoney(t.total, currency)}</div>
  </div>

  ${
    t.method === 'cash' && typeof t.change === 'number'
      ? `<div style="display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding-top:8px;font-size:13px;">
          <div>Tendered</div><div style="text-align:right;">${formatMoney(t.amountTendered ?? t.total, currency)}</div>
          <div>Change</div><div style="text-align:right;font-weight:700;">${formatMoney(t.change, currency)}</div>
        </div>`
      : ''
  }
  ${
    t.method === 'card' || t.method === 'bank' || t.method === 'wallet'
      ? t.reference
        ? `<div style="padding-top:8px;font-size:12px;">Reference: <span style="font-family:monospace;">${escape(t.reference)}</span></div>`
        : ''
      : ''
  }
  ${
    t.method === 'membership' && card
      ? `<div style="margin-top:10px;padding:10px 12px;border:1px solid #cce6ff;background:#eff6ff;border-radius:8px;font-size:13px;">
          <div style="font-weight:600;">Membership card</div>
          <div style="color:#535b6a;">Balance before: ${formatMoney(card.balance, currency)}</div>
          <div style="color:#535b6a;">Balance after:  <strong>${formatMoney(typeof cardBalanceAfter === 'number' ? cardBalanceAfter : Math.max(0, card.balance - t.total), currency)}</strong></div>
        </div>`
      : ''
  }
  ${
    t.note
      ? `<div style="margin-top:10px;padding:8px 10px;border:1px dashed #f59e0b;background:#fffbeb;border-radius:8px;font-size:12px;">
          <strong>Note:</strong> ${escape(t.note)}
        </div>`
      : ''
  }

  <div style="margin-top:20px;padding-top:12px;border-top:1px solid #eceef0;font-size:11px;color:#535b6a;text-align:center;">
    ${business.receiptHeader ? `<div>${escape(business.receiptHeader)}</div>` : '<div>Thanks for your visit!</div>'}
    ${business.receiptFooter ? `<div style="margin-top:2px;">${escape(business.receiptFooter)}</div>` : ''}
    ${business.receipt.showReturnPolicy ? `<div style="margin-top:4px;font-style:italic;">Returns accepted within 14 days with this ${escape(business.terminology.order.toLowerCase())}.</div>` : ''}
  </div>
</body></html>`
}

function methodLabel(m: Transaction['method']) {
  switch (m) {
    case 'cash':
      return 'Cash'
    case 'card':
      return 'Card'
    case 'bank':
      return 'Bank Transfer'
    case 'wallet':
      return 'Digital Wallet'
    case 'membership':
      return 'Membership Card'
  }
}

function DashedRule() {
  return (
    <div
      aria-hidden
      className="my-2.5 h-px w-full"
      style={{
        backgroundImage:
          'linear-gradient(to right, currentColor 50%, transparent 50%)',
        backgroundSize: '6px 1px',
        backgroundRepeat: 'repeat-x',
        color: '#d5d8dd',
      }}
    />
  )
}

function SolidRule() {
  return <div aria-hidden className="my-2 h-px w-full bg-ink-900" />
}

function DoubleRule() {
  return (
    <div aria-hidden className="my-2 space-y-[2px]">
      <div className="h-px w-full bg-ink-900" />
      <div className="h-px w-full bg-ink-900" />
    </div>
  )
}

function PaymentMethodPill({ m }: { m: Transaction['method'] }) {
  const map: Record<Transaction['method'], { label: string; cls: string }> = {
    cash: { label: 'Cash', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    card: { label: 'Card', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    bank: { label: 'Bank Transfer', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    wallet: { label: 'Digital Wallet', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    membership: { label: 'Membership Card', cls: 'bg-brand-50 text-ink-900 border-brand-200' },
  }
  const tone = map[m]
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.cls}`}
    >
      {tone.label}
    </span>
  )
}

function StatusPill({ s }: { s: MembershipCard['status'] }) {
  const map: Record<MembershipCard['status'], { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    inactive: { label: 'Inactive', cls: 'bg-ink-100 text-ink-700 border-ink-200' },
    blocked: { label: 'Blocked', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    expired: { label: 'Expired', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    lost: { label: 'Lost', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    replaced: { label: 'Replaced', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  }
  const tone = map[s]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {tone.label}
    </span>
  )
}

function Barcode({ value }: { value: string }) {
  // Deterministic visual "barcode" for the receipt footer.
  const cells = Array.from({ length: 56 }, (_, i) => {
    const ch = value.charCodeAt(i % value.length) + i
    return { on: ch % 3 !== 0, wide: ch % 5 === 0 }
  })
  return (
    <div className="mx-auto flex h-9 items-end justify-center gap-[1px]">
      {cells.map((c, i) => (
        <span
          key={i}
          className="bg-ink-900"
          style={{ width: c.wide ? '2px' : '1px', height: `${55 + (i * 7) % 40}%` }}
        />
      ))}
    </div>
  )
}

/**
 * Renders the receipt itself, in either `thermal` (80mm) or `standard`
 * (US-letter / A4) proportions. The component is presentation-only; the
 * page handles preview / actions around it.
 */
export function ReceiptDocument({
  ctx,
  layout = 'thermal',
}: {
  ctx: ReceiptContext
  layout?: ReceiptLayout
}) {
  const { business, transaction: t, member, card, cardBalanceAfter, location, terminal, operatorName } = ctx
  const currency = business.currencyDisplay.symbol
  const itemsCount = t.items.reduce((s, i) => s + i.qty, 0)
  const taxLabel = business.tax.inclusive ? 'Tax (incl.)' : 'Tax'
  const address = joinAddress(location)
  const created = new Date(t.createdAt)

  if (layout === 'standard') {
    return (
      <div
        id="receipt-standard"
        className="rounded-2xl border border-ink-100 bg-white p-8 shadow-soft print:border-0 print:shadow-none print:p-0"
        style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
      >
        <div className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
          <div>
            <div className="text-2xl font-extrabold uppercase tracking-tight text-ink-900">
              {business.name}
            </div>
            {address && <div className="mt-1 text-xs text-ink-500">{address}</div>}
            {location?.contact?.phone && (
              <div className="text-xs text-ink-500">Tel: {location.contact.phone}</div>
            )}
            {business.contactEmail && (
              <div className="text-xs text-ink-500">{business.contactEmail}</div>
            )}
            {business.tax.taxId && (
              <div className="mt-1 text-[10px] text-ink-400">Tax ID: {business.tax.taxId}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">
              Receipt
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold text-ink-900">{t.id}</div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink-500">
              Date
            </div>
            <div className="mt-0.5 text-xs text-ink-700">{created.toLocaleString()}</div>
            <div className="mt-3 inline-flex flex-wrap justify-end gap-1.5">
              <PaymentMethodPill m={t.method} />
              {card && <StatusPill s={card.status} />}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <Field
            label="Cashier"
            value={operatorName || t.operatorEmail}
            icon={<UserIcon />}
          />
          {location && (
            <Field
              label="Location"
              value={
                <span>
                  {location.name}
                  {location.code && (
                    <span className="ml-1 text-ink-400">({location.code})</span>
                  )}
                </span>
              }
              icon={<MapPin className="h-3 w-3" />}
            />
          )}
          {terminal && (
            <Field
              label="Terminal"
              value={
                <span>
                  {terminal.name}
                  {terminal.code && (
                    <span className="ml-1 text-ink-400">({terminal.code})</span>
                  )}
                </span>
              }
              icon={<Store className="h-3 w-3" />}
            />
          )}
          {member && (
            <Field
              label="Customer"
              value={
                <span>
                  {member.name}
                  {member.email && (
                    <div className="text-[10px] text-ink-500">{member.email}</div>
                  )}
                  {member.phone && (
                    <div className="text-[10px] text-ink-500">{member.phone}</div>
                  )}
                  <div className="mt-0.5 text-[10px] text-ink-500">
                    Status · {memberStatusLabel(member.status)}
                  </div>
                </span>
              }
              icon={<UserIcon />}
            />
          )}
          {card && (
            <Field
              label="Membership card"
              value={
                <span>
                  <span className="font-mono">{card.cardNumber}</span>
                  <div className="text-[10px] text-ink-500">
                    Tier · {card.tier}
                  </div>
                </span>
              }
              icon={<CreditCard className="h-3 w-3" />}
            />
          )}
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-[10px] uppercase tracking-wider text-ink-500">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold w-12">Qty</th>
              <th className="py-2 text-right font-semibold w-20">Price</th>
              <th className="py-2 text-right font-semibold w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {t.items.map((it, idx) => {
              const lineTotal = it.price * it.qty - (it.lineDiscount ?? 0)
              return (
                <tr key={idx} className="border-b border-ink-100">
                  <td className="py-2 align-top">
                    <div className="font-semibold text-ink-900">{it.name}</div>
                    {it.lineDiscount ? (
                      <div className="text-[10px] text-rose-600">
                        Line discount −{formatMoney(it.lineDiscount, currency)}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 text-center align-top text-ink-700">{it.qty}</td>
                  <td className="py-2 text-right align-top text-ink-700">
                    {formatMoney(it.price, currency)}
                  </td>
                  <td className="py-2 text-right align-top font-bold text-ink-900">
                    {formatMoney(lineTotal, currency)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-3 grid grid-cols-1 gap-1 text-sm sm:grid-cols-[1fr,260px] sm:items-end">
          <div className="text-[11px] text-ink-500">
            {itemsCount} item{itemsCount === 1 ? '' : 's'} ·{' '}
            {methodLabel(t.method)}
            {terminal ? ` · ${terminal.code}` : ''}
          </div>
          <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3 text-sm">
            <Row label={`Items (${itemsCount})`} value="" muted />
            <Row label="Subtotal" value={formatMoney(t.subtotal, currency)} />
            {t.discount > 0 && (
              <Row
                label="Discount"
                value={`−${formatMoney(t.discount, currency)}`}
                tone="rose"
              />
            )}
            {t.tax > 0 && (
              <Row label={taxLabel} value={formatMoney(t.tax, currency)} />
            )}
            <div className="mt-1 border-t-2 border-ink-900 pt-1.5" />
            <Row label="TOTAL" value={formatMoney(t.total, currency)} bold />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {t.method === 'cash' && typeof t.change === 'number' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Cash tendered
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Tendered</span>
                <span className="font-mono font-bold">
                  {formatMoney(t.amountTendered ?? t.total, currency)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span>Change returned</span>
                <span className="font-mono font-bold">{formatMoney(t.change, currency)}</span>
              </div>
            </div>
          )}

          {(t.method === 'card' || t.method === 'bank' || t.method === 'wallet') &&
            t.reference && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                <div className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                  {methodLabel(t.method)} reference
                </div>
                <div className="mt-1 font-mono font-bold">{t.reference}</div>
              </div>
            )}

          {t.method === 'membership' && card && (
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-ink-900">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-700">
                Membership card
              </div>
              <div className="mt-1 flex items-center justify-between text-ink-700">
                <span>Card</span>
                <span className="font-mono font-bold">{card.cardNumber}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-ink-700">
                <span>Balance before</span>
                <span className="font-mono">{formatMoney(card.balance, currency)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="font-bold">Balance after</span>
                <span className="font-mono font-extrabold text-emerald-700">
                  {formatMoney(
                    typeof cardBalanceAfter === 'number'
                      ? cardBalanceAfter
                      : Math.max(0, card.balance - t.total),
                    currency,
                  )}
                </span>
              </div>
            </div>
          )}

          {t.note && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Operator note
              </div>
              <p className="mt-1">{t.note}</p>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-ink-100 pt-3 text-center text-[11px] text-ink-500">
          <p>{business.receiptHeader || 'Thanks for your visit!'}</p>
          {business.receiptFooter && <p className="mt-0.5">{business.receiptFooter}</p>}
          {business.receipt.showReturnPolicy && (
            <p className="mt-1 italic text-ink-400">
              Returns accepted within 14 days with this{' '}
              {business.terminology.order.toLowerCase()}.
            </p>
          )}
          <div className="mt-2 flex flex-col items-center gap-1">
            <Barcode value={t.id} />
            <div className="font-mono text-[10px] tracking-widest text-ink-700">
              *{t.id}*
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---- Thermal layout (default) ----------------------------------------
  return (
    <div
      id="thermal-receipt"
      className="mx-auto w-full max-w-[360px] rounded-2xl border border-ink-100 bg-white p-5 shadow-soft print:max-w-none print:rounded-none print:border-0 print:shadow-none print:p-0"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="text-center">
        <div className="text-base font-extrabold uppercase tracking-wide text-ink-900">
          {business.name}
        </div>
        {address && <div className="mt-0.5 text-[11px] text-ink-500">{address}</div>}
        {location?.contact?.phone && (
          <div className="text-[11px] text-ink-500">Tel: {location.contact.phone}</div>
        )}
        {business.contactEmail && (
          <div className="text-[11px] text-ink-500">{business.contactEmail}</div>
        )}
        {business.tax.taxId && (
          <div className="text-[10px] text-ink-400">Tax ID: {business.tax.taxId}</div>
        )}
      </div>

      <DashedRule />

      <div className="flex items-center justify-between text-[11px] text-ink-600">
        <span>Receipt</span>
        <span className="font-mono">{t.id}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
        <span>Date</span>
        <span>
          {created.toLocaleDateString()} {created.toLocaleTimeString()}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
        <span>Cashier</span>
        <span>{operatorName || t.operatorEmail.split('@')[0]}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
        <span>Method</span>
        <span>{methodLabel(t.method)}</span>
      </div>
      {location && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-ink-600">
          <span>Location</span>
          <span>
            {location.name}
            {terminal ? ` · ${terminal.code}` : ''}
          </span>
        </div>
      )}
      {member && (
        <div className="mt-1 flex items-start justify-between text-[11px] text-ink-600">
          <span>Customer</span>
          <span className="text-right">
            <div className="font-semibold text-ink-800">{member.name}</div>
            {member.email && <div className="text-[10px] text-ink-500">{member.email}</div>}
          </span>
        </div>
      )}

      <DashedRule />

      <div className="space-y-1.5">
        <div className="flex text-[11px] font-bold uppercase tracking-wide text-ink-700">
          <span className="flex-1">Item</span>
          <span className="w-12 text-right">Qty</span>
          <span className="w-16 text-right">Total</span>
        </div>
        {t.items.map((it, idx) => {
          const lineTotal = it.price * it.qty - (it.lineDiscount ?? 0)
          return (
            <div key={idx} className="text-[11px] text-ink-800">
              <div className="truncate font-semibold">{it.name}</div>
              <div className="mt-0.5 flex text-ink-500">
                <span className="flex-1 truncate">{formatMoney(it.price, currency)} each</span>
                <span className="w-12 text-right">×{it.qty}</span>
                <span className="w-16 text-right font-semibold text-ink-900">
                  {formatMoney(lineTotal, currency)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <DashedRule />

      <div className="space-y-1 text-[12px]">
        <Row label={`Items (${itemsCount})`} value="" muted />
        <Row label="Subtotal" value={formatMoney(t.subtotal, currency)} />
        {t.discount > 0 && (
          <Row
            label="Discount"
            value={`−${formatMoney(t.discount, currency)}`}
            tone="rose"
          />
        )}
        {t.tax > 0 && <Row label={taxLabel} value={formatMoney(t.tax, currency)} />}
        <div className="pt-1">
          <DoubleRule />
          <Row label="TOTAL" value={formatMoney(t.total, currency)} bold />
        </div>
        {t.method === 'cash' && typeof t.change === 'number' && (
          <>
            <Row
              label="Tendered"
              value={formatMoney(t.amountTendered ?? t.total, currency)}
            />
            <Row
              label="Change"
              value={formatMoney(t.change, currency)}
              tone="emerald"
              bold
            />
          </>
        )}
        {t.method === 'membership' && card && (
          <>
            <Row label="Card" value={card.cardNumber} mono />
            <Row
              label="Balance before"
              value={formatMoney(card.balance, currency)}
            />
            <Row
              label="Balance after"
              value={formatMoney(
                typeof cardBalanceAfter === 'number'
                  ? cardBalanceAfter
                  : Math.max(0, card.balance - t.total),
                currency,
              )}
              tone="emerald"
              bold
            />
          </>
        )}
        {t.method !== 'membership' && t.reference && (
          <Row label="Reference" value={t.reference} mono />
        )}
      </div>

      {t.note && (
        <>
          <DashedRule />
          <div className="text-[11px] text-ink-600">
            <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Note
            </div>
            <p className="mt-0.5">{t.note}</p>
          </div>
        </>
      )}

      <DashedRule />

      <div className="flex flex-col items-center gap-1">
        <Barcode value={t.id} />
        <div className="font-mono text-[10px] tracking-widest text-ink-700">*{t.id}*</div>
      </div>

      <DashedRule />

      <div className="text-center text-[11px] text-ink-500">
        <p>{business.receiptHeader || 'Thanks for your visiting!'}</p>
        {business.receiptFooter && <p className="mt-0.5">{business.receiptFooter}</p>}
        {business.receipt.showReturnPolicy && (
          <p className="mt-1 italic text-ink-400">
            Returns accepted within 14 days with this{' '}
            {business.terminology.order.toLowerCase()}.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  tone,
  muted,
  mono,
}: {
  label: string
  value: string
  bold?: boolean
  tone?: 'rose' | 'emerald'
  muted?: boolean
  mono?: boolean
}) {
  const toneCls =
    tone === 'rose'
      ? 'text-rose-600'
      : tone === 'emerald'
      ? 'text-emerald-700'
      : bold
      ? 'text-ink-900'
      : 'text-ink-700'
  return (
    <div
      className={`flex items-center justify-between ${
        bold
          ? 'text-[14px] font-extrabold uppercase tracking-wide'
          : muted
          ? 'text-[10px] uppercase tracking-wide text-ink-500'
          : ''
      } ${toneCls}`}
    >
      <span>{label}</span>
      {value !== '' && (
        <span className={`${mono ? 'font-mono' : 'font-mono'}`}>{value}</span>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-ink-100 bg-white p-2.5">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-50 text-ink-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
          {label}
        </div>
        <div className="text-xs font-semibold text-ink-900">{value}</div>
      </div>
    </div>
  )
}

function UserIcon() {
  // Tiny inline replacement to avoid pulling another lucide-react import
  // into the receipt bundle path.
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20c1.6-3.6 4.6-5.4 8-5.4s6.4 1.8 8 5.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

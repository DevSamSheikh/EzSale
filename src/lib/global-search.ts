import { getProducts } from '../pos-store'
import { getMembers, getCard, getCards, maskCardNumber } from '../card-store'
import { getTransactions, paymentMethodLabel } from '../payment-store'
import type {
  CardDeposit,
  Member,
  MembershipCard,
  PaymentMethod,
  Transaction,
} from '../types'

export type GroupId =
  | 'products'
  | 'orders'
  | 'users'
  | 'cards'
  | 'deposits'
  | 'transactions'

export interface SearchHit {
  id: string
  title: string
  subtitle?: string
  meta?: string
  href: string
  badge?: string
  badgeTone?: 'emerald' | 'rose' | 'amber' | 'ink' | 'brand' | 'indigo'
  iconKind?: 'product' | 'order' | 'user' | 'card' | 'deposit' | 'txn'
}

export interface SearchGroup {
  id: GroupId
  label: string
  count: number
  allHref: string
  items: SearchHit[]
}

export interface SearchResults {
  query: string
  total: number
  groups: SearchGroup[]
}

const MAX_PER_GROUP = 5

function normalize(s: string) {
  return s.trim().toLowerCase()
}

function readDeposits(): CardDeposit[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('ezsale:card-deposits') ?? '[]') as CardDeposit[]
  } catch {
    return []
  }
}

function matchScore(hay: string, q: string): number {
  const h = hay.toLowerCase()
  const i = h.indexOf(q)
  if (i < 0) return -1
  if (i === 0) return 100
  return 50 - i
}

function memberName(m: Member) {
  return m.name
}

function productMatch(p: ReturnType<typeof getProducts>[number], q: string): number {
  return Math.max(
    matchScore(p.name, q),
    matchScore(p.description ?? '', q),
    matchScore(p.category, q),
    matchScore(p.id, q),
  )
}

function memberMatch(m: Member, q: string, cards: MembershipCard[]): number {
  const tier = getMemberTier(m.id, cards)
  return Math.max(
    matchScore(memberName(m), q),
    matchScore(m.email ?? '', q),
    matchScore(m.phone ?? '', q),
    matchScore(m.id, q),
    matchScore(tier, q),
    matchScore(m.type, q),
    matchScore(m.status, q),
    matchScore(m.notes ?? '', q),
  )
}

function getMemberTier(memberId: string, cards: MembershipCard[]): string {
  const own = cards.filter((c) => c.memberId === memberId)
  const primary = own.find((c) => c.status !== 'replaced') ?? own[0]
  return primary?.tier ?? 'Bronze'
}

function cardMatch(c: MembershipCard, q: string): number {
  return Math.max(
    matchScore(c.cardNumber, q),
    matchScore(c.nfcUid ?? '', q),
    matchScore(c.id, q),
    matchScore(c.type, q),
    matchScore(c.status, q),
  )
}

function txnMatch(t: Transaction, q: string): number {
  const itemHay = t.items.map((i) => `${i.name} ${i.productId}`).join(' ')
  return Math.max(
    matchScore(t.id, q),
    matchScore(itemHay, q),
    matchScore(t.operatorEmail, q),
    matchScore(paymentMethodLabel(t.method), q),
    matchScore(t.status, q),
    matchScore(t.reference ?? '', q),
    matchScore(String(t.total), q),
  )
}

function depositMatch(
  d: CardDeposit,
  card: MembershipCard | null,
  member: Member | null,
  q: string,
): number {
  return Math.max(
    matchScore(d.id, q),
    matchScore(d.reference ?? '', q),
    matchScore(d.note ?? '', q),
    matchScore(paymentMethodLabel(d.method as PaymentMethod), q),
    matchScore(String(d.amount), q),
    matchScore(card?.cardNumber ?? '', q),
    matchScore(card?.nfcUid ?? '', q),
    matchScore(member?.name ?? '', q),
    matchScore(member?.email ?? '', q),
  )
}

function orderFromTxn(t: Transaction): SearchHit {
  const itemCount = t.items.reduce((s, i) => s + i.qty, 0)
  const firstItem = t.items[0]?.name
  const more = t.items.length > 1 ? `, +${t.items.length - 1} more` : ''
  return {
    id: t.id,
    title: `Order ${t.id}`,
    subtitle: firstItem ? `${firstItem}${more}` : `${itemCount} item${itemCount === 1 ? '' : 's'}`,
    meta: `$${t.total.toFixed(2)} · ${paymentMethodLabel(t.method)}`,
    href: `/app/transactions?order=${encodeURIComponent(t.id)}`,
    badge: t.status,
    badgeTone:
      t.status === 'completed'
        ? 'emerald'
        : t.status === 'refunded'
        ? 'rose'
        : t.status === 'pending'
        ? 'amber'
        : 'ink',
    iconKind: 'order',
  }
}

function pickTop<T>(arr: T[], score: (t: T) => number, q: string, max: number): T[] {
  return arr
    .map((t) => ({ t, s: score(t) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .map((x) => x.t)
}

function memberStatusTone(s: Member['status']): SearchHit['badgeTone'] {
  if (s === 'active') return 'emerald'
  if (s === 'suspended') return 'rose'
  return 'ink'
}

function cardStatusTone(s: MembershipCard['status']): SearchHit['badgeTone'] {
  if (s === 'active') return 'emerald'
  if (s === 'blocked') return 'rose'
  if (s === 'expired' || s === 'lost') return 'amber'
  if (s === 'replaced') return 'indigo'
  return 'ink'
}

export function globalSearch(rawQuery: string): SearchResults {
  const q = normalize(rawQuery)
  if (!q) return { query: '', total: 0, groups: [] }

  const products = getProducts()
  const members = getMembers()
  const cards = getCards()
  const txns = getTransactions()
  const deposits = readDeposits()

  const productHits: SearchHit[] = pickTop(products, (p) => productMatch(p, q), q, MAX_PER_GROUP).map(
    (p) => ({
      id: p.id,
      title: p.name,
      subtitle: p.description,
      meta: `$${p.price.toFixed(2)} · ${p.category}`,
      href: `/app/products?q=${encodeURIComponent(q)}`,
      iconKind: 'product',
    }),
  )

  const userHits: SearchHit[] = pickTop(members, (m) => memberMatch(m, q, cards), q, MAX_PER_GROUP).map(
    (m) => ({
      id: m.id,
      title: memberName(m),
      subtitle: m.email ?? m.phone ?? m.id,
      meta: `${getMemberTier(m.id, cards)} · ${m.type}`,
      href: `/app/users/${m.id}`,
      badge: m.status,
      badgeTone: memberStatusTone(m.status),
      iconKind: 'user',
    }),
  )

  const cardHits: SearchHit[] = pickTop(cards, (c) => cardMatch(c, q), q, MAX_PER_GROUP).map(
    (c) => {
      const m = c.memberId ? members.find((x) => x.id === c.memberId) : null
      return {
        id: c.id,
        title: c.cardNumber,
        subtitle: m ? `Assigned to ${m.name}` : c.nfcUid ? `UID ${c.nfcUid}` : 'Unassigned',
        meta: `${maskCardNumber(c.cardNumber)} · ${c.type}`,
        href: `/app/cards/${c.id}`,
        badge: c.status,
        badgeTone: cardStatusTone(c.status),
        iconKind: 'card',
      }
    },
  )

  const txnHits: SearchHit[] = pickTop(txns, (t) => txnMatch(t, q), q, MAX_PER_GROUP).map((t) =>
    orderFromTxn(t),
  )

  const depositHits: SearchHit[] = pickTop(
    deposits,
    (d) => {
      const card = getCard(d.cardId)
      const member = card ? members.find((m) => m.id === card.memberId) ?? null : null
      return depositMatch(d, card, member, q)
    },
    q,
    MAX_PER_GROUP,
  ).map((d) => {
    const card = getCard(d.cardId)
    const member = card?.memberId ? members.find((m) => m.id === card.memberId) : null
    return {
      id: d.id,
      title: `Deposit ${maskCardNumber(card?.cardNumber ?? '••••')}`,
      subtitle: member ? `From ${member.name}` : d.note ?? d.reference ?? 'Top-up',
      meta: `+$${d.amount.toFixed(2)} · ${paymentMethodLabel(d.method as PaymentMethod)}`,
      href: card ? `/app/cards/${card.id}` : '/app/deposit-requests',
      badge: d.method,
      badgeTone: 'brand',
      iconKind: 'deposit',
    }
  })

  // Withdraws: membership-card usage transactions (a "withdraw" from the card balance).
  const withdrawHits: SearchHit[] = pickTop(
    txns.filter((t) => t.method === 'membership' && t.cardId),
    (t) => txnMatch(t, q),
    q,
    MAX_PER_GROUP,
  ).map((t) => {
    const card = t.cardId ? cards.find((c) => c.id === t.cardId) : null
    const member = t.memberId ? members.find((m) => m.id === t.memberId) : null
    return {
      id: `w-${t.id}`,
      title: `Withdraw ${maskCardNumber(card?.cardNumber ?? '••••')}`,
      subtitle: member ? `${member.name} · ${t.items[0]?.name ?? 'POS purchase'}` : t.items[0]?.name ?? 'POS purchase',
      meta: `−$${t.total.toFixed(2)} · ${paymentMethodLabel(t.method)}`,
      href: card ? `/app/cards/${card.id}` : '/app/transactions',
      badge: t.status,
      badgeTone: t.status === 'refunded' ? 'rose' : 'ink',
      iconKind: 'txn',
    }
  })

  const groups: SearchGroup[] = []
  groups.push({
    id: 'products',
    label: 'Products',
    count: productHits.length,
    allHref: `/app/products?q=${encodeURIComponent(q)}`,
    items: productHits,
  })
  groups.push({
    id: 'orders',
    label: 'Orders',
    count: txnHits.length,
    allHref: `/app/orders?q=${encodeURIComponent(q)}`,
    items: txnHits,
  })
  groups.push({
    id: 'users',
    label: 'Members',
    count: userHits.length,
    allHref: `/app/users?q=${encodeURIComponent(q)}`,
    items: userHits,
  })
  groups.push({
    id: 'cards',
    label: 'Cards',
    count: cardHits.length,
    allHref: `/app/cards?q=${encodeURIComponent(q)}`,
    items: cardHits,
  })
  groups.push({
    id: 'deposits',
    label: 'Deposits',
    count: depositHits.length,
    allHref: `/app/deposit-requests?q=${encodeURIComponent(q)}`,
    items: depositHits,
  })
  groups.push({
    id: 'transactions',
    label: 'Withdraws',
    count: withdrawHits.length,
    allHref: `/app/transactions?q=${encodeURIComponent(q)}`,
    items: withdrawHits,
  })

  const filtered = groups.filter((g) => g.count > 0)

  const total = filtered.reduce((s, g) => s + g.count, 0)
  return { query: q, total, groups: filtered }
}

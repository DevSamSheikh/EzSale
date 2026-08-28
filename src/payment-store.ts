import type {
  Member,
  MembershipCard,
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from './types'

const KEY_MEMBERS = 'ezsale:members'
const KEY_CARDS = 'ezsale:cards'
const KEY_TXNS = 'ezsale:transactions'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const SAMPLE_MEMBERS: Member[] = [
  {
    id: 'm1',
    businessId: 'preview',
    name: 'Sara Khan',
    email: 'sara.khan@example.com',
    phone: '+1 555 0142',
    tier: 'Gold',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  {
    id: 'm2',
    businessId: 'preview',
    name: 'Adil Raza',
    email: 'adil.raza@example.com',
    phone: '+1 555 0188',
    tier: 'Silver',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'm3',
    businessId: 'preview',
    name: 'Maya Singh',
    email: 'maya.singh@example.com',
    phone: '+1 555 0211',
    tier: 'Bronze',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'm4',
    businessId: 'preview',
    name: 'Daniel Park',
    email: 'daniel.park@example.com',
    phone: '+1 555 0298',
    tier: 'Gold',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 220).toISOString(),
  },
]

const SAMPLE_CARDS: MembershipCard[] = [
  {
    id: 'c1',
    businessId: 'preview',
    memberId: 'm1',
    cardNumber: 'EZ-1000-4521',
    status: 'active',
    balance: 250,
    dailyLimit: 500,
    monthlyLimit: 5000,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  {
    id: 'c2',
    businessId: 'preview',
    memberId: 'm2',
    cardNumber: 'EZ-1000-7820',
    status: 'active',
    balance: 45,
    dailyLimit: 200,
    monthlyLimit: 2000,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200).toISOString(),
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
  },
  {
    id: 'c3',
    businessId: 'preview',
    memberId: 'm3',
    cardNumber: 'EZ-1000-9100',
    status: 'blocked',
    balance: 120,
    dailyLimit: 150,
    monthlyLimit: 1500,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'c4',
    businessId: 'preview',
    memberId: 'm4',
    cardNumber: 'EZ-1000-3356',
    status: 'expired',
    balance: 300,
    dailyLimit: 800,
    monthlyLimit: 8000,
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400).toISOString(),
  },
]

function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(KEY_MEMBERS)) {
    localStorage.setItem(KEY_MEMBERS, JSON.stringify(SAMPLE_MEMBERS))
  }
  if (!localStorage.getItem(KEY_CARDS)) {
    localStorage.setItem(KEY_CARDS, JSON.stringify(SAMPLE_CARDS))
  }
}

export function getMembers(): Member[] {
  if (typeof window === 'undefined') return SAMPLE_MEMBERS
  ensureSeeded()
  return safeParse<Member[]>(localStorage.getItem(KEY_MEMBERS), SAMPLE_MEMBERS)
}

export function getCards(): MembershipCard[] {
  if (typeof window === 'undefined') return SAMPLE_CARDS
  ensureSeeded()
  return safeParse<MembershipCard[]>(localStorage.getItem(KEY_CARDS), SAMPLE_CARDS)
}

export function getCardByNumber(num: string): { card: MembershipCard; member: Member } | null {
  const trimmed = num.trim().toUpperCase()
  if (!trimmed) return null
  const cards = getCards()
  const members = getMembers()
  const card = cards.find((c) => c.cardNumber.toUpperCase() === trimmed)
  if (!card) return null
  const member = members.find((m) => m.id === card.memberId)
  if (!member) return null
  return { card, member }
}

export function getMember(memberId: string): Member | null {
  return getMembers().find((m) => m.id === memberId) ?? null
}

export function getCard(cardId: string): MembershipCard | null {
  return getCards().find((c) => c.id === cardId) ?? null
}

export function chargeCard(cardId: string, amount: number): MembershipCard | null {
  const cards = getCards()
  const idx = cards.findIndex((c) => c.id === cardId)
  if (idx < 0) return null
  const next: MembershipCard = { ...cards[idx], balance: Math.max(0, cards[idx].balance - amount) }
  cards[idx] = next
  localStorage.setItem(KEY_CARDS, JSON.stringify(cards))
  return next
}

export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return []
  return safeParse<Transaction[]>(localStorage.getItem(KEY_TXNS), [])
}

export function createTransaction(input: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const txn: Transaction = {
    ...input,
    id: `EZ-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
  }
  const all = getTransactions()
  all.unshift(txn)
  localStorage.setItem(KEY_TXNS, JSON.stringify(all))
  return txn
}

export function setTransactionStatus(id: string, status: TransactionStatus) {
  const all = getTransactions()
  const idx = all.findIndex((t) => t.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], status }
  localStorage.setItem(KEY_TXNS, JSON.stringify(all))
}

export function isCardUsable(card: MembershipCard): { ok: boolean; reason?: string } {
  if (card.status === 'blocked') return { ok: false, reason: 'Card is blocked. Contact manager.' }
  if (card.status === 'inactive') return { ok: false, reason: 'Card is inactive.' }
  if (card.status === 'expired' || new Date(card.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'Card has expired.' }
  }
  return { ok: true }
}

export function formatCardNumber(input: string) {
  return input.replace(/[^A-Z0-9-]/gi, '').toUpperCase()
}

export function paymentMethodLabel(m: PaymentMethod) {
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
    default:
      return m
  }
}

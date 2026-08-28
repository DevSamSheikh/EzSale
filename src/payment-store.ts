import type {
  MembershipCard,
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from './types'

export {
  getCards,
  getCard,
  getCardsByMember,
  getCardByNumber,
  getMembers,
  getMember,
  cardStatusLabel,
  cardTypeLabel,
  isCardUsable,
  maskCardNumber,
  formatCardNumber,
  chargeCard,
} from './card-store'

export type { Member } from './types'

const KEY_TXNS = 'ezsale:transactions'

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
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
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_TXNS, JSON.stringify(all))
    try {
      const cardsRaw = localStorage.getItem('ezsale:cards')
      if (cardsRaw && txn.cardId) {
        const cards = JSON.parse(cardsRaw) as MembershipCard[]
        const idx = cards.findIndex((c) => c.id === txn.cardId)
        if (idx >= 0) {
          cards[idx] = {
            ...cards[idx],
            lastTransactionAt: txn.createdAt,
            lastTransactionId: txn.id,
          }
          localStorage.setItem('ezsale:cards', JSON.stringify(cards))
        }
      }
    } catch {
      /* ignore */
    }
  }
  return txn
}

export function setTransactionStatus(id: string, status: TransactionStatus) {
  const all = getTransactions()
  const idx = all.findIndex((t) => t.id === id)
  if (idx < 0) return
  all[idx] = { ...all[idx], status }
  localStorage.setItem(KEY_TXNS, JSON.stringify(all))
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

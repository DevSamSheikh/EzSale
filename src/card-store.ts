import type {
  CardActivity,
  CardDeposit,
  Member,
  MemberActivity,
  MembershipCard,
  MembershipCardStatus,
  MembershipCardType,
  Transaction,
} from './types'
import { getTransactions } from './payment-store'

const KEY_MEMBERS = 'ezsale:members'
const KEY_CARDS = 'ezsale:cards'
const KEY_ACTIVITY = 'ezsale:card-activity'
const KEY_DEPOSITS = 'ezsale:card-deposits'
const KEY_MEMBER_ACTIVITY = 'ezsale:member-activity'

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
    type: 'individual',
    status: 'active',
    avatarColor: '#84eb0a',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'm2',
    businessId: 'preview',
    name: 'Adil Raza',
    email: 'adil.raza@example.com',
    phone: '+1 555 0188',
    tier: 'Silver',
    type: 'individual',
    status: 'active',
    avatarColor: '#6cc800',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: 'm3',
    businessId: 'preview',
    name: 'Maya Singh',
    email: 'maya.singh@example.com',
    phone: '+1 555 0211',
    tier: 'Bronze',
    type: 'individual',
    status: 'active',
    avatarColor: '#559c00',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'm4',
    businessId: 'preview',
    name: 'Daniel Park',
    email: 'daniel.park@example.com',
    phone: '+1 555 0298',
    tier: 'Gold',
    type: 'individual',
    status: 'inactive',
    avatarColor: '#437800',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 220).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'm5',
    businessId: 'preview',
    name: 'Fatima Hussain',
    email: 'fatima.h@example.com',
    phone: '+1 555 0320',
    tier: 'Silver',
    type: 'corporate',
    status: 'active',
    avatarColor: '#84eb0a',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'm6',
    businessId: 'preview',
    name: 'Junaid Khan',
    email: 'junaid.k@example.com',
    phone: '+1 555 0344',
    tier: 'Gold',
    type: 'corporate',
    status: 'active',
    avatarColor: '#6cc800',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: 'm7',
    businessId: 'preview',
    name: 'Aisha Mehta',
    email: 'aisha.m@example.com',
    phone: '+1 555 0367',
    tier: 'Bronze',
    type: 'individual',
    status: 'suspended',
    avatarColor: '#3a414d',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 320).toISOString(),
    notes: 'Suspended for non-payment.',
  },
  {
    id: 'm8',
    businessId: 'preview',
    name: 'Hassan Ali',
    email: 'hassan.ali@example.com',
    phone: '+1 555 0389',
    tier: 'Silver',
    type: 'staff',
    status: 'active',
    avatarColor: '#84eb0a',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'm9',
    businessId: 'preview',
    name: 'Priya Sharma',
    email: 'priya.s@example.com',
    phone: '+1 555 0412',
    tier: 'Bronze',
    type: 'individual',
    status: 'active',
    avatarColor: '#6cc800',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'm10',
    businessId: 'preview',
    name: 'Omar Faruk',
    email: 'omar.f@example.com',
    phone: '+1 555 0435',
    tier: 'Gold',
    type: 'corporate',
    status: 'active',
    avatarColor: '#559c00',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65).toISOString(),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'm11',
    businessId: 'preview',
    name: 'Zara Iqbal',
    email: 'zara.iqbal@example.com',
    phone: '+1 555 0451',
    tier: 'Silver',
    type: 'individual',
    status: 'inactive',
    avatarColor: '#437800',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400).toISOString(),
  },
  {
    id: 'm12',
    businessId: 'preview',
    name: 'Liam Chen',
    email: 'liam.chen@example.com',
    phone: '+1 555 0478',
    tier: 'Bronze',
    type: 'individual',
    status: 'active',
    avatarColor: '#84eb0a',
    joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
]

const now = Date.now()
const day = 1000 * 60 * 60 * 24

const SAMPLE_CARDS: MembershipCard[] = [
  {
    id: 'c1',
    businessId: 'preview',
    memberId: 'm1',
    cardNumber: 'EZ-1000-4521',
    nfcUid: '04:A3:BC:11:80:5F:90',
    type: 'nfc',
    status: 'active',
    balance: 250,
    dailyLimit: 500,
    monthlyLimit: 5000,
    issuedAt: new Date(now - day * 90).toISOString(),
    expiresAt: new Date(now + day * 365).toISOString(),
    lastTransactionAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'c2',
    businessId: 'preview',
    memberId: 'm2',
    cardNumber: 'EZ-1000-7820',
    nfcUid: '04:7C:1A:2D:33:9E:01',
    type: 'nfc',
    status: 'active',
    balance: 45,
    dailyLimit: 200,
    monthlyLimit: 2000,
    issuedAt: new Date(now - day * 60).toISOString(),
    expiresAt: new Date(now + day * 200).toISOString(),
    lastTransactionAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: 'c3',
    businessId: 'preview',
    memberId: 'm3',
    cardNumber: 'EZ-1000-9100',
    nfcUid: '04:11:22:33:44:55:66',
    type: 'standard',
    status: 'blocked',
    balance: 120,
    dailyLimit: 150,
    monthlyLimit: 1500,
    issuedAt: new Date(now - day * 30).toISOString(),
    expiresAt: new Date(now + day * 30).toISOString(),
  },
  {
    id: 'c4',
    businessId: 'preview',
    memberId: 'm4',
    cardNumber: 'EZ-1000-3356',
    nfcUid: '04:AA:BB:CC:DD:EE:FF',
    type: 'nfc',
    status: 'expired',
    balance: 300,
    dailyLimit: 800,
    monthlyLimit: 8000,
    issuedAt: new Date(now - day * 400).toISOString(),
    expiresAt: new Date(now - day * 5).toISOString(),
    lastTransactionAt: new Date(now - day * 7).toISOString(),
  },
  {
    id: 'c5',
    businessId: 'preview',
    memberId: 'm5',
    cardNumber: 'EZ-1000-1100',
    nfcUid: '04:9F:8E:7D:6C:5B:4A',
    type: 'virtual',
    status: 'inactive',
    balance: 0,
    dailyLimit: 100,
    monthlyLimit: 1000,
    issuedAt: new Date(now - day * 12).toISOString(),
    expiresAt: new Date(now + day * 350).toISOString(),
  },
  {
    id: 'c6',
    businessId: 'preview',
    memberId: 'm6',
    cardNumber: 'EZ-1000-2200',
    nfcUid: '04:12:34:56:78:9A:BC',
    type: 'corporate',
    status: 'lost',
    balance: 800,
    dailyLimit: 1500,
    monthlyLimit: 15000,
    issuedAt: new Date(now - day * 170).toISOString(),
    expiresAt: new Date(now + day * 195).toISOString(),
    lastTransactionAt: new Date(now - day * 3).toISOString(),
  },
  {
    id: 'c7',
    businessId: 'preview',
    memberId: 'm6',
    cardNumber: 'EZ-1000-2201',
    nfcUid: '04:FE:DC:BA:98:76:54',
    type: 'nfc',
    status: 'active',
    balance: 800,
    dailyLimit: 1500,
    monthlyLimit: 15000,
    issuedAt: new Date(now - day * 4).toISOString(),
    expiresAt: new Date(now + day * 361).toISOString(),
    lastTransactionAt: new Date(now - day * 1).toISOString(),
  },
]

const SAMPLE_ACTIVITY: CardActivity[] = [
  {
    id: 'a1',
    cardId: 'c1',
    type: 'created',
    description: 'Card issued and assigned to Sara Khan.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 90).toISOString(),
  },
  {
    id: 'a2',
    cardId: 'c1',
    type: 'deposit',
    description: 'Top-up at counter',
    amount: 200,
    by: 'admin@ezsale.app',
    at: new Date(now - day * 30).toISOString(),
  },
  {
    id: 'a3',
    cardId: 'c1',
    type: 'transaction',
    description: 'POS purchase — order #EZ-1042',
    amount: -120,
    at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'a4',
    cardId: 'c2',
    type: 'created',
    description: 'Card issued to Adil Raza.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 60).toISOString(),
  },
  {
    id: 'a5',
    cardId: 'c3',
    type: 'blocked',
    description: 'Card blocked due to reported fraud.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 5).toISOString(),
  },
  {
    id: 'a6',
    cardId: 'c6',
    type: 'lost',
    description: 'Card reported lost by Junaid Khan.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 4).toISOString(),
  },
  {
    id: 'a7',
    cardId: 'c6',
    type: 'replaced',
    description: 'Card replaced — new card #EZ-1000-2201 issued.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 4 + 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'a8',
    cardId: 'c7',
    type: 'created',
    description: 'Replacement card issued to Junaid Khan (replaces #EZ-1000-2200).',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 4 + 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'a9',
    cardId: 'c5',
    type: 'deactivated',
    description: 'Card deactivated — pending reactivation.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 6).toISOString(),
  },
]

const SAMPLE_MEMBER_ACTIVITY: MemberActivity[] = [
  {
    id: 'ma1',
    memberId: 'm1',
    type: 'created',
    description: 'Account created.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 90).toISOString(),
  },
  {
    id: 'ma2',
    memberId: 'm1',
    type: 'card_assigned',
    description: 'Card #EZ-1000-4521 assigned.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 90 + 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'ma3',
    memberId: 'm1',
    type: 'login',
    description: 'Signed in to the app.',
    at: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'ma4',
    memberId: 'm3',
    type: 'suspended',
    description: 'Account suspended for review.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 5).toISOString(),
  },
  {
    id: 'ma5',
    memberId: 'm5',
    type: 'updated',
    description: 'Tier updated to Silver.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 14).toISOString(),
  },
  {
    id: 'ma6',
    memberId: 'm8',
    type: 'card_assigned',
    description: 'Card #EZ-1000-7700 assigned.',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 20).toISOString(),
  },
]

const SAMPLE_DEPOSITS: CardDeposit[] = [
  {
    id: 'd1',
    cardId: 'c1',
    amount: 200,
    method: 'cash',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 30).toISOString(),
    note: 'Counter top-up',
  },
  {
    id: 'd2',
    cardId: 'c1',
    amount: 50,
    method: 'card',
    reference: 'AUTH-91823',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 12).toISOString(),
  },
  {
    id: 'd3',
    cardId: 'c2',
    amount: 100,
    method: 'cash',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 45).toISOString(),
  },
  {
    id: 'd4',
    cardId: 'c6',
    amount: 800,
    method: 'bank',
    reference: 'UTR-3392',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 90).toISOString(),
  },
  {
    id: 'd5',
    cardId: 'c7',
    amount: 800,
    method: 'bank',
    reference: 'UTR-3392',
    by: 'admin@ezsale.app',
    at: new Date(now - day * 4 + 1000 * 60 * 60).toISOString(),
    note: 'Balance transfer from previous card',
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
  if (!localStorage.getItem(KEY_ACTIVITY)) {
    localStorage.setItem(KEY_ACTIVITY, JSON.stringify(SAMPLE_ACTIVITY))
  }
  if (!localStorage.getItem(KEY_DEPOSITS)) {
    localStorage.setItem(KEY_DEPOSITS, JSON.stringify(SAMPLE_DEPOSITS))
  }
  if (!localStorage.getItem(KEY_MEMBER_ACTIVITY)) {
    localStorage.setItem(KEY_MEMBER_ACTIVITY, JSON.stringify(SAMPLE_MEMBER_ACTIVITY))
  }
}

function migrateMember(m: Partial<Member>): Member {
  return {
    id: m.id ?? uid('m'),
    businessId: m.businessId ?? 'preview',
    name: m.name ?? 'Unnamed',
    email: m.email,
    phone: m.phone,
    avatarColor: m.avatarColor,
    tier: m.tier ?? 'Bronze',
    type: (m.type as Member['type']) ?? 'individual',
    status: (m.status as Member['status']) ?? 'active',
    notes: m.notes,
    address: m.address,
    joinedAt: m.joinedAt ?? new Date().toISOString(),
    lastActiveAt: m.lastActiveAt,
  }
}

function migrateCard(c: MembershipCard): MembershipCard {
  const out: MembershipCard = {
    ...c,
    type: c.type ?? 'standard',
    memberId: c.memberId ?? null,
  }
  if (c.nfcUid !== undefined) out.nfcUid = c.nfcUid
  return out
}

export function getMembers(): Member[] {
  if (typeof window === 'undefined') return SAMPLE_MEMBERS
  ensureSeeded()
  const list = safeParse<Partial<Member>[]>(
    localStorage.getItem(KEY_MEMBERS),
    SAMPLE_MEMBERS as Partial<Member>[],
  )
  return list.map((m) => migrateMember(m))
}

export function saveMembers(members: Member[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_MEMBERS, JSON.stringify(members))
}

export function updateMember(
  memberId: string,
  patch: Partial<Member>,
  by: string = 'admin@ezsale.app',
): Member | null {
  const members = getMembers()
  const idx = members.findIndex((m) => m.id === memberId)
  if (idx < 0) return null
  const next = { ...members[idx], ...patch }
  members[idx] = next
  saveMembers(members)
  logMemberActivity(memberId, 'updated', 'Profile updated.', { by })
  return next
}

export function setMemberStatus(
  memberId: string,
  status: Member['status'],
  by: string = 'admin@ezsale.app',
): Member | null {
  const members = getMembers()
  const idx = members.findIndex((m) => m.id === memberId)
  if (idx < 0) return null
  const prev = members[idx]
  const next = { ...prev, status }
  members[idx] = next
  saveMembers(members)
  const typeMap: Record<Member['status'], MemberActivity['type']> = {
    active: 'activated',
    inactive: 'deactivated',
    suspended: 'suspended',
  }
  const labelMap: Record<Member['status'], string> = {
    active: 'Account reactivated.',
    inactive: 'Account deactivated.',
    suspended: 'Account suspended.',
  }
  logMemberActivity(memberId, typeMap[status], labelMap[status], { by, meta: { from: prev.status, to: status } })
  return next
}

export interface NewMemberInput {
  name: string
  email?: string
  phone?: string
  tier: string
  type: Member['type']
  status?: Member['status']
  notes?: string
  address?: string
  avatarColor?: string
}

export function createMember(input: NewMemberInput, by: string = 'admin@ezsale.app'): Member {
  const member: Member = migrateMember({
    id: uid('m'),
    businessId: 'preview',
    name: input.name,
    email: input.email,
    phone: input.phone,
    tier: input.tier,
    type: input.type,
    status: input.status ?? 'active',
    notes: input.notes,
    address: input.address,
    avatarColor: input.avatarColor ?? '#84eb0a',
    joinedAt: new Date().toISOString(),
  })
  const all = getMembers()
  all.unshift(member)
  saveMembers(all)
  logMemberActivity(member.id, 'created', `Account created for ${member.name}.`, { by })
  return member
}

function logMemberActivity(
  memberId: string,
  type: MemberActivity['type'],
  description: string,
  extra: Partial<MemberActivity> = {},
) {
  if (typeof window === 'undefined') return
  const all = safeParse<MemberActivity[]>(
    localStorage.getItem(KEY_MEMBER_ACTIVITY),
    [],
  )
  all.unshift({
    id: uid('mact'),
    memberId,
    type,
    description,
    at: new Date().toISOString(),
    by: 'admin@ezsale.app',
    ...extra,
  })
  localStorage.setItem(KEY_MEMBER_ACTIVITY, JSON.stringify(all))
}

export function logMemberCardAssigned(memberId: string, cardNumber: string, by?: string) {
  logMemberActivity(memberId, 'card_assigned', `Card ${cardNumber} assigned.`, { by })
}

export function logMemberCardRemoved(memberId: string, cardNumber: string, by?: string) {
  logMemberActivity(memberId, 'card_removed', `Card ${cardNumber} unassigned.`, { by })
}

export function getMemberActivity(memberId: string): MemberActivity[] {
  if (typeof window === 'undefined') return []
  return safeParse<MemberActivity[]>(localStorage.getItem(KEY_MEMBER_ACTIVITY), [])
    .filter((a) => a.memberId === memberId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function memberStatusLabel(s: Member['status']) {
  switch (s) {
    case 'active':
      return 'Active'
    case 'inactive':
      return 'Inactive'
    case 'suspended':
      return 'Suspended'
    default:
      return s
  }
}

export function memberTypeLabel(t: Member['type']) {
  switch (t) {
    case 'individual':
      return 'Individual'
    case 'corporate':
      return 'Corporate'
    case 'staff':
      return 'Staff'
    default:
      return t
  }
}

export function getMember(memberId: string | null | undefined): Member | null {
  if (!memberId) return null
  return getMembers().find((m) => m.id === memberId) ?? null
}

export function getCards(): MembershipCard[] {
  if (typeof window === 'undefined') return SAMPLE_CARDS
  ensureSeeded()
  const list = safeParse<Partial<MembershipCard>[]>(
    localStorage.getItem(KEY_CARDS),
    SAMPLE_CARDS as Partial<MembershipCard>[],
  )
  return list.map((c) => migrateCard(c as MembershipCard))
}

export function getCard(cardId: string): MembershipCard | null {
  return getCards().find((c) => c.id === cardId) ?? null
}

export function getCardByNumber(num: string): { card: MembershipCard; member: Member | null } | null {
  const trimmed = num.trim().toUpperCase()
  if (!trimmed) return null
  const cards = getCards()
  const card = cards.find((c) => c.cardNumber.toUpperCase() === trimmed)
  if (!card) return null
  return { card, member: getMember(card.memberId) }
}

export function saveCards(cards: MembershipCard[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_CARDS, JSON.stringify(cards))
}

export function updateCard(cardId: string, patch: Partial<MembershipCard>): MembershipCard | null {
  const cards = getCards()
  const idx = cards.findIndex((c) => c.id === cardId)
  if (idx < 0) return null
  const next = { ...cards[idx], ...patch }
  cards[idx] = next
  saveCards(cards)
  return next
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

function persistActivity(entry: CardActivity) {
  if (typeof window === 'undefined') return
  const all = safeParse<CardActivity[]>(localStorage.getItem(KEY_ACTIVITY), [])
  all.unshift(entry)
  localStorage.setItem(KEY_ACTIVITY, JSON.stringify(all))
}

function persistDeposit(entry: CardDeposit) {
  if (typeof window === 'undefined') return
  const all = safeParse<CardDeposit[]>(localStorage.getItem(KEY_DEPOSITS), [])
  all.unshift(entry)
  localStorage.setItem(KEY_DEPOSITS, JSON.stringify(all))
}

function logActivity(
  cardId: string,
  type: CardActivity['type'],
  description: string,
  extra: Partial<CardActivity> = {},
) {
  const entry: CardActivity = {
    id: uid('act'),
    cardId,
    type,
    description,
    at: new Date().toISOString(),
    by: 'admin@ezsale.app',
    ...extra,
  }
  persistActivity(entry)
  return entry
}

export interface NewCardInput {
  cardNumber: string
  nfcUid?: string
  type: MembershipCardType
  memberId: string | null
  balance: number
  dailyLimit: number
  monthlyLimit: number
  expiresAt: string
  status: MembershipCardStatus
}

export function createCard(input: NewCardInput, by: string = 'admin@ezsale.app'): MembershipCard {
  const card: MembershipCard = {
    id: uid('card'),
    businessId: 'preview',
    cardNumber: input.cardNumber.toUpperCase(),
    nfcUid: input.nfcUid?.toUpperCase() || undefined,
    type: input.type,
    memberId: input.memberId,
    status: input.status,
    balance: Math.max(0, input.balance),
    dailyLimit: input.dailyLimit,
    monthlyLimit: input.monthlyLimit,
    issuedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  }
  const cards = getCards()
  cards.unshift(card)
  saveCards(cards)
  const member = getMember(input.memberId)
  logActivity(
    card.id,
    'created',
    `Card ${card.cardNumber} issued${member ? ` and assigned to ${member.name}` : ''}.`,
    { by },
  )
  if (input.balance > 0) {
    logActivity(card.id, 'deposit', 'Initial balance', { amount: input.balance, by })
  }
  return card
}

export function activateCard(cardId: string, by: string = 'admin@ezsale.app'): MembershipCard | null {
  const next = updateCard(cardId, { status: 'active' })
  if (next) logActivity(cardId, 'activated', 'Card activated.', { by })
  return next
}

export function deactivateCard(cardId: string, by: string = 'admin@ezsale.app'): MembershipCard | null {
  const next = updateCard(cardId, { status: 'inactive' })
  if (next) logActivity(cardId, 'deactivated', 'Card deactivated.', { by })
  return next
}

export function blockCard(
  cardId: string,
  reason: string = 'Reported suspicious activity',
  by: string = 'admin@ezsale.app',
): MembershipCard | null {
  const next = updateCard(cardId, { status: 'blocked' })
  if (next) logActivity(cardId, 'blocked', `Card blocked — ${reason}.`, { by })
  return next
}

export function markLost(
  cardId: string,
  by: string = 'admin@ezsale.app',
): MembershipCard | null {
  const next = updateCard(cardId, { status: 'lost' })
  if (next) logActivity(cardId, 'lost', 'Card reported lost.', { by })
  return next
}

export function unassignCard(
  cardId: string,
  by: string = 'admin@ezsale.app',
): MembershipCard | null {
  const card = getCard(cardId)
  if (!card) return null
  const memberId = card.memberId
  const member = getMember(memberId)
  const next = updateCard(cardId, { memberId: null })
  if (next) {
    logActivity(
      cardId,
      'unassigned',
      `Card unassigned${member ? ` from ${member.name}` : ''}.`,
      { by },
    )
    if (memberId) logMemberCardRemoved(memberId, card.cardNumber, by)
  }
  return next
}

export function assignCardToMember(
  cardId: string,
  memberId: string,
  by: string = 'admin@ezsale.app',
): MembershipCard | null {
  const card = getCard(cardId)
  if (!card) return null
  const member = getMember(memberId)
  if (!member) return null
  const previous = card.memberId
  const next = updateCard(cardId, { memberId })
  if (next) {
    const verb = previous && previous !== memberId ? 'reassigned' : 'assigned'
    logActivity(
      cardId,
      'assigned',
      `Card ${verb}${member ? ` to ${member.name}` : ''}.`,
      { by },
    )
    logMemberCardAssigned(memberId, card.cardNumber, by)
  }
  return next
}

export interface ReplaceCardInput {
  reason: string
  transferBalance: boolean
}

export function replaceCard(
  cardId: string,
  input: ReplaceCardInput,
  by: string = 'admin@ezsale.app',
): { oldCard: MembershipCard; newCard: MembershipCard } | null {
  const old = getCard(cardId)
  if (!old) return null
  const newNumber = generateNextCardNumber()
  const newCard: MembershipCard = {
    id: uid('card'),
    businessId: old.businessId,
    memberId: old.memberId,
    cardNumber: newNumber,
    nfcUid: undefined,
    type: old.type,
    status: 'active',
    balance: input.transferBalance ? old.balance : 0,
    dailyLimit: old.dailyLimit,
    monthlyLimit: old.monthlyLimit,
    issuedAt: new Date().toISOString(),
    expiresAt: old.expiresAt,
    replaces: old.id,
  }
  const cards = getCards()
  cards.unshift(newCard)
  updateCard(old.id, { status: 'replaced', replacedBy: newCard.id })
  saveCards(cards)
  const member = getMember(old.memberId)
  logActivity(
    old.id,
    'replaced',
    `Card replaced${member ? ` for ${member.name}` : ''} — new card ${newCard.cardNumber}.`,
    { by, meta: { reason: input.reason } },
  )
  logActivity(
    newCard.id,
    'created',
    `Replacement card issued${member ? ` for ${member.name}` : ''}.`,
    { by, meta: { replaces: old.id } },
  )
  if (input.transferBalance && old.balance > 0) {
    logActivity(newCard.id, 'deposit', 'Balance transferred from previous card.', {
      amount: old.balance,
      by,
    })
  }
  return { oldCard: getCard(old.id)!, newCard }
}

export function topUpCard(
  cardId: string,
  amount: number,
  method: CardDeposit['method'] = 'cash',
  reference?: string,
  note?: string,
  by: string = 'admin@ezsale.app',
): { card: MembershipCard; deposit: CardDeposit } | null {
  if (amount <= 0) return null
  const card = getCard(cardId)
  if (!card) return null
  const updated = updateCard(cardId, { balance: card.balance + amount })
  if (!updated) return null
  const deposit: CardDeposit = {
    id: uid('dep'),
    cardId,
    amount,
    method,
    reference,
    note,
    at: new Date().toISOString(),
    by,
  }
  persistDeposit(deposit)
  logActivity(cardId, 'deposit', `Top-up via ${method}${reference ? ` · ${reference}` : ''}`, {
    amount,
    by,
  })
  return { card: updated, deposit }
}

export function getCardActivity(cardId: string): CardActivity[] {
  if (typeof window === 'undefined') return []
  return safeParse<CardActivity[]>(localStorage.getItem(KEY_ACTIVITY), [])
    .filter((a) => a.cardId === cardId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function getCardDeposits(cardId: string): CardDeposit[] {
  if (typeof window === 'undefined') return []
  return safeParse<CardDeposit[]>(localStorage.getItem(KEY_DEPOSITS), [])
    .filter((d) => d.cardId === cardId)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
}

export function getCardTransactions(cardId: string): Transaction[] {
  return getTransactions()
    .filter((t) => t.cardId === cardId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getCardsByMember(memberId: string): MembershipCard[] {
  return getCards().filter((c) => c.memberId === memberId)
}

function generateNextCardNumber() {
  const existing = getCards()
  let max = 1000
  for (const c of existing) {
    const m = c.cardNumber.match(/(\d{3,})$/)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > max) max = n
    }
  }
  const next = (max + 1).toString().padStart(4, '0')
  return `EZ-1000-${next}`
}

export function suggestNextCardNumber(): string {
  return generateNextCardNumber()
}

export function cardStatusLabel(s: MembershipCardStatus) {
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
    default:
      return s
  }
}

export function cardTypeLabel(t: MembershipCardType) {
  switch (t) {
    case 'standard':
      return 'Standard'
    case 'nfc':
      return 'NFC'
    case 'virtual':
      return 'Virtual'
    case 'corporate':
      return 'Corporate'
    case 'gift':
      return 'Gift'
    default:
      return t
  }
}

export function isCardUsable(card: MembershipCard): { ok: boolean; reason?: string } {
  if (card.status === 'blocked') return { ok: false, reason: 'Card is blocked. Contact manager.' }
  if (card.status === 'inactive') return { ok: false, reason: 'Card is inactive.' }
  if (card.status === 'lost') return { ok: false, reason: 'Card reported lost.' }
  if (card.status === 'replaced') return { ok: false, reason: 'Card has been replaced.' }
  if (card.status === 'expired' || new Date(card.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: 'Card has expired.' }
  }
  return { ok: true }
}

export function maskCardNumber(num: string) {
  if (!num) return ''
  const tail = num.slice(-4)
  return `•••• ${tail}`
}

export function formatCardNumber(input: string) {
  return input.replace(/[^A-Z0-9-]/gi, '').toUpperCase()
}

export function chargeCard(cardId: string, amount: number): MembershipCard | null {
  const card = getCard(cardId)
  if (!card) return null
  return updateCard(cardId, { balance: Math.max(0, card.balance - amount) })
}

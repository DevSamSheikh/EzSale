// ---------------------------------------------------------------------------
// Categories store
// ---------------------------------------------------------------------------
//
// Categories are first-class entities with a display order, an icon, a status,
// and an optional business-type scope. The store lives in its own localStorage
// key so the existing `Business.categories: string[]` (used by the setup
// wizard and the older business settings screen) keeps working.
//
// The store also exposes a small "live update" event so the POS, the products
// page, and the analytics dashboard can re-render the moment a category is
// added, hidden, renamed, or reordered.

import type { BusinessType } from './types'

export type CategoryStatus = 'active' | 'hidden' | 'archived'

export interface Category {
  id: string
  name: string
  /** Optional image URL or inline data URL for a custom icon */
  image?: string
  /** Lucide icon name from the category-icon set (used when no image is set) */
  iconKey?: string
  /** Display order — lower = first. Ties broken by name. */
  order: number
  status: CategoryStatus
  /** When set, the category is only shown for businesses of these types. */
  businessTypes?: BusinessType[]
  /** Free-form color used for the category chip in the POS. */
  color?: string
  createdAt: string
  updatedAt: string
}

const KEY_CATEGORIES = 'ezsale:categories'

/** Event name dispatched on `window` whenever the categories list changes. */
export const CATEGORIES_UPDATED_EVENT = 'ezsale:categories-updated'

// ---- Defaults ------------------------------------------------------------
//
// Seeded on first load. Each preset covers the "starter" set for that
// business type so a brand-new install already has a usable POS catalog.

const SEED: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'order'>[] = [
  { name: 'Mains', iconKey: 'utensils', status: 'active' },
  { name: 'Starters', iconKey: 'salad', status: 'active' },
  { name: 'Drinks', iconKey: 'cup-soda', status: 'active' },
  { name: 'Desserts', iconKey: 'cake', status: 'active' },
  { name: 'Combos', iconKey: 'package-plus', status: 'active' },

  { name: 'Tuition', iconKey: 'book-open', status: 'active', businessTypes: ['school'] },
  { name: 'Canteen', iconKey: 'utensils', status: 'active', businessTypes: ['school'] },
  { name: 'Library', iconKey: 'library', status: 'active', businessTypes: ['school'] },
  { name: 'Services', iconKey: 'briefcase', status: 'active', businessTypes: ['school'] },

  { name: 'Fashion', iconKey: 'shirt', status: 'active', businessTypes: ['mall'] },
  { name: 'Electronics', iconKey: 'smartphone', status: 'active', businessTypes: ['mall'] },
  { name: 'Food court', iconKey: 'utensils', status: 'active', businessTypes: ['mall'] },
  { name: 'Beauty', iconKey: 'sparkles', status: 'active', businessTypes: ['mall'] },

  { name: 'Sessions', iconKey: 'timer', status: 'active', businessTypes: ['gaming'] },
  { name: 'Tokens', iconKey: 'coin', status: 'active', businessTypes: ['gaming'] },
  { name: 'Snacks', iconKey: 'popcorn', status: 'active', businessTypes: ['gaming'] },
  { name: 'Merchandise', iconKey: 'shopping-bag', status: 'active', businessTypes: ['gaming'] },

  { name: 'New arrivals', iconKey: 'sparkles', status: 'active', businessTypes: ['retail'] },
  { name: 'Best sellers', iconKey: 'star', status: 'active', businessTypes: ['retail'] },
  { name: 'Clearance', iconKey: 'tag', status: 'active', businessTypes: ['retail'] },
]

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

function nowIso() {
  return new Date().toISOString()
}

function seedCategories(): Category[] {
  const created = nowIso()
  return SEED.map((c, i) => ({
    ...c,
    id: uid('cat'),
    order: i,
    createdAt: created,
    updatedAt: created,
  }))
}

function migrate(raw: Partial<Category> & { id: string; name: string }): Category {
  return {
    id: raw.id,
    name: raw.name,
    image: raw.image,
    iconKey: raw.iconKey,
    order: typeof raw.order === 'number' ? raw.order : 0,
    status: (raw.status as CategoryStatus) ?? 'active',
    businessTypes: raw.businessTypes,
    color: raw.color,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  }
}

export function getCategories(): Category[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(KEY_CATEGORIES)
  if (!raw) {
    const seeded = seedCategories()
    localStorage.setItem(KEY_CATEGORIES, JSON.stringify(seeded))
    return seeded
  }
  const parsed = safeParse<Partial<Category>[]>(raw, [])
  const cats = parsed.map((c) => migrate(c as Category))
  // If a previous save ended up empty (e.g. user cleared everything), re-seed.
  if (cats.length === 0) {
    const seeded = seedCategories()
    localStorage.setItem(KEY_CATEGORIES, JSON.stringify(seeded))
    return seeded
  }
  return cats
}

function saveCategories(cats: Category[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(cats))
  window.dispatchEvent(new CustomEvent(CATEGORIES_UPDATED_EVENT))
}

/** Returns categories visible for a given business type, sorted by order. */
export function getCategoriesForBusiness(
  businessType: BusinessType | undefined,
  options: { includeHidden?: boolean } = {},
): Category[] {
  const all = getCategories()
  return all
    .filter((c) => {
      if (!options.includeHidden && c.status !== 'active') return false
      if (!c.businessTypes || c.businessTypes.length === 0) return true
      if (!businessType) return true
      return c.businessTypes.includes(businessType)
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

export interface NewCategoryInput {
  name: string
  image?: string
  iconKey?: string
  status?: CategoryStatus
  businessTypes?: BusinessType[]
  color?: string
}

export function createCategory(input: NewCategoryInput): Category {
  const all = getCategories()
  const maxOrder = all.reduce((m, c) => Math.max(m, c.order), -1)
  const created = nowIso()
  const cat: Category = {
    id: uid('cat'),
    name: input.name.trim() || 'New category',
    image: input.image?.trim() || undefined,
    iconKey: input.iconKey,
    status: input.status ?? 'active',
    businessTypes: input.businessTypes,
    color: input.color,
    order: maxOrder + 1,
    createdAt: created,
    updatedAt: created,
  }
  all.push(cat)
  saveCategories(all)
  return cat
}

export type CategoryPatch = Partial<Omit<Category, 'id' | 'createdAt'>>

export function updateCategory(id: string, patch: CategoryPatch): Category | null {
  const all = getCategories()
  const idx = all.findIndex((c) => c.id === id)
  if (idx < 0) return null
  const next: Category = {
    ...all[idx],
    ...patch,
    id: all[idx].id,
    createdAt: all[idx].createdAt,
    updatedAt: nowIso(),
  }
  all[idx] = next
  saveCategories(all)
  return next
}

export function setCategoryStatus(id: string, status: CategoryStatus): Category | null {
  return updateCategory(id, { status })
}

export function deleteCategory(id: string): boolean {
  const all = getCategories()
  const next = all.filter((c) => c.id !== id)
  if (next.length === all.length) return false
  saveCategories(next)
  return true
}

export function reorderCategories(orderedIds: string[]): boolean {
  const all = getCategories()
  const map = new Map(all.map((c) => [c.id, c]))
  let changed = false
  orderedIds.forEach((id, i) => {
    const cat = map.get(id)
    if (cat && cat.order !== i) {
      map.set(id, { ...cat, order: i, updatedAt: nowIso() })
      changed = true
    }
  })
  if (!changed) return false
  saveCategories(Array.from(map.values()))
  return true
}

/** Move a category up or down by `delta` slots. */
export function shiftCategory(id: string, delta: -1 | 1): void {
  const all = getCategories().sort((a, b) => a.order - b.order)
  const idx = all.findIndex((c) => c.id === id)
  if (idx < 0) return
  const target = idx + delta
  if (target < 0 || target >= all.length) return
  const a = all[idx]
  const b = all[target]
  const aOrder = a.order
  all[idx] = { ...b, order: aOrder }
  all[target] = { ...a, order: b.order }
  saveCategories(all)
}

// ---- Icon catalog --------------------------------------------------------
//
// The set of icon keys that can be assigned to a category. These map to
// Lucide icons used in the picker UI. Keeping the catalog here (rather than
// importing every Lucide icon in every consumer) keeps the bundle small.

import {
  Beer,
  BookOpen,
  Briefcase,
  Cake,
  Candy,
  Cookie,
  Coins,
  Coffee,
  CupSoda,
  Flame,
  Leaf,
  Library,
  Package,
  Pizza,
  Popcorn,
  Salad,
  Shirt,
  ShoppingBag,
  Smartphone,
  Snowflake,
  Sparkles,
  Star,
  Tag,
  Timer,
  UtensilsCrossed,
  PackagePlus,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryIconDef {
  key: string
  label: string
  icon: LucideIcon
}

export const CATEGORY_ICONS: CategoryIconDef[] = [
  { key: 'utensils', label: 'Utensils', icon: UtensilsCrossed },
  { key: 'salad', label: 'Salad', icon: Salad },
  { key: 'cup-soda', label: 'Cold drinks', icon: CupSoda },
  { key: 'cake', label: 'Cake', icon: Cake },
  { key: 'package-plus', label: 'Combos', icon: PackagePlus },
  { key: 'pizza', label: 'Pizza', icon: Pizza },
  { key: 'coffee', label: 'Coffee', icon: Coffee },
  { key: 'beer', label: 'Beer', icon: Beer },
  { key: 'book-open', label: 'Books', icon: BookOpen },
  { key: 'library', label: 'Library', icon: Library },
  { key: 'briefcase', label: 'Services', icon: Briefcase },
  { key: 'shirt', label: 'Fashion', icon: Shirt },
  { key: 'smartphone', label: 'Electronics', icon: Smartphone },
  { key: 'sparkles', label: 'Beauty', icon: Sparkles },
  { key: 'timer', label: 'Sessions', icon: Timer },
  { key: 'coin', label: 'Tokens', icon: Coins },
  { key: 'popcorn', label: 'Snacks', icon: Popcorn },
  { key: 'shopping-bag', label: 'Merchandise', icon: ShoppingBag },
  { key: 'star', label: 'Best sellers', icon: Star },
  { key: 'tag', label: 'Clearance', icon: Tag },
  { key: 'package', label: 'General', icon: Package },
  { key: 'leaf', label: 'Organic', icon: Leaf },
  { key: 'flame', label: 'Hot', icon: Flame },
  { key: 'snowflake', label: 'Cold', icon: Snowflake },
  { key: 'candy', label: 'Candy', icon: Candy },
  { key: 'cookie', label: 'Bakery', icon: Cookie },
]

export function getCategoryIcon(key?: string): CategoryIconDef {
  return (
    CATEGORY_ICONS.find((i) => i.key === key) ??
    CATEGORY_ICONS[CATEGORY_ICONS.length - 1]
  )
}

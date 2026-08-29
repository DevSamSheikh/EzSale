export type ProductBadge = 'best' | 'top' | 'new' | 'offer'

export type ProductStatus = 'active' | 'inactive' | 'archived' | 'draft'

export type DiscountKind = 'percent' | 'amount'

export interface ProductVariant {
  id: string
  /** User-facing variant name (e.g. "Large", "Family Pack", "Spicy") */
  name: string
  /** Optional SKU override; falls back to the parent SKU + suffix */
  sku?: string
  price: number
  cost?: number
  stock?: number
}

export interface ProductDiscount {
  kind: DiscountKind
  value: number
  /** Optional human label (e.g. "Summer Sale") */
  label?: string
}

export interface POSProduct {
  id: string
  name: string
  description: string
  image: string
  /** Base price (used when no variant is selected) */
  price: number
  /** Cost of goods (optional but shown in the products UI) */
  cost?: number
  /** Auto-generated or admin-entered SKU */
  sku: string
  category: string
  status: ProductStatus
  /** Optional tax rate override; falls back to business.taxRate */
  taxRate?: number
  /** Active discount applied at the catalog level */
  discount?: ProductDiscount
  /** Optional product variants (size, flavor, etc.) */
  variants: ProductVariant[]
  /** When true, the product is featured in the POS catalog */
  featured: boolean
  /** Optional badge drawn over the POS card */
  badge?: ProductBadge
  badgeLabel?: string
  favorite?: boolean
  /** Current stock level; undefined means "not tracked" */
  stock?: number
  /** Low-stock threshold used for the warning chip */
  lowStockAt?: number
  /** Whether the product is currently available in the POS */
  available: boolean
  /** ISO timestamps for audit trail */
  createdAt: string
  updatedAt: string
}

export interface CartLine {
  productId: string
  qty: number
  /** Variant id selected at the time the line was added */
  variantId?: string
}

const KEY_PRODUCTS = 'ezsale:pos:products'
const KEY_CART = 'ezsale:pos:cart'

/** Dispatched on window whenever the products catalog changes. */
export const PRODUCTS_UPDATED_EVENT = 'ezsale:pos:products-updated'

/** Prefix for products auto-broadcasting on every write. */
const BROADCAST_CHANNEL = 'ezsale:pos:products'

function broadcastProductsUpdate() {
  if (typeof window === 'undefined') return
  // Same-tab listeners (storage events only fire across tabs).
  window.dispatchEvent(new CustomEvent(PRODUCTS_UPDATED_EVENT))
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)
    .toString(36)
    .padStart(2, '0')}`
}

const seedNow = new Date().toISOString()

function seed(
  partial: Omit<POSProduct, 'sku' | 'status' | 'available' | 'featured' | 'variants' | 'createdAt' | 'updatedAt'> & {
    sku?: string
    status?: ProductStatus
    available?: boolean
    featured?: boolean
    variants?: ProductVariant[]
    stock?: number
    lowStockAt?: number
    cost?: number
    discount?: ProductDiscount
    taxRate?: number
  },
): POSProduct {
  const id = partial.id
  return {
    sku: partial.sku ?? `SKU-${id.toUpperCase()}`,
    status: partial.status ?? 'active',
    available: partial.available ?? true,
    featured: partial.featured ?? false,
    variants: partial.variants ?? [],
    createdAt: seedNow,
    updatedAt: seedNow,
    ...partial,
  }
}

export const DEFAULT_POS_PRODUCTS: POSProduct[] = [
  seed({
    id: 'p1',
    name: 'BBQ Pizza',
    description: '7–8 inci',
    price: 60,
    cost: 22,
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=70',
    category: 'Pizza',
    badge: 'best',
    badgeLabel: 'Best Sale',
    favorite: true,
    featured: true,
    stock: 24,
    lowStockAt: 5,
    variants: [
      { id: 'p1-s', name: 'Small (6")', price: 48, cost: 18, stock: 12 },
      { id: 'p1-m', name: 'Medium (8")', price: 60, cost: 22, stock: 24 },
      { id: 'p1-l', name: 'Large (12")', price: 88, cost: 32, stock: 9 },
    ],
  }),
  seed({
    id: 'p2',
    name: 'Biryani',
    description: '380–500g',
    price: 50,
    cost: 18,
    image:
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=70',
    category: 'Biryani',
    favorite: true,
    stock: 40,
    lowStockAt: 8,
    variants: [
      { id: 'p2-chicken', name: 'Chicken', price: 50, cost: 18, stock: 22 },
      { id: 'p2-beef', name: 'Beef', price: 60, cost: 22, stock: 12 },
      { id: 'p2-veg', name: 'Vegetable', price: 42, cost: 14, stock: 6 },
    ],
  }),
  seed({
    id: 'p3',
    name: 'Pasta',
    description: '80–100g',
    price: 20,
    cost: 6,
    image:
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=400&q=70',
    category: 'Pasta',
    badge: 'offer',
    badgeLabel: '9% Offer',
    discount: { kind: 'percent', value: 9, label: 'Lunchtime' },
    stock: 60,
  }),
  seed({
    id: 'p4',
    name: 'Noodles',
    description: '100–150g',
    price: 25,
    cost: 7,
    image:
      'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400&q=70',
    category: 'Pasta',
    stock: 50,
  }),
  seed({
    id: 'p5',
    name: 'Pasta',
    description: '250–320g',
    price: 15,
    cost: 5,
    image:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=70',
    category: 'Pasta',
    badge: 'top',
    badgeLabel: 'Top Sale',
    stock: 80,
  }),
  seed({
    id: 'p6',
    name: 'Pizza',
    description: '6–7 inci',
    price: 52,
    cost: 19,
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=70',
    category: 'Pizza',
    favorite: true,
    stock: 18,
  }),
  seed({
    id: 'p7',
    name: 'Burger',
    description: 'Single patty',
    price: 35,
    cost: 11,
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=70',
    category: 'Burger',
    badge: 'offer',
    badgeLabel: '16% Offer',
    discount: { kind: 'percent', value: 16, label: 'Combo Deal' },
    stock: 3,
    lowStockAt: 5,
  }),
  seed({
    id: 'p8',
    name: 'Salad Bowl',
    description: 'Fresh greens',
    price: 22,
    cost: 6,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=70',
    category: 'Salad',
    stock: 35,
  }),
  seed({
    id: 'p9',
    name: 'Iced Latte',
    description: '16 oz',
    price: 18,
    cost: 4,
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=70',
    category: 'Drinks',
    stock: 120,
  }),
  seed({
    id: 'p10',
    name: 'Chocolate Cake',
    description: 'Slice',
    price: 28,
    cost: 9,
    image:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=70',
    category: 'Dessert',
    badge: 'new',
    badgeLabel: 'NEW ITEM',
    featured: true,
    stock: 16,
  }),
  seed({
    id: 'p11',
    name: 'Fried Rice',
    description: '200g',
    price: 32,
    cost: 9,
    image:
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=70',
    category: 'Rice',
    stock: 28,
  }),
  seed({
    id: 'p12',
    name: 'Cold Drink',
    description: '330ml',
    price: 8,
    cost: 2,
    image:
      'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=400&q=70',
    category: 'Drinks',
    stock: 200,
  }),
]

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function nowIso() {
  return new Date().toISOString()
}

/**
 * Upgrade legacy product records to the current schema. Old records were just
 * `{ id, name, description, price, image, category, badge?, badgeLabel?, favorite? }`.
 */
function migrateProduct(raw: Partial<POSProduct> & { id: string }): POSProduct {
  const migrated: POSProduct = {
    id: raw.id,
    name: raw.name ?? 'Unnamed product',
    description: raw.description ?? '',
    image: raw.image ?? '',
    price: typeof raw.price === 'number' ? raw.price : 0,
    cost: typeof raw.cost === 'number' ? raw.cost : undefined,
    sku: raw.sku ?? `SKU-${raw.id.toUpperCase()}`,
    category: raw.category ?? 'Uncategorized',
    status: (raw.status as POSProduct['status']) ?? 'active',
    taxRate: typeof raw.taxRate === 'number' ? raw.taxRate : undefined,
    discount: raw.discount,
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    featured: !!raw.featured,
    badge: raw.badge,
    badgeLabel: raw.badgeLabel,
    favorite: !!raw.favorite,
    stock: typeof raw.stock === 'number' ? raw.stock : undefined,
    lowStockAt: typeof raw.lowStockAt === 'number' ? raw.lowStockAt : undefined,
    available: raw.available ?? true,
    createdAt: raw.createdAt ?? nowIso(),
    updatedAt: raw.updatedAt ?? nowIso(),
  }
  return migrated
}

export function getProducts(): POSProduct[] {
  if (typeof window === 'undefined') return DEFAULT_POS_PRODUCTS
  const stored = localStorage.getItem(KEY_PRODUCTS)
  if (!stored) {
    localStorage.setItem(KEY_PRODUCTS, JSON.stringify(DEFAULT_POS_PRODUCTS))
    return DEFAULT_POS_PRODUCTS
  }
  const parsed = safeParse<Partial<POSProduct>[]>(stored, DEFAULT_POS_PRODUCTS)
  return parsed.map((p) => migrateProduct(p as POSProduct))
}

export function saveProducts(products: POSProduct[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products))
  broadcastProductsUpdate()
}

export function getCategories(products: POSProduct[]): string[] {
  const set = new Set<string>()
  products.forEach((p) => set.add(p.category))
  return Array.from(set)
}

export function getProduct(id: string): POSProduct | null {
  return getProducts().find((p) => p.id === id) ?? null
}

export interface NewProductInput {
  name: string
  description?: string
  image?: string
  price: number
  cost?: number
  sku?: string
  category: string
  status?: ProductStatus
  taxRate?: number
  discount?: ProductDiscount
  variants?: ProductVariant[]
  featured?: boolean
  badge?: ProductBadge
  badgeLabel?: string
  favorite?: boolean
  stock?: number
  lowStockAt?: number
  available?: boolean
}

function makeSku(name: string, existing: POSProduct[]): string {
  const base = (name || 'NEW')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'NEW'
  const used = new Set(existing.map((p) => p.sku))
  if (!used.has(base)) return base
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`
    if (!used.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

export function createProduct(input: NewProductInput): POSProduct {
  const all = getProducts()
  const id = uid('prod')
  const sku = input.sku?.trim() ? input.sku.trim().toUpperCase() : makeSku(input.name, all)
  const now = nowIso()
  const product: POSProduct = {
    id,
    name: input.name.trim() || 'New product',
    description: input.description?.trim() ?? '',
    image:
      input.image?.trim() ||
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=70',
    price: Math.max(0, input.price),
    cost: input.cost,
    sku,
    category: input.category.trim() || 'Uncategorized',
    status: input.status ?? 'active',
    taxRate: input.taxRate,
    discount: input.discount,
    variants: input.variants ?? [],
    featured: input.featured ?? false,
    badge: input.badge,
    badgeLabel: input.badgeLabel,
    favorite: input.favorite ?? false,
    stock: input.stock,
    lowStockAt: input.lowStockAt,
    available: input.available ?? true,
    createdAt: now,
    updatedAt: now,
  }
  all.unshift(product)
  saveProducts(all)
  return product
}

export type ProductPatch = Partial<Omit<POSProduct, 'id' | 'createdAt'>>

export function updateProduct(id: string, patch: ProductPatch): POSProduct | null {
  const all = getProducts()
  const idx = all.findIndex((p) => p.id === id)
  if (idx < 0) return null
  const current = all[idx]
  const next: POSProduct = {
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  }
  // If SKU collides with another product, append a suffix.
  if (patch.sku && patch.sku.trim()) {
    const wanted = patch.sku.trim().toUpperCase()
    const collision = all.find((p) => p.id !== id && p.sku.toUpperCase() === wanted)
    next.sku = collision ? makeSku(wanted, all) : wanted
  }
  all[idx] = next
  saveProducts(all)
  return next
}

export function setProductStatus(id: string, status: ProductStatus): POSProduct | null {
  return updateProduct(id, { status, available: status === 'active' })
}

export function archiveProduct(id: string): POSProduct | null {
  return setProductStatus(id, 'archived')
}

export function duplicateProduct(id: string): POSProduct | null {
  const original = getProduct(id)
  if (!original) return null
  const copy = createProduct({
    name: `${original.name} (copy)`,
    description: original.description,
    image: original.image,
    price: original.price,
    cost: original.cost,
    category: original.category,
    taxRate: original.taxRate,
    discount: original.discount ? { ...original.discount } : undefined,
    variants: original.variants.map((v) => ({ ...v, id: uid('var') })),
    featured: original.featured,
    badge: original.badge,
    badgeLabel: original.badgeLabel,
    favorite: original.favorite,
    stock: original.stock,
    lowStockAt: original.lowStockAt,
    status: 'draft',
    available: false,
  })
  return copy
}

export function deleteProduct(id: string): boolean {
  const all = getProducts()
  const next = all.filter((p) => p.id !== id)
  if (next.length === all.length) return false
  saveProducts(next)
  return true
}

export function getCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  return safeParse<CartLine[]>(localStorage.getItem(KEY_CART), [])
}

export function saveCart(cart: CartLine[]) {
  localStorage.setItem(KEY_CART, JSON.stringify(cart))
}

export function addToCart(
  productId: string,
  qty: number = 1,
  variantId?: string,
) {
  const cart = getCart()
  const existing = cart.find((c) => c.productId === productId && c.variantId === variantId)
  if (existing) {
    existing.qty = Math.max(1, existing.qty + qty)
  } else {
    cart.push({ productId, qty: Math.max(1, qty), variantId })
  }
  saveCart(cart)
  return cart
}

export function setCartQty(productId: string, qty: number, variantId?: string) {
  const cart = getCart()
  if (qty <= 0) {
    saveCart(cart.filter((c) => !(c.productId === productId && c.variantId === variantId)))
    return
  }
  const existing = cart.find((c) => c.productId === productId && c.variantId === variantId)
  if (existing) existing.qty = qty
  else cart.push({ productId, qty, variantId })
  saveCart(cart)
}

export function removeFromCart(productId: string, variantId?: string) {
  saveCart(getCart().filter((c) => !(c.productId === productId && c.variantId === variantId)))
}

export function clearCart() {
  saveCart([])
}

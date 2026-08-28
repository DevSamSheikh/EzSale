export type ProductBadge = 'best' | 'top' | 'new' | 'offer'

export interface POSProduct {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  badge?: ProductBadge
  badgeLabel?: string
  favorite?: boolean
}

export interface CartLine {
  productId: string
  qty: number
}

const KEY_PRODUCTS = 'ezsale:pos:products'
const KEY_CART = 'ezsale:pos:cart'

export const DEFAULT_POS_PRODUCTS: POSProduct[] = [
  {
    id: 'p1',
    name: 'BBQ Pizza',
    description: '7–8 inci',
    price: 60,
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=70',
    category: 'Pizza',
    badge: 'best',
    badgeLabel: 'Best Sale',
    favorite: true,
  },
  {
    id: 'p2',
    name: 'Biryani',
    description: '380–500g',
    price: 50,
    image:
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=70',
    category: 'Biryani',
    favorite: true,
  },
  {
    id: 'p3',
    name: 'Pasta',
    description: '80–100g',
    price: 20,
    image:
      'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=400&q=70',
    category: 'Pasta',
    badge: 'offer',
    badgeLabel: '9% Offer',
  },
  {
    id: 'p4',
    name: 'Noodles',
    description: '100–150g',
    price: 25,
    image:
      'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400&q=70',
    category: 'Pasta',
  },
  {
    id: 'p5',
    name: 'Pasta',
    description: '250–320g',
    price: 15,
    image:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=70',
    category: 'Pasta',
    badge: 'top',
    badgeLabel: 'Top Sale',
  },
  {
    id: 'p6',
    name: 'Pizza',
    description: '6–7 inci',
    price: 52,
    image:
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=70',
    category: 'Pizza',
    favorite: true,
  },
  {
    id: 'p7',
    name: 'Burger',
    description: 'Single patty',
    price: 35,
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=70',
    category: 'Burger',
    badge: 'offer',
    badgeLabel: '16% Offer',
  },
  {
    id: 'p8',
    name: 'Salad Bowl',
    description: 'Fresh greens',
    price: 22,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=70',
    category: 'Salad',
  },
  {
    id: 'p9',
    name: 'Iced Latte',
    description: '16 oz',
    price: 18,
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=70',
    category: 'Drinks',
  },
  {
    id: 'p10',
    name: 'Chocolate Cake',
    description: 'Slice',
    price: 28,
    image:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=70',
    category: 'Dessert',
    badge: 'new',
    badgeLabel: 'NEW ITEM',
  },
  {
    id: 'p11',
    name: 'Fried Rice',
    description: '200g',
    price: 32,
    image:
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=70',
    category: 'Rice',
  },
  {
    id: 'p12',
    name: 'Cold Drink',
    description: '330ml',
    price: 8,
    image:
      'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=400&q=70',
    category: 'Drinks',
  },
]

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function getProducts(): POSProduct[] {
  if (typeof window === 'undefined') return DEFAULT_POS_PRODUCTS
  const stored = localStorage.getItem(KEY_PRODUCTS)
  if (!stored) {
    localStorage.setItem(KEY_PRODUCTS, JSON.stringify(DEFAULT_POS_PRODUCTS))
    return DEFAULT_POS_PRODUCTS
  }
  return safeParse<POSProduct[]>(stored, DEFAULT_POS_PRODUCTS)
}

export function getCategories(products: POSProduct[]): string[] {
  const set = new Set<string>()
  products.forEach((p) => set.add(p.category))
  return Array.from(set)
}

export function getCart(): CartLine[] {
  if (typeof window === 'undefined') return []
  return safeParse<CartLine[]>(localStorage.getItem(KEY_CART), [])
}

export function saveCart(cart: CartLine[]) {
  localStorage.setItem(KEY_CART, JSON.stringify(cart))
}

export function addToCart(productId: string, qty: number = 1) {
  const cart = getCart()
  const existing = cart.find((c) => c.productId === productId)
  if (existing) {
    existing.qty = Math.max(1, existing.qty + qty)
  } else {
    cart.push({ productId, qty: Math.max(1, qty) })
  }
  saveCart(cart)
  return cart
}

export function setCartQty(productId: string, qty: number) {
  const cart = getCart()
  if (qty <= 0) {
    saveCart(cart.filter((c) => c.productId !== productId))
    return
  }
  const existing = cart.find((c) => c.productId === productId)
  if (existing) existing.qty = qty
  else cart.push({ productId, qty })
  saveCart(cart)
}

export function removeFromCart(productId: string) {
  saveCart(getCart().filter((c) => c.productId !== productId))
}

export function clearCart() {
  saveCart([])
}

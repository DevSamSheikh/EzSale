export interface PresetImage {
  id: string
  label: string
  url: string
  /** Lowercase searchable tags (label is always implicitly included). */
  tags: string[]
}

/**
 * Preset image gallery for the WordPress-style image picker and the inline
 * `ImageSelector` in the product editor. URLs are stable Unsplash photos
 * (auto-formatted, 400px wide, quality 70) used as visual placeholders for
 * the catalog. Order is intentional — it controls the default grid order
 * in both UIs.
 */
export const PRESET_IMAGES: PresetImage[] = [
  {
    id: 'food-pizza',
    label: 'Pizza',
    url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=70',
    tags: ['pizza', 'food', 'restaurant', 'italian'],
  },
  {
    id: 'food-burger',
    label: 'Burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=70',
    tags: ['burger', 'food', 'restaurant', 'fast food'],
  },
  {
    id: 'food-drink',
    label: 'Drink',
    url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=70',
    tags: ['drink', 'beverage', 'coffee', 'tea', 'cafe'],
  },
  {
    id: 'food-salad',
    label: 'Salad',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=70',
    tags: ['salad', 'food', 'healthy', 'restaurant'],
  },
  {
    id: 'food-pasta',
    label: 'Pasta',
    url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=70',
    tags: ['pasta', 'food', 'italian', 'restaurant'],
  },
  {
    id: 'food-dessert',
    label: 'Dessert',
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=70',
    tags: ['dessert', 'cake', 'sweet', 'food', 'bakery'],
  },
  {
    id: 'retail-shirt',
    label: 'Shirt',
    url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=70',
    tags: ['shirt', 'clothing', 'apparel', 'retail'],
  },
  {
    id: 'retail-bag',
    label: 'Bag',
    url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=70',
    tags: ['bag', 'accessory', 'retail'],
  },
  {
    id: 'gaming-console',
    label: 'Console',
    url: 'https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?auto=format&fit=crop&w=400&q=70',
    tags: ['console', 'gaming', 'electronics'],
  },
  {
    id: 'service-voucher',
    label: 'Voucher',
    url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=70',
    tags: ['voucher', 'gift card', 'service', 'ticket'],
  },
]

export function searchPresetImages(query: string): PresetImage[] {
  const q = query.trim().toLowerCase()
  if (!q) return PRESET_IMAGES
  return PRESET_IMAGES.filter((img) => {
    if (img.label.toLowerCase().includes(q)) return true
    return img.tags.some((t) => t.toLowerCase().includes(q))
  })
}

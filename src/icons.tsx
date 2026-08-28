import {
  UtensilsCrossed,
  GraduationCap,
  ShoppingBag,
  Gamepad2,
  Store,
  Sparkles,
  Box,
  type LucideIcon,
} from 'lucide-react'
import type { BusinessType } from './types'

const ICONS: Record<BusinessType, LucideIcon> = {
  restaurant: UtensilsCrossed,
  school: GraduationCap,
  mall: ShoppingBag,
  gaming: Gamepad2,
  retail: Store,
  custom: Sparkles,
}

export function BusinessTypeIcon({ type, className = 'h-5 w-5' }: { type: BusinessType; className?: string }) {
  const I = ICONS[type] ?? Store
  return <I className={className} strokeWidth={2} />
}

export function ProductPlaceholder({ className = 'h-10 w-10' }: { className?: string }) {
  return <Box className={`${className} text-ink-300`} strokeWidth={1.6} />
}

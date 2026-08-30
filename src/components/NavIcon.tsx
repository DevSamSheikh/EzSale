import {
  LayoutDashboard,
  Layers,
  MonitorPlay,
  Package,
  Receipt,
  Users,
  CreditCard,
  Wallet,
  Inbox,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Settings,
  UserCog,
  ShieldCheck,
  MapPin,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Layers,
  MonitorPlay,
  Package,
  Receipt,
  Users,
  CreditCard,
  Wallet,
  Inbox,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Settings,
  UserCog,
  ShieldCheck,
  MapPin,
}

export function NavIcon({ name, className = 'w-5 h-5 nav-icon' }: { name: string; className?: string }) {
  const I = ICONS[name] ?? LayoutDashboard
  return <I className={className} strokeWidth={2} />
}

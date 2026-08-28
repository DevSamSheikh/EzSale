import {
  LayoutDashboard,
  MonitorPlay,
  Package,
  Receipt,
  Users,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Settings,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  MonitorPlay,
  Package,
  Receipt,
  Users,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  Settings,
}

export function NavIcon({ name, className = 'w-5 h-5 nav-icon' }: { name: string; className?: string }) {
  const I = ICONS[name] ?? LayoutDashboard
  return <I className={className} strokeWidth={2} />
}

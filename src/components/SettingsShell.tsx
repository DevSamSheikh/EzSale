import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Bell,
  CheckCircle2,
  CreditCard,
  MapPin,
  MonitorPlay,
  Nfc,
  Printer,
  Receipt,
  Settings as SettingsIcon,
  ShieldCheck,
  Store,
  UserCog,
  Users,
} from 'lucide-react'
import { PageHeader } from './Primitives'

export interface SettingsSectionMeta {
  id: string
  label: string
  description: string
  icon: LucideIcon
  group: 'general' | 'commerce' | 'team' | 'account'
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: 'business',
    label: 'Business Profile',
    description: 'Name, logo, type, contact and address.',
    icon: Store,
    group: 'general',
  },
  {
    id: 'pos',
    label: 'POS Configuration',
    description: 'Default order behaviour, receipt, cart and checkout.',
    icon: MonitorPlay,
    group: 'commerce',
  },
  {
    id: 'payments',
    label: 'Payment Methods',
    description: 'Enable or disable payment options at the till.',
    icon: CreditCard,
    group: 'commerce',
  },
  {
    id: 'tax',
    label: 'Tax',
    description: 'Default rates, per-category overrides and tax ID.',
    icon: Receipt,
    group: 'commerce',
  },
  {
    id: 'currency',
    label: 'Currency & Locale',
    description: 'Currency code, decimals, separators and timezone.',
    icon: Banknote,
    group: 'general',
  },
  {
    id: 'receipt',
    label: 'Receipt',
    description: 'Header, footer, what to print and printer behaviour.',
    icon: Printer,
    group: 'commerce',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email + push alerts for orders, refunds and balances.',
    icon: Bell,
    group: 'general',
  },
  {
    id: 'membership',
    label: 'Membership Cards',
    description: 'Naming, balance rules, limits and expiry behaviour.',
    icon: CreditCard,
    group: 'commerce',
  },
  {
    id: 'nfc',
    label: 'NFC Configuration',
    description: 'Supported readers, tap behaviour and integrations.',
    icon: Nfc,
    group: 'commerce',
  },
  {
    id: 'locations',
    label: 'Locations',
    description: 'Multi-location toggles and default terminal.',
    icon: MapPin,
    group: 'general',
  },
  {
    id: 'team',
    label: 'Users & Roles',
    description: 'Manage staff and what each role can do.',
    icon: Users,
    group: 'team',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'PIN requirements, auto-lock, 2FA and IP allow-listing.',
    icon: ShieldCheck,
    group: 'team',
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Workspace owner and billing preferences.',
    icon: UserCog,
    group: 'account',
  },
]

export const SETTINGS_GROUPS: { id: SettingsSectionMeta['group']; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'team', label: 'Team & Access' },
  { id: 'account', label: 'Account' },
]

interface SettingsShellProps {
  active: string
  onSelect: (id: string) => void
  saved: boolean
  onSave: () => void
  dirty: boolean
  children: React.ReactNode
}

/**
 * Two-column layout: a sidebar of section links grouped by category, and a
 * content panel. The save button is sticky on the right.
 */
export function SettingsShell({
  active,
  onSelect,
  saved,
  onSave,
  dirty,
  children,
}: SettingsShellProps) {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace, POS, payments, and access policies."
        actions={
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty && !saved}
            className={
              saved
                ? 'inline-flex items-center gap-2 rounded-pill bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-soft'
                : 'btn-primary disabled:opacity-60'
            }
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved
              </>
            ) : (
              'Save changes'
            )}
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px,1fr]">
        <aside className="card p-3 lg:sticky lg:top-20 lg:self-start">
          <nav className="space-y-4">
            {SETTINGS_GROUPS.map((group) => (
              <div key={group.id}>
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  {group.label}
                </div>
                <ul className="space-y-1">
                  {SETTINGS_SECTIONS.filter((s) => s.group === group.id).map((s) => {
                    const Icon = s.icon
                    const on = active === s.id
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(s.id)}
                          className={
                            on
                              ? 'flex w-full items-start gap-2.5 rounded-xl bg-ink-900 px-2.5 py-2 text-left text-white'
                              : 'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-ink-700 hover:bg-ink-50'
                          }
                        >
                          <Icon
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              on ? 'text-brand-400' : 'text-ink-500'
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-xs font-bold ${
                                on ? 'text-white' : 'text-ink-900'
                              }`}
                            >
                              {s.label}
                            </span>
                            <span
                              className={`block truncate text-[11px] ${
                                on ? 'text-white/70' : 'text-ink-500'
                              }`}
                            >
                              {s.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        <section className="space-y-4">{children}</section>
      </div>
    </div>
  )
}

interface SettingCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  footer?: React.ReactNode
}

export function SettingCard({
  title,
  description,
  icon: Icon,
  children,
  footer,
}: SettingCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="border-b border-ink-100 px-5 py-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-ink-500" />}
          <div className="text-sm font-bold text-ink-900">{title}</div>
        </div>
        {description && (
          <p className="mt-0.5 text-[11px] text-ink-500">{description}</p>
        )}
      </div>
      <div className="space-y-4 px-5 py-4">{children}</div>
      {footer && (
        <div className="border-t border-ink-100 bg-ink-50/40 px-5 py-3">{footer}</div>
      )}
    </div>
  )
}

interface ToggleProps {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3 transition-colors ${
        disabled ? 'opacity-60' : 'hover:border-ink-200'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={checked ? 'switch-track-on mt-0.5 shrink-0' : 'switch-track mt-0.5 shrink-0'}
      >
        <span className={checked ? 'switch-thumb-on' : 'switch-thumb'} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink-900">{label}</div>
        {description && (
          <div className="mt-0.5 text-[11px] text-ink-500">{description}</div>
        )}
      </div>
    </label>
  )
}

interface FieldProps {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-ink-500">{hint}</div>}
    </div>
  )
}
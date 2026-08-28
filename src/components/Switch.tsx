interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        {label && <div className="text-sm font-semibold text-ink-900">{label}</div>}
        {description && <div className="mt-0.5 text-xs text-ink-500">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={checked ? 'switch-track-on' : 'switch-track'}
      >
        <span className={checked ? 'switch-thumb-on' : 'switch-thumb'} />
      </button>
    </label>
  )
}

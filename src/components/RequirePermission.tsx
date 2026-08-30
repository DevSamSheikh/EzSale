import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { operatorHas, operatorHasAny, operatorHasAll, getCurrentOperator } from '../operators-store'
import { PageHeader } from './Primitives'
import type { PermissionKey } from '../types'

export interface RequirePermissionProps {
  /** Operator must have at least one of these permission keys to view this route. */
  anyOf?: PermissionKey[]
  /** Operator must have *every* one of these permission keys to view this route. */
  allOf?: PermissionKey[]
  children: ReactNode
}

/**
 * Wraps a route so it only renders when the currently signed-in operator
 * has the required permission(s). Falls back to a friendly "no access" view
 * (so we don't show a hard 404 for a permission mismatch).
 */
export function RequirePermission({
  anyOf,
  allOf,
  children,
}: RequirePermissionProps) {
  const op = getCurrentOperator()
  const allowed = op
    ? (anyOf && anyOf.length ? operatorHasAny(op, anyOf) : true) &&
      (allOf && allOf.length ? operatorHasAll(op, allOf) : true)
    : false
  const location = useLocation()
  if (!allowed) {
    return (
      <NoAccess
        currentPath={location.pathname}
        need={anyOf ?? allOf ?? []}
        roleName={op ? null : 'signed-out'}
      />
    )
  }
  return <>{children}</>
}

export function canAny(
  keys: PermissionKey[],
): { ok: boolean; missing: PermissionKey[] } {
  const op = getCurrentOperator()
  if (!op) return { ok: false, missing: keys }
  const missing = keys.filter((k) => !operatorHas(op, k))
  return { ok: missing.length === 0, missing }
}

export function hasPerm(key: PermissionKey): boolean {
  return operatorHas(getCurrentOperator(), key)
}

function NoAccess({
  currentPath,
  need,
  roleName,
}: {
  currentPath: string
  need: PermissionKey[]
  roleName: string | null
}) {
  return (
    <div>
      <PageHeader
        title="Access restricted"
        subtitle="Your role does not have permission to view this section."
      />
      <div className="card grid place-items-center px-6 py-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-lg font-bold text-ink-900">
          You don't have access to this page
        </h3>
        <p className="mt-1 max-w-md text-sm text-ink-500">
          {roleName === 'signed-out'
            ? 'You need to sign in with an authorised account.'
            : 'Ask an administrator to grant you access, or switch to a role that includes the required permission.'}
        </p>
        {need.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            {need.map((k) => (
              <span
                key={k}
                className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 font-mono text-[11px] text-ink-700"
              >
                {k}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 flex items-center gap-2">
          <Link to="/app/dashboard" className="btn-primary">
            Back to dashboard
          </Link>
          <Link to="/app/settings" className="btn-secondary">
            Open settings
          </Link>
        </div>
        <p className="mt-4 font-mono text-[10px] text-ink-400">{currentPath}</p>
      </div>
    </div>
  )
}

/** Convenience helper for use inside pages (not a guard). */
export function requireOrNavigate(
  anyOf: PermissionKey[],
): { ok: true } | { ok: false; redirect: string } {
  const result = canAny(anyOf)
  if (result.ok) return { ok: true }
  return { ok: false, redirect: '/app/dashboard' }
}

// Re-export for convenience
export { Navigate }
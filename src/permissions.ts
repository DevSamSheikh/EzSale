import type { PermissionGroup, PermissionKey, Role } from './types'

/**
 * Authoritative list of permission groups shown in the role editor UI. Order
 * here determines display order. Each `permissions` entry must be a unique
 * `PermissionKey` and the prefix of the key should match the group `id`.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview of sales, KPIs, and quick actions.',
    permissions: [
      {
        key: 'dashboard.view',
        label: 'View dashboard',
        description: 'See the home dashboard and KPI tiles.',
      },
    ],
  },
  {
    id: 'pos',
    label: 'POS',
    description: 'Point of sale — ringing up orders, accepting payments.',
    permissions: [
      {
        key: 'pos.use',
        label: 'Use POS',
        description: 'Open the POS screen and process sales.',
      },
      {
        key: 'pos.refund',
        label: 'Issue POS refunds',
        description: 'Refund a sale immediately after ringing it up.',
      },
      {
        key: 'pos.adjust',
        label: 'Apply POS adjustments',
        description: 'Apply manual discounts / corrections at the till.',
      },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Manage the catalog and inventory.',
    permissions: [
      { key: 'products.view', label: 'View products' },
      {
        key: 'products.manage',
        label: 'Create / edit products',
        description: 'Add, edit, or archive catalog items.',
      },
    ],
  },
  {
    id: 'categories',
    label: 'Categories',
    description: 'Organise products into categories.',
    permissions: [
      { key: 'categories.view', label: 'View categories' },
      { key: 'categories.manage', label: 'Create / edit categories' },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Review and manage historical orders.',
    permissions: [
      { key: 'orders.view', label: 'View orders' },
      { key: 'orders.manage', label: 'Edit / cancel orders' },
      { key: 'orders.refund', label: 'Refund orders' },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Customers / members of the loyalty programme.',
    permissions: [
      { key: 'users.view', label: 'View users' },
      {
        key: 'users.manage',
        label: 'Create / edit users',
        description: 'Add, edit, suspend, or delete customers.',
      },
    ],
  },
  {
    id: 'cards',
    label: 'Cards',
    description: 'Loyalty / membership cards.',
    permissions: [
      { key: 'cards.view', label: 'View cards' },
      { key: 'cards.manage', label: 'Issue / edit cards' },
    ],
  },
  {
    id: 'deposits',
    label: 'Deposits',
    description: 'Top-ups and balance deposits for cards.',
    permissions: [
      { key: 'deposits.view', label: 'View deposits' },
      { key: 'deposits.manage', label: 'Process deposits' },
    ],
  },
  {
    id: 'depositRequests',
    label: 'Deposit requests',
    description: 'Customer-submitted top-up requests awaiting approval.',
    permissions: [
      { key: 'depositRequests.view', label: 'View requests' },
      { key: 'depositRequests.manage', label: 'Approve / reject requests' },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Financial transactions, refunds, and audit log.',
    permissions: [
      { key: 'transactions.view', label: 'View transactions' },
      { key: 'transactions.refund', label: 'Refund transactions' },
      { key: 'transactions.adjust', label: 'Adjust transactions' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'End-of-day / scheduled business reports.',
    permissions: [{ key: 'reports.view', label: 'View reports' }],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Sales, retention, and performance analytics.',
    permissions: [{ key: 'analytics.view', label: 'View analytics' }],
  },
  {
    id: 'staff',
    label: 'Staff',
    description: 'Manage employees who can sign in to the dashboard.',
    permissions: [
      { key: 'staff.view', label: 'View staff' },
      { key: 'staff.manage', label: 'Invite / edit / deactivate staff' },
    ],
  },
  {
    id: 'roles',
    label: 'Roles & permissions',
    description: 'Define what staff can do.',
    permissions: [
      { key: 'roles.view', label: 'View roles' },
      { key: 'roles.manage', label: 'Create / edit roles' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Business configuration, integrations, and tax.',
    permissions: [
      { key: 'settings.view', label: 'View settings' },
      { key: 'settings.manage', label: 'Change settings' },
    ],
  },
]

/** Flat list of every permission key — useful for "select all" toggles. */
export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions.map((p) => p.key),
)

/** Built-in role definitions. These are seeded on first load. */
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description:
      'Unrestricted access. Can configure the platform, manage billing, and manage roles.',
    system: true,
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    id: 'role-business-admin',
    name: 'Business Admin',
    description:
      'Owner / GM. Full access to everything except platform-level settings.',
    system: true,
    permissions: ALL_PERMISSION_KEYS.filter((k) => k !== 'settings.manage'),
  },
  {
    id: 'role-manager',
    name: 'Manager',
    description:
      'Floor / shift manager. Can run the POS, refund, and review reports — but cannot edit roles or settings.',
    system: true,
    permissions: [
      'dashboard.view',
      'pos.use',
      'pos.refund',
      'pos.adjust',
      'products.view',
      'products.manage',
      'categories.view',
      'categories.manage',
      'orders.view',
      'orders.manage',
      'orders.refund',
      'users.view',
      'users.manage',
      'cards.view',
      'cards.manage',
      'deposits.view',
      'deposits.manage',
      'depositRequests.view',
      'depositRequests.manage',
      'transactions.view',
      'transactions.refund',
      'transactions.adjust',
      'reports.view',
      'analytics.view',
      'staff.view',
      'settings.view',
    ],
  },
  {
    id: 'role-pos-operator',
    name: 'POS Operator / Cashier',
    description:
      'Daily checkout. Sees only the POS and limited dashboard info.',
    system: true,
    permissions: ['dashboard.view', 'pos.use', 'pos.refund'],
  },
  {
    id: 'role-accountant',
    name: 'Accountant',
    description:
      'Read-only access to financial data with refund authority but no operational edits.',
    system: true,
    permissions: [
      'dashboard.view',
      'orders.view',
      'transactions.view',
      'transactions.refund',
      'transactions.adjust',
      'reports.view',
      'analytics.view',
      'users.view',
      'deposits.view',
      'cards.view',
    ],
  },
  {
    id: 'role-read-only',
    name: 'Read-Only User',
    description: 'Can view dashboards and reports. No edits, no POS access.',
    system: true,
    permissions: [
      'dashboard.view',
      'products.view',
      'categories.view',
      'orders.view',
      'users.view',
      'cards.view',
      'deposits.view',
      'transactions.view',
      'reports.view',
      'analytics.view',
      'staff.view',
      'roles.view',
      'settings.view',
    ],
  },
]

/** Map a permission key to its sidebar / nav parent so we can hide nav items. */
export const PERMISSION_TO_NAV: Record<string, string> = {
  'dashboard.view': '/app/dashboard',
  'pos.use': '/app/pos',
  'products.view': '/app/products',
  'categories.view': '/app/categories',
  'orders.view': '/app/orders',
  'users.view': '/app/users',
  'cards.view': '/app/cards',
  'deposits.view': '/app/deposits',
  'depositRequests.view': '/app/deposit-requests',
  'transactions.view': '/app/transactions',
  'reports.view': '/app/reports',
  'analytics.view': '/app/analytics',
  'roles.view': '/app/roles',
  'settings.view': '/app/settings',
  'staff.view': '/app/staff',
  'settings.manage': '/app/locations',
}
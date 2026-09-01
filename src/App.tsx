import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AppShell from './components/AppShell'
import { applyTheme, getTheme } from './theme'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPage from './pages/auth/ForgotPage'
import SetupWizard from './pages/SetupWizard'
import DashboardPage from './pages/app/DashboardPage'
import POSPage from './pages/app/POSPage'
import POSPaymentPage from './pages/app/POSPaymentPage'
import POSReceiptPage from './pages/app/POSReceiptPage'
import ProductsPage from './pages/app/ProductsPage'
import CategoriesPage from './pages/app/CategoriesPage'
import OrdersPage from './pages/app/OrdersPage'
import UsersPage from './pages/app/UsersPage'
import UserDetailsPage from './pages/app/UserDetailsPage'
import CardsPage from './pages/app/CardsPage'
import CardDetailsPage from './pages/app/CardDetailsPage'
import DepositsPage from './pages/app/DepositsPage'
import DepositRequestsPage from './pages/app/DepositRequestsPage'
import TransactionsPage from './pages/app/TransactionsPage'
import ReportsPage from './pages/app/ReportsPage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import SettingsPage from './pages/app/SettingsPage'
import PortalLandingPage from './pages/portal/PortalLandingPage'
import PortalDashboardPage from './pages/portal/PortalDashboardPage'
import OperatorsPage from './pages/app/OperatorsPage'
import OperatorDetailsPage from './pages/app/OperatorDetailsPage'
import RolesPage from './pages/app/RolesPage'
import LocationsPage from './pages/app/LocationsPage'
import NotificationsPage from './pages/app/NotificationsPage'
import { getAuth, getBusiness } from './store'
import { warmStores } from './seed-orders'
import { RequirePermission } from './components/RequirePermission'

warmStores()

function RequireAuth({ children }: { children: JSX.Element }) {
  const auth = getAuth()
  const location = useLocation()
  if (!auth) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function RequireOnboarding({ children }: { children: JSX.Element }) {
  const onboarded = localStorage.getItem('ezsale:onboarded')
  const business = getBusiness()
  if (!onboarded || !business) return <Navigate to="/setup" replace />
  return children
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function ThemeSync() {
  useEffect(() => {
    // Re-apply the saved theme in case the bootstrap script didn't run
    // (e.g. during hot reload) so the DOM and the saved theme stay in sync.
    applyTheme(getTheme())
  }, [])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Navigate to="/app/pos" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route
          path="/setup"
          element={
            <RequireAuth>
              <SetupWizard />
            </RequireAuth>
          }
        />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <RequireOnboarding>
                <AppShell />
              </RequireOnboarding>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="pos" replace />} />
          <Route
            path="dashboard"
            element={
              <RequirePermission anyOf={['dashboard.view']}>
                <DashboardPage />
              </RequirePermission>
            }
          />
          <Route
            path="pos"
            element={
              <RequirePermission anyOf={['pos.use']}>
                <POSPage />
              </RequirePermission>
            }
          />
          <Route
            path="pos/payment"
            element={
              <RequirePermission anyOf={['pos.use']}>
                <POSPaymentPage />
              </RequirePermission>
            }
          />
          <Route
            path="pos/receipt/:txnId"
            element={
              <RequirePermission anyOf={['transactions.view', 'pos.use']}>
                <POSReceiptPage />
              </RequirePermission>
            }
          />
          <Route
            path="products"
            element={
              <RequirePermission anyOf={['products.view']}>
                <ProductsPage />
              </RequirePermission>
            }
          />
          <Route
            path="categories"
            element={
              <RequirePermission anyOf={['categories.view']}>
                <CategoriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="orders"
            element={
              <RequirePermission anyOf={['orders.view']}>
                <OrdersPage />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission anyOf={['users.view']}>
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="users/:memberId"
            element={
              <RequirePermission anyOf={['users.view']}>
                <UserDetailsPage />
              </RequirePermission>
            }
          />
          <Route
            path="cards"
            element={
              <RequirePermission anyOf={['cards.view']}>
                <CardsPage />
              </RequirePermission>
            }
          />
          <Route
            path="cards/:cardId"
            element={
              <RequirePermission anyOf={['cards.view']}>
                <CardDetailsPage />
              </RequirePermission>
            }
          />
          <Route
            path="deposits"
            element={
              <RequirePermission anyOf={['deposits.view']}>
                <DepositsPage />
              </RequirePermission>
            }
          />
          <Route
            path="deposit-requests"
            element={
              <RequirePermission anyOf={['depositRequests.view']}>
                <DepositRequestsPage />
              </RequirePermission>
            }
          />
          <Route
            path="transactions"
            element={
              <RequirePermission anyOf={['transactions.view']}>
                <TransactionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="reports"
            element={
              <RequirePermission anyOf={['reports.view']}>
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission anyOf={['analytics.view']}>
                <AnalyticsPage />
              </RequirePermission>
            }
          />
          <Route
            path="staff"
            element={
              <RequirePermission anyOf={['staff.view']}>
                <OperatorsPage />
              </RequirePermission>
            }
          />
          <Route
            path="staff/:operatorId"
            element={
              <RequirePermission anyOf={['staff.view']}>
                <OperatorDetailsPage />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission anyOf={['roles.view']}>
                <RolesPage />
              </RequirePermission>
            }
          />
          <Route
            path="locations"
            element={
              <RequirePermission anyOf={['settings.view', 'settings.manage', 'staff.view']}>
                <LocationsPage />
              </RequirePermission>
            }
          />
          <Route
            path="notifications"
            element={
              <RequirePermission anyOf={['notifications.view']}>
                <NotificationsPage />
              </RequirePermission>
            }
          />
          <Route
            path="settings"
            element={
              <RequirePermission anyOf={['settings.view']}>
                <SettingsPage />
              </RequirePermission>
            }
          />
        </Route>
        <Route path="/u/identify" element={<PortalLandingPage />} />
        <Route path="/u/:slug" element={<PortalDashboardPage />} />
        <Route path="/portal" element={<Navigate to="/u/identify" replace />} />
        <Route path="*" element={<Navigate to="/app/pos" replace />} />
      </Routes>
    </>
  )
}

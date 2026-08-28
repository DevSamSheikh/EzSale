import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import AppShell from './components/AppShell'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import ForgotPage from './pages/auth/ForgotPage'
import SetupWizard from './pages/SetupWizard'
import DashboardPage from './pages/app/DashboardPage'
import POSPage from './pages/app/POSPage'
import POSPaymentPage from './pages/app/POSPaymentPage'
import POSReceiptPage from './pages/app/POSReceiptPage'
import ProductsPage from './pages/app/ProductsPage'
import OrdersPage from './pages/app/OrdersPage'
import UsersPage from './pages/app/UsersPage'
import UserDetailsPage from './pages/app/UserDetailsPage'
import CardsPage from './pages/app/CardsPage'
import CardDetailsPage from './pages/app/CardDetailsPage'
import DepositsPage from './pages/app/DepositsPage'
import TransactionsPage from './pages/app/TransactionsPage'
import ReportsPage from './pages/app/ReportsPage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import SettingsPage from './pages/app/SettingsPage'
import { getAuth, getBusiness } from './store'

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

export default function App() {
  return (
    <>
      <ScrollToTop />
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
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="pos/payment" element={<POSPaymentPage />} />
          <Route path="pos/receipt/:txnId" element={<POSReceiptPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:memberId" element={<UserDetailsPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="cards/:cardId" element={<CardDetailsPage />} />
          <Route path="deposits" element={<DepositsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/app/pos" replace />} />
      </Routes>
    </>
  )
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TradeHistory from './pages/TradeHistory'
import TradeForm from './pages/TradeForm'
import Settings from './pages/Settings'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import TradingNotes from './pages/TradingNotes'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function AuthenticatedRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <SignUp /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trades"
        element={
          <ProtectedRoute>
            <Layout>
              <TradeHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trade/new"
        element={
          <ProtectedRoute>
            <Layout>
              <TradeForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trade/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <TradeForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trading-notes"
        element={
          <ProtectedRoute>
            <Layout>
              <TradingNotes />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthenticatedRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App 
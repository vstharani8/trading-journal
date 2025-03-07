import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TradeList from './pages/TradeList'
import TradeForm from './pages/TradeForm'
import Settings from './pages/Settings'
import { db } from './services/db'

function App() {
  useEffect(() => {
    const migrateData = async () => {
      try {
        await db.migrateFromLocalStorage()
        // Attempt recovery if needed
        const hasRecovered = await db.attemptRecovery()
        if (hasRecovered) {
          console.log('Successfully recovered trades from localStorage')
        }
      } catch (error) {
        console.error('Error migrating data:', error)
      }
    }
    migrateData()
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">Trading Journal</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/trades"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Trades
                  </Link>
                  <Link
                    to="/settings"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/trades/new" element={<TradeForm />} />
            <Route path="/trades/:id" element={<TradeForm />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App 
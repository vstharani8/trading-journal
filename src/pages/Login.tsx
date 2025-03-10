import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import '../styles/login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      const { error } = await db.supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex relative overflow-hidden bg-market-gradient bg-glow">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dynamic Chart Lines */}
        <svg className="absolute w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            d="M0,50 Q25,45 50,55 T100,50"
            className="stroke-blue-500/50 animate-chart"
            fill="none"
            strokeWidth="0.2"
          />
          <path
            d="M0,30 Q35,55 70,35 T100,40"
            className="stroke-purple-500/50 animate-chart"
            fill="none"
            strokeWidth="0.2"
            style={{ animationDelay: '1s' }}
          />
          <path
            d="M0,70 Q45,35 80,55 T100,60"
            className="stroke-pink-500/50 animate-chart"
            fill="none"
            strokeWidth="0.2"
            style={{ animationDelay: '2s' }}
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative w-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Features */}
          <div className="hidden lg:block">
            <h1 className="text-4xl font-bold text-white mb-8">
              Track Your Trades.<br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                Improve Your Performance.
              </span>
            </h1>

            {/* Features Grid */}
            <div className="space-y-6">
              {/* Performance Analytics */}
              <div className="glass-dark rounded-xl p-6 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Performance Analytics</h3>
                    <p className="text-gray-400">Track and analyze your trading performance with detailed metrics</p>
                  </div>
                </div>
              </div>

              {/* Real-time Tracking */}
              <div className="glass-dark rounded-xl p-6 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Real-time Tracking</h3>
                    <p className="text-gray-400">Monitor your trades and get instant insights as you trade</p>
                  </div>
                </div>
              </div>

              {/* Quick Entry */}
              <div className="glass-dark rounded-xl p-6 transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Quick Entry</h3>
                    <p className="text-gray-400">Easily log your trades with our streamlined entry system</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
                TradingJournal
              </h1>
            </div>

            {/* Login Form */}
            <div className="glass-dark rounded-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-white mb-2">Welcome back, trader</h2>
                <p className="text-sm text-gray-400">Your journey to profitable trading starts here</p>
              </div>

              {error && (
                <div className="mb-6 bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-modern w-full px-4 py-2.5 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition duration-200 placeholder-gray-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-modern w-full px-4 py-2.5 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition duration-200 placeholder-gray-500"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 bg-gray-800 border-gray-700 rounded text-blue-500 focus:ring-blue-500/40 focus:ring-offset-gray-900"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                      Remember me
                    </label>
                  </div>
                  <Link to="/forgot-password" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-glow w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-all duration-200 shadow-lg shadow-blue-500/20"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Sign in to trade'
                  )}
                </button>

                <p className="mt-6 text-center text-sm text-gray-400">
                  New to trading?{' '}
                  <Link to="/signup" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    Create your account
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} TradingJournal. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
} 
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
      console.log('Attempting to sign in...')
      
      if (!db.supabase) {
        throw new Error('Supabase client is not initialized')
      }

      const { data, error } = await db.supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Supabase auth error:', error)
        throw error
      }

      if (!data.session) {
        throw new Error('No session returned from Supabase')
      }

      console.log('Sign in successful')
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to sign in. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-400">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-400 hover:text-blue-300">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 
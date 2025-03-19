import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ReminderSettings {
  reminder_enabled: boolean
  reminder_frequency: 'immediate' | 'bi-weekly' | 'monthly' | null
  reminder_day: number | null
  reminder_time: string | null
  reminder_email: string | null
}

export function ReminderSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<ReminderSettings>({
    reminder_enabled: false,
    reminder_frequency: null,
    reminder_day: null,
    reminder_time: null,
    reminder_email: null
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('reminder_enabled, reminder_frequency, reminder_day, reminder_time, reminder_email')
        .eq('user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"

      if (data) {
        setSettings({
          reminder_enabled: data.reminder_enabled || false,
          reminder_frequency: data.reminder_frequency || null,
          reminder_day: data.reminder_day || null,
          reminder_time: data.reminder_time || null,
          reminder_email: data.reminder_email || null
        })
      }
    } catch (error) {
      console.error('Error fetching reminder settings:', error)
      setMessage({ type: 'error', text: 'Failed to load reminder settings' })
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      
      // Check if settings already exist for this user
      const { data: existingSettings, error: checkError } = await supabase
        .from('reminder_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') throw checkError

      // Prepare the settings data
      const settingsData = {
        user_id: user.id,
        reminder_enabled: settings.reminder_enabled,
        reminder_frequency: settings.reminder_enabled ? settings.reminder_frequency : null,
        reminder_day: settings.reminder_enabled && settings.reminder_frequency === 'monthly' ? settings.reminder_day : null,
        reminder_time: settings.reminder_enabled && settings.reminder_frequency !== 'immediate' ? settings.reminder_time : null,
        reminder_email: settings.reminder_enabled ? settings.reminder_email : null,
        updated_at: new Date().toISOString()
      }

      let saveError
      if (existingSettings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('reminder_settings')
          .update(settingsData)
          .eq('id', existingSettings.id)
        saveError = error
      } else {
        // Insert new settings
        const { error } = await supabase
          .from('reminder_settings')
          .insert([settingsData])
        saveError = error
      }

      if (saveError) throw saveError

      // If immediate reminder is selected, trigger the email
      if (settings.reminder_enabled && settings.reminder_frequency === 'immediate' && settings.reminder_email) {
        console.log('Triggering immediate email reminder...')
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'stock-purchase-reminder',
          {
            body: {
              type: 'immediate',
              email: settings.reminder_email,
              userId: user.id
            }
          }
        )

        if (functionError) {
          console.error('Error triggering immediate reminder:', functionError)
          throw functionError
        }

        console.log('Immediate reminder response:', functionData)
      }

      setMessage({ type: 'success', text: 'Reminder settings updated successfully' })
    } catch (error) {
      console.error('Error updating reminder settings:', error)
      setMessage({ type: 'error', text: 'Failed to update reminder settings' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  }

  return (
    <form onSubmit={updateSettings} className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        } flex items-center`}>
          <div className={`flex-shrink-0 w-4 h-4 mr-2 ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}>
            {message.type === 'success' ? (
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          {message.text}
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={settings.reminder_enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, reminder_enabled: e.target.checked }))}
              className="sr-only"
            />
            <div className={`block w-14 h-8 rounded-full transition-colors duration-200 ease-in-out ${settings.reminder_enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out ${settings.reminder_enabled ? 'transform translate-x-6' : ''}`}></div>
          </div>
          <span className="text-lg font-medium text-gray-900">Enable Stock Purchase Reminders</span>
        </label>
      </div>

      {settings.reminder_enabled && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder Frequency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['immediate', 'bi-weekly', 'monthly'].map((frequency) => (
                <button
                  key={frequency}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, reminder_frequency: frequency as ReminderSettings['reminder_frequency'] }))}
                  className={`flex items-center justify-center px-4 py-3 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                    settings.reminder_frequency === frequency
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {settings.reminder_frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={settings.reminder_day || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, reminder_day: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          )}

          {settings.reminder_frequency !== 'immediate' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={settings.reminder_time || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, reminder_time: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={settings.reminder_email || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, reminder_email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Reminder Settings'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  )
} 
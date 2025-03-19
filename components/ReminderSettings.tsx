'use client'

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ReminderSettings {
  reminder_enabled: boolean;
  reminder_frequency: 'bi-weekly' | 'monthly' | null;
  reminder_day: number | null;
  reminder_time: string | null;
  reminder_email: string | null;
}

export function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>({
    reminder_enabled: false,
    reminder_frequency: null,
    reminder_day: null,
    reminder_time: null,
    reminder_email: null,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('reminder_settings')
        .select('reminder_enabled, reminder_frequency, reminder_day, reminder_time, reminder_email')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateSettings(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reminder_settings')
        .upsert({
          user_id: user.id,
          reminder_enabled: settings.reminder_enabled,
          reminder_frequency: settings.reminder_enabled ? settings.reminder_frequency : null,
          reminder_day: settings.reminder_enabled ? settings.reminder_day : null,
          reminder_time: settings.reminder_enabled ? settings.reminder_time : null,
          reminder_email: settings.reminder_enabled ? settings.reminder_email : null,
        });

      if (error) throw error;
      setMessage('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage('Error updating settings. Please try again.');
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={updateSettings} className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="reminder_enabled"
            checked={settings.reminder_enabled}
            onChange={(e) => setSettings({ ...settings, reminder_enabled: e.target.checked })}
            className="h-4 w-4 text-blue-600"
          />
          <label htmlFor="reminder_enabled" className="text-sm font-medium">
            Enable Stock Purchase Reminders
          </label>
        </div>

        {settings.reminder_enabled && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select
                value={settings.reminder_frequency || ''}
                onChange={(e) => setSettings({ ...settings, reminder_frequency: e.target.value as 'bi-weekly' | 'monthly' })}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="">Select frequency</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={settings.reminder_day || ''}
                onChange={(e) => setSettings({ ...settings, reminder_day: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={settings.reminder_time || ''}
                onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={settings.reminder_email || ''}
                onChange={(e) => setSettings({ ...settings, reminder_email: e.target.value })}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
          </>
        )}

        {message && (
          <div className={`p-3 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
      </form>
    </div>
  );
} 
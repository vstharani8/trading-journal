'use client'

import React from 'react'
import { ReminderSettings } from '../../../components/ReminderSettings'

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Stock Purchase Reminders</h2>
          <ReminderSettings />
        </section>
        
        {/* Add other settings sections here */}
      </div>
    </div>
  )
} 
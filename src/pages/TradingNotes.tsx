import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db, TradingNote } from '../services/supabase'

type NoteType = TradingNote['type']

export default function TradingNotes() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<NoteType>('trade_notes')
  const [notes, setNotes] = useState<TradingNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [editingNote, setEditingNote] = useState<TradingNote | null>(null)

  const tabs: { type: NoteType; label: string }[] = [
    { type: 'trade_notes', label: 'Trade Notes' },
    { type: 'trading_goals', label: 'Trading Goals' },
    { type: 'trading_plan', label: 'Trading Plan' },
    { type: 'mistakes_reflection', label: 'Mistakes Reflection' }
  ]

  useEffect(() => {
    loadNotes()
  }, [activeTab])

  const loadNotes = async () => {
    try {
      const notes = await db.getTradingNotesByType(activeTab)
      setNotes(notes)
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      if (editingNote) {
        await db.updateTradingNote({
          ...editingNote,
          content: newNote
        })
      } else {
        await db.addTradingNote({
          user_id: user!.id,
          type: activeTab,
          content: newNote
        })
      }
      setNewNote('')
      setEditingNote(null)
      loadNotes()
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const handleEdit = (note: TradingNote) => {
    setEditingNote(note)
    setNewNote(note.content)
  }

  const handleDelete = async (id: string) => {
    try {
      await db.deleteTradingNote(id)
      loadNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === type
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={`Add a new ${activeTab.replace('_', ' ')}...`}
            className="w-full h-32 p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {editingNote ? 'Update Note' : 'Add Note'}
          </button>
          {editingNote && (
            <button
              type="button"
              onClick={() => {
                setEditingNote(null)
                setNewNote('')
              }}
              className="ml-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(note)}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
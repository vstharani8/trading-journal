import { useState } from 'react';
import { Menu } from '@headlessui/react';
import { 
    PlusIcon, 
    EllipsisVerticalIcon, 
    DocumentTextIcon,
    CalendarIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Note, CreateNoteInput } from '../../types/notes';
import { createNote, deleteNote } from '../../lib/notes';

interface NoteListProps {
    notes: Note[];
    selectedFolderId: string | null;
    onNotesChange: () => void;
    onNoteSelect: (note: Note) => void;
}

function stripHtml(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

export function NoteList({
    notes,
    selectedFolderId,
    onNotesChange,
    onNoteSelect
}: NoteListProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState('');

    const handleCreateNote = async () => {
        if (!newNoteTitle.trim() || !selectedFolderId) return;

        try {
            const input: CreateNoteInput = {
                title: newNoteTitle,
                folder_id: selectedFolderId,
                content: ''
            };
            const note = await createNote(input);
            setNewNoteTitle('');
            setIsCreating(false);
            onNotesChange();
            onNoteSelect(note);
        } catch (error) {
            console.error('Error creating note:', error);
        }
    };

    const handleDeleteNote = async (id: string) => {
        try {
            await deleteNote(id);
            onNotesChange();
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Notes</h2>
                {selectedFolderId && (
                    <button
                        type="button"
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setIsCreating(true)}
                    >
                        <PlusIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="px-4 flex gap-2">
                    <input
                        type="text"
                        value={newNoteTitle}
                        onChange={(e) => setNewNoteTitle(e.target.value)}
                        placeholder="Note title"
                        className="flex-1 h-8 px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateNote();
                            if (e.key === 'Escape') {
                                setIsCreating(false);
                                setNewNoteTitle('');
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="px-3 h-8 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        onClick={handleCreateNote}
                    >
                        Create
                    </button>
                </div>
            )}

            <div className="space-y-2">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => onNoteSelect(note)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                                <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-1" />
                                <div>
                                    <h3 className="text-sm font-medium">{note.title}</h3>
                                    {note.content && (
                                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                                            {stripHtml(note.content)}
                                        </p>
                                    )}
                                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                        <div className="flex items-center">
                                            <CalendarIcon className="h-4 w-4 mr-1" />
                                            {format(new Date(note.created_at), 'MMM d, yyyy')}
                                        </div>
                                        {note.trade_id && (
                                            <div className="flex items-center">
                                                <ChartBarIcon className="h-4 w-4 mr-1" />
                                                Linked to trade
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Menu as="div" className="relative">
                                <Menu.Button
                                    className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <EllipsisVerticalIcon className="h-5 w-5" />
                                </Menu.Button>
                                <Menu.Items
                                    className="absolute right-0 mt-1 w-48 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                >
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                className={`${
                                                    active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                } group flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteNote(note.id);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </Menu.Item>
                                </Menu.Items>
                            </Menu>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 
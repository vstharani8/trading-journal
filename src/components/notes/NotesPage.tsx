import { useState, useEffect } from 'react';
import { Folder, Note } from '../../types/notes';
import { getFolders, getAllNotes, getNotesByFolder, createDefaultFolders } from '../../lib/notes';
import { FolderList } from './FolderList';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { NoteSearch } from './NoteSearch';

export function NotesPage() {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Note[] | null>(null);

    const loadFolders = async () => {
        try {
            // Create default folders if they don't exist
            await createDefaultFolders();
            
            // Then load all folders
            const data = await getFolders();
            setFolders(data);
            
            // Select the first folder by default
            if (data.length > 0 && !selectedFolderId) {
                setSelectedFolderId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading folders:', error);
        }
    };

    const loadNotes = async () => {
        try {
            const data = selectedFolderId
                ? await getNotesByFolder(selectedFolderId)
                : await getAllNotes();
            setNotes(data);
            
            // Clear selected note if it's not in the current folder
            if (selectedNote && !data.find(note => note.id === selectedNote.id)) {
                setSelectedNote(null);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await loadFolders();
            setIsLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        if (selectedFolderId || selectedFolderId === null) {
            loadNotes();
        }
    }, [selectedFolderId]);

    const handleFolderSelect = (folderId: string | null) => {
        setSelectedFolderId(folderId);
        setSelectedNote(null);
        setSearchResults(null);
        setIsSearching(false);
    };

    const handleNoteSelect = (note: Note) => {
        setSelectedNote(note);
    };

    const handleSearchResults = (results: Note[]) => {
        setSearchResults(results);
        setIsSearching(true);
        
        // If there are results, select the first one
        if (results.length > 0) {
            setSelectedNote(results[0]);
        } else {
            setSelectedNote(null);
        }
    };

    const handleClearSearch = () => {
        setSearchResults(null);
        setIsSearching(false);
        loadNotes();
    };

    const displayedNotes = searchResults || notes;

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700">
                <FolderList
                    folders={folders}
                    selectedFolderId={selectedFolderId}
                    onFolderSelect={handleFolderSelect}
                    onFoldersChange={loadFolders}
                />
            </div>

            {/* Notes List */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <NoteSearch 
                        onSearchResults={handleSearchResults}
                        onClearSearch={handleClearSearch}
                    />
                </div>
                <div className="flex-1 overflow-auto">
                    <NoteList
                        notes={displayedNotes}
                        selectedFolderId={selectedFolderId}
                        onNotesChange={isSearching ? handleClearSearch : loadNotes}
                        onNoteSelect={handleNoteSelect}
                    />
                </div>
            </div>

            {/* Note Editor */}
            <div className="flex-1">
                {selectedNote ? (
                    <NoteEditor
                        note={selectedNote}
                        onNoteChange={isSearching ? handleClearSearch : loadNotes}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        Select a note to view or create a new one
                    </div>
                )}
            </div>
        </div>
    );
} 
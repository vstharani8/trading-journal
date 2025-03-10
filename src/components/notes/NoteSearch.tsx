import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchNotes } from '../../lib/notes';
import { Note } from '../../types/notes';

interface NoteSearchProps {
    onSearchResults: (notes: Note[]) => void;
    onClearSearch: () => void;
}

export function NoteSearch({ onSearchResults, onClearSearch }: NoteSearchProps) {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) {
            onClearSearch();
            return;
        }

        try {
            setIsSearching(true);
            const results = await searchNotes(query);
            onSearchResults(results);
        } catch (error) {
            console.error('Error searching notes:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        onClearSearch();
    };

    return (
        <div className="relative">
            <div className="flex items-center">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search notes..."
                        className="w-full pl-10 pr-10 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSearch();
                            if (e.key === 'Escape') handleClear();
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            onClick={handleClear}
                        >
                            <XMarkIcon className="h-4 w-4 text-gray-400" />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    className="ml-2 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleSearch}
                    disabled={isSearching}
                >
                    {isSearching ? 'Searching...' : 'Search'}
                </button>
            </div>
        </div>
    );
} 
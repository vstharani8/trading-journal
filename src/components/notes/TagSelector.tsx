import { useState, useEffect } from 'react';
import { Tag, CreateTagInput } from '../../types/notes';
import { getTags, createTag, addTagToNote, removeTagFromNote } from '../../lib/notes';
import { TagIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TagSelectorProps {
    noteId: string;
    selectedTags: Tag[];
    onTagsChange: () => void;
}

const TAG_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#84cc16', // lime
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#d946ef', // fuchsia
    '#64748b', // slate
];

export function TagSelector({ noteId, selectedTags, onTagsChange }: TagSelectorProps) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        loadTags();
    }, []);

    const loadTags = async () => {
        try {
            const data = await getTags();
            setTags(data);
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;

        try {
            const input: CreateTagInput = {
                name: newTagName,
                color: selectedColor
            };
            await createTag(input);
            setNewTagName('');
            setIsCreating(false);
            await loadTags();
        } catch (error) {
            console.error('Error creating tag:', error);
        }
    };

    const handleAddTag = async (tag: Tag) => {
        try {
            await addTagToNote({
                note_id: noteId,
                tag_id: tag.id
            });
            onTagsChange();
            setIsDropdownOpen(false);
        } catch (error) {
            console.error('Error adding tag to note:', error);
        }
    };

    const handleRemoveTag = async (tag: Tag) => {
        try {
            await removeTagFromNote({
                note_id: noteId,
                tag_id: tag.id
            });
            onTagsChange();
        } catch (error) {
            console.error('Error removing tag from note:', error);
        }
    };

    const isTagSelected = (tagId: string) => {
        return selectedTags.some(tag => tag.id === tagId);
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                    <div
                        key={tag.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
                        style={{ backgroundColor: tag.color }}
                    >
                        <span>{tag.name}</span>
                        <button
                            type="button"
                            className="hover:bg-white/20 rounded-full p-0.5"
                            onClick={() => handleRemoveTag(tag)}
                        >
                            <XMarkIcon className="h-3 w-3" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <TagIcon className="h-3 w-3" />
                    <span>Add tag</span>
                </button>
            </div>

            {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-64 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="p-2">
                        <div className="mb-2">
                            <input
                                type="text"
                                placeholder="Search tags..."
                                className="w-full px-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {tags.map(tag => (
                                <div
                                    key={tag.id}
                                    className={`flex items-center justify-between px-2 py-1.5 text-sm rounded-md cursor-pointer ${
                                        isTagSelected(tag.id) ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                    onClick={() => !isTagSelected(tag.id) && handleAddTag(tag)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }}></div>
                                        <span>{tag.name}</span>
                                    </div>
                                    {isTagSelected(tag.id) && (
                                        <span className="text-xs text-gray-500">Added</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {!isCreating ? (
                            <button
                                type="button"
                                className="flex items-center gap-1 w-full px-2 py-1.5 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                                onClick={() => setIsCreating(true)}
                            >
                                <PlusIcon className="h-4 w-4" />
                                <span>Create new tag</span>
                            </button>
                        ) : (
                            <div className="mt-2 p-2 border-t border-gray-200 dark:border-gray-700">
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => setNewTagName(e.target.value)}
                                    placeholder="Tag name"
                                    className="w-full px-2 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 mb-2"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateTag();
                                        if (e.key === 'Escape') {
                                            setIsCreating(false);
                                            setNewTagName('');
                                        }
                                    }}
                                />
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {TAG_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`h-5 w-5 rounded-full ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setSelectedColor(color)}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setNewTagName('');
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                        onClick={handleCreateTag}
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 
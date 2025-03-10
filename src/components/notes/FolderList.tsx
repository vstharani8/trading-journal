import { useState } from 'react';
import { Menu } from '@headlessui/react';
import { PlusIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Folder } from '../../types/notes';
import { createFolder, deleteFolder } from '../../lib/notes';

interface FolderListProps {
    folders: Folder[];
    selectedFolderId: string | null;
    onFolderSelect: (folderId: string | null) => void;
    onFoldersChange: () => void;
}

export function FolderList({ 
    folders, 
    selectedFolderId, 
    onFolderSelect,
    onFoldersChange 
}: FolderListProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        
        try {
            await createFolder({ 
                name: newFolderName,
                icon: '📁',
                color: '#64748b'
            });
            setNewFolderName('');
            setIsCreating(false);
            onFoldersChange();
        } catch (error) {
            console.error('Error creating folder:', error);
        }
    };

    const handleDeleteFolder = async (id: string) => {
        try {
            await deleteFolder(id);
            if (selectedFolderId === id) {
                onFolderSelect(null);
            }
            onFoldersChange();
        } catch (error) {
            console.error('Error deleting folder:', error);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-4 py-2">
                <h2 className="text-lg font-semibold">Folders</h2>
                <button
                    type="button"
                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setIsCreating(true)}
                >
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>

            {isCreating && (
                <div className="px-4 flex gap-2">
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name"
                        className="flex-1 h-8 px-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateFolder();
                            if (e.key === 'Escape') {
                                setIsCreating(false);
                                setNewFolderName('');
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="px-3 h-8 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        onClick={handleCreateFolder}
                    >
                        Create
                    </button>
                </div>
            )}

            <div className="space-y-1">
                {folders.map((folder) => (
                    <div
                        key={folder.id}
                        className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                            selectedFolderId === folder.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                        onClick={() => onFolderSelect(folder.id)}
                    >
                        <div className="flex items-center gap-2">
                            <span>{folder.icon || '📁'}</span>
                            <span className="truncate">{folder.name}</span>
                        </div>

                        {!folder.is_default && (
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
                                                    handleDeleteFolder(folder.id);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </Menu.Item>
                                </Menu.Items>
                            </Menu>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 
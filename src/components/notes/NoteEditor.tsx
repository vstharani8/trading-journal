import { useState, useEffect } from 'react';
import { Note, UpdateNoteInput, Tag } from '../../types/notes';
import { updateNote, getNoteTags } from '../../lib/notes';
import { RichTextEditor } from './RichTextEditor';
import { TagSelector } from './TagSelector';

interface NoteEditorProps {
    note: Note;
    onNoteChange: () => void;
}

export function NoteEditor({ note, onNoteChange }: NoteEditorProps) {
    const [title, setTitle] = useState(note.title);
    const [content, setContent] = useState(note.content || '');
    const [tags, setTags] = useState<Tag[]>(note.tags || []);
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setTitle(note.title);
        setContent(note.content || '');
        loadTags();
    }, [note]);

    const loadTags = async () => {
        try {
            const noteTags = await getNoteTags(note.id);
            setTags(noteTags);
        } catch (error) {
            console.error('Error loading note tags:', error);
        }
    };

    const handleSave = async (newTitle: string, newContent: string) => {
        if (isSaving) return;

        try {
            setIsSaving(true);
            const input: UpdateNoteInput = {
                id: note.id,
                title: newTitle,
                content: newContent
            };
            await updateNote(input);
            onNoteChange();
        } catch (error) {
            console.error('Error updating note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        const timeout = setTimeout(() => {
            handleSave(newTitle, content);
        }, 1000);
        
        setSaveTimeout(timeout);
    };

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        
        const timeout = setTimeout(() => {
            handleSave(title, newContent);
        }, 1000);
        
        setSaveTimeout(timeout);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Note title"
                    className="w-full text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0"
                />
                <TagSelector 
                    noteId={note.id} 
                    selectedTags={tags} 
                    onTagsChange={loadTags} 
                />
            </div>
            <div className="flex-1 overflow-auto">
                <RichTextEditor 
                    content={content} 
                    onChange={handleContentChange} 
                    placeholder="Start writing..."
                />
            </div>
            {isSaving && (
                <div className="px-4 py-2 text-sm text-gray-500">
                    Saving...
                </div>
            )}
        </div>
    );
} 
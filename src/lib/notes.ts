import { supabase } from '../services/supabase';
import type { 
    Folder, 
    Note, 
    Tag,
    CreateFolderInput, 
    UpdateFolderInput, 
    CreateNoteInput, 
    UpdateNoteInput,
    CreateTagInput,
    UpdateTagInput,
    AddTagToNoteInput,
    RemoveTagFromNoteInput
} from '../types/notes';

// Default folders configuration
const DEFAULT_FOLDERS = [
    { name: 'All Notes', icon: '📝', color: '#64748b' },
    { name: 'Trade Notes', icon: '💹', color: '#22c55e' },
    { name: 'Daily Journal', icon: '📔', color: '#3b82f6' },
    { name: 'Sessions Recap', icon: '📊', color: '#f59e0b' }
] as const;

// Folder APIs
export async function createDefaultFolders() {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return;

    const { data: existingFolders } = await supabase
        .from('folders')
        .select('name')
        .eq('user_id', user.user.id)
        .eq('is_default', true);

    if (!existingFolders || existingFolders.length === 0) {
        const foldersToCreate = DEFAULT_FOLDERS.map(folder => ({
            ...folder,
            is_default: true,
            user_id: user.user.id
        }));

        const { error } = await supabase
            .from('folders')
            .insert(foldersToCreate);

        if (error) throw error;
    }
}

export async function getFolders() {
    const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Folder[];
}

export async function createFolder(input: CreateFolderInput) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('folders')
        .insert([{ ...input, user_id: user.user.id }])
        .select()
        .single();

    if (error) throw error;
    return data as Folder;
}

export async function updateFolder(input: UpdateFolderInput) {
    const { data, error } = await supabase
        .from('folders')
        .update(input)
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;
    return data as Folder;
}

export async function deleteFolder(id: string) {
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Note APIs
export async function getNotesByFolder(folderId: string) {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    const notes = data as Note[];
    
    // Fetch tags for each note
    for (const note of notes) {
        note.tags = await getNoteTags(note.id);
    }
    
    return notes;
}

export async function getAllNotes() {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    const notes = data as Note[];
    
    // Fetch tags for each note
    for (const note of notes) {
        note.tags = await getNoteTags(note.id);
    }
    
    return notes;
}

export async function createNote(input: CreateNoteInput) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('notes')
        .insert([{ ...input, user_id: user.user.id }])
        .select()
        .single();

    if (error) throw error;
    return data as Note;
}

export async function updateNote(input: UpdateNoteInput) {
    const { data, error } = await supabase
        .from('notes')
        .update(input)
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;
    return data as Note;
}

export async function deleteNote(id: string) {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Tag APIs
export async function getTags() {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data as Tag[];
}

export async function createTag(input: CreateTagInput) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('tags')
        .insert([{ ...input, user_id: user.user.id }])
        .select()
        .single();

    if (error) throw error;
    return data as Tag;
}

export async function updateTag(input: UpdateTagInput) {
    const { data, error } = await supabase
        .from('tags')
        .update(input)
        .eq('id', input.id)
        .select()
        .single();

    if (error) throw error;
    return data as Tag;
}

export async function deleteTag(id: string) {
    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function addTagToNote(input: AddTagToNoteInput) {
    const { error } = await supabase
        .from('note_tags')
        .insert([input]);

    if (error) throw error;
}

export async function removeTagFromNote(input: RemoveTagFromNoteInput) {
    const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', input.note_id)
        .eq('tag_id', input.tag_id);

    if (error) throw error;
}

export async function getNoteTags(noteId: string) {
    const { data, error } = await supabase
        .from('note_tags')
        .select('tag_id')
        .eq('note_id', noteId);

    if (error) throw error;

    if (data.length === 0) return [];

    const tagIds = data.map(item => item.tag_id);
    
    const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds);

    if (tagsError) throw tagsError;
    return tags as Tag[];
}

// Add search functionality
export async function searchNotes(query: string) {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    const notes = data as Note[];
    
    // Fetch tags for each note
    for (const note of notes) {
        note.tags = await getNoteTags(note.id);
    }
    
    return notes;
} 
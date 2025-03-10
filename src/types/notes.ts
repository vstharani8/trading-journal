export interface Folder {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    is_default: boolean;
    created_at: string;
    user_id: string;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    created_at: string;
    user_id: string;
}

export interface Note {
    id: string;
    title: string;
    content: string | null;
    folder_id: string;
    trade_id: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
    tags?: Tag[];
}

export interface CreateFolderInput {
    name: string;
    icon?: string;
    color?: string;
}

export interface UpdateFolderInput extends Partial<CreateFolderInput> {
    id: string;
}

export interface CreateTagInput {
    name: string;
    color: string;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {
    id: string;
}

export interface CreateNoteInput {
    title: string;
    content?: string;
    folder_id: string;
    trade_id?: string;
}

export interface UpdateNoteInput extends Partial<CreateNoteInput> {
    id: string;
}

export interface AddTagToNoteInput {
    note_id: string;
    tag_id: string;
}

export interface RemoveTagFromNoteInput {
    note_id: string;
    tag_id: string;
} 
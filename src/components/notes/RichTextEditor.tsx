import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { supabase } from '../../services/supabase';
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  QueueListIcon,
  PhotoIcon,
  LinkIcon,
  CodeBracketIcon,
  HashtagIcon,
  ChatBubbleLeftRightIcon,
  MinusIcon,
  CheckIcon,
  Square2StackIcon
} from '@heroicons/react/24/outline';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Start writing...' }: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (_, event) => {
        // Handle image paste from clipboard
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter(item => item.type.indexOf('image') === 0);
        
        if (imageItems.length > 0) {
          event.preventDefault();
          
          imageItems.forEach(item => {
            const file = item.getAsFile();
            if (file) {
              uploadImage(file);
            }
          });
          
          return true;
        }
        
        return false;
      },
      handleKeyDown: (_, event) => {
        // Handle keyboard shortcuts for special commands
        if (event.key === '/' && !event.shiftKey && !event.altKey && !event.metaKey) {
          // Show command menu (simplified version)
          setShowKeyboardShortcuts(true);
          return true;
        }
        
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [editor, content]);

  // Simulate collaborative editing indicators
  useEffect(() => {
    const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const randomCollaborators = [];
    const count = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * names.length);
      randomCollaborators.push(names[randomIndex]);
    }
    
    setCollaborators([...new Set(randomCollaborators)]);
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `note-images/${fileName}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('notes')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('notes')
        .getPublicUrl(filePath);
        
      // Insert image into editor
      if (editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [editor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      uploadImage(file);
    }
  };

  // Handle drag and drop for images
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      uploadImage(imageFiles[0]);
    }
  };

  const copyToClipboard = () => {
    if (editor) {
      const content = editor.getHTML();
      navigator.clipboard.writeText(content)
        .then(() => {
          alert('Content copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy content: ', err);
        });
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div 
      className="rich-text-editor"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100 }}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-md flex p-1"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          >
            <BoldIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          >
            <ItalicIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleLink({ href: '' }).run()}
            className={`p-1 rounded ${editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </BubbleMenu>
      )}

      <div className="toolbar flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <BoldIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Heading 1"
        >
          <HashtagIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Heading 2"
        >
          <HashtagIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Bullet List"
        >
          <ListBulletIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Ordered List"
        >
          <QueueListIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-1 rounded ${editor.isActive('taskList') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Task List"
        >
          <CheckIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1 rounded ${editor.isActive('codeBlock') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Code Block"
        >
          <CodeBracketIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1 rounded ${editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Quote"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1 rounded"
          title="Horizontal Rule"
        >
          <MinusIcon className="h-5 w-5" />
        </button>
        
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter the URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-1 rounded ${editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
          title="Link"
        >
          <LinkIcon className="h-5 w-5" />
        </button>
        
        <label className="p-1 rounded cursor-pointer" title="Upload Image">
          <PhotoIcon className="h-5 w-5" />
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
        
        <button
          type="button"
          onClick={copyToClipboard}
          className="p-1 rounded"
          title="Copy Content"
        >
          <Square2StackIcon className="h-5 w-5" />
        </button>
        
        {isUploading && (
          <span className="text-sm text-gray-500 flex items-center ml-2">
            Uploading...
          </span>
        )}
        
        {/* Collaborative editing indicators */}
        <div className="ml-auto flex items-center">
          {collaborators.length > 0 && (
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Also editing:</span>
              <div className="flex -space-x-2">
                {collaborators.map((name, index) => (
                  <div 
                    key={index} 
                    className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 border-white dark:border-gray-800"
                    title={name}
                  >
                    {name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="markdown-shortcuts text-xs text-gray-500 px-4 py-1 border-b border-gray-200 dark:border-gray-700">
        <span>Markdown shortcuts: </span>
        <span className="ml-2"># Heading 1</span>
        <span className="ml-2">## Heading 2</span>
        <span className="ml-2">* Bullet list</span>
        <span className="ml-2">1. Numbered list</span>
        <span className="ml-2">- [ ] Task list</span>
        <span className="ml-2">{'>'} Quote</span>
        <span className="ml-2">`Code`</span>
        <span className="ml-2">Type / for commands</span>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="prose max-w-none p-4 min-h-[300px] focus:outline-none"
      />
      
      {showKeyboardShortcuts && (
        <div className="absolute z-10 bg-white dark:bg-gray-800 shadow-lg rounded-md p-4 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Commands</h3>
            <button 
              onClick={() => setShowKeyboardShortcuts(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm">
              <div className="font-medium">Basic Formatting</div>
              <div className="text-xs text-gray-500 mt-1">
                <div>Ctrl+B - Bold</div>
                <div>Ctrl+I - Italic</div>
                <div>Ctrl+K - Link</div>
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Blocks</div>
              <div className="text-xs text-gray-500 mt-1">
                <div>Type - [ ] for task list</div>
                <div>Type {'>'} for quote</div>
                <div>/ - Command Menu</div>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            <div>Type # for heading 1, ## for heading 2</div>
            <div>Type * or - for bullet list</div>
            <div>Type 1. for numbered list</div>
            <div>Type {'>'} for quote</div>
            <div>Type - [ ] for task list</div>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror {
          min-height: 300px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
        }
        .ProseMirror ul {
          list-style-type: disc;
          padding-left: 1.5em;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          padding-left: 1.5em;
        }
        .ProseMirror blockquote {
          border-left: 3px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
        }
        .ProseMirror pre {
          background: #0D0D0D;
          color: #FFF;
          font-family: 'JetBrainsMono', monospace;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
        }
        .ProseMirror pre code {
          color: inherit;
          padding: 0;
          background: none;
          font-size: 0.8rem;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
        }
        .ProseMirror ul[data-type="taskList"] li > label {
          flex: 0 0 auto;
          margin-right: 0.5rem;
          user-select: none;
        }
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1 1 auto;
        }
      `}} />
    </div>
  );
} 
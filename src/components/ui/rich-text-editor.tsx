'use client';

import React, { useCallback, useMemo, useState, useRef } from 'react';
import { createEditor, Descendant, Editor, Transforms, Range } from 'slate';
import { Slate, Editable, withReact, ReactEditor, useSlate, useSlateStatic, useSelected } from 'slate-react';
import { withHistory } from 'slate-history';
import isHotkey from 'is-hotkey';
import {
  Bold,
  Italic,
  Underline,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from './button';
import { Separator } from './separator';
import { cn } from '@/lib/utils';
import { toggleMark, isMarkActive, toggleBlock, isBlockActive, insertImage as insertImageUtil } from '@/lib/slate-editor-utils';
import { CustomElement, CustomText, ImageElement } from '@/lib/slate-types';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Label } from './label';


const HOTKEYS: { [key: string]: string } = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// HOC to handle image-specific logic
const withImages = (editor: Editor & ReactEditor) => {
    const { isVoid } = editor;

    editor.isVoid = element => {
        return element.type === 'image' ? true : isVoid(element);
    };

    return editor;
};


interface RichTextEditorProps {
  value?: string;
  onChange: (value: string) => void;
}

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editor = useMemo(() => withHistory(withReact(withImages(createEditor() as Editor & ReactEditor))), []);
  
  const parsedValue = useMemo(() => {
    try {
      if (value) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // If parsing fails, it's likely old plain text.
      return [{ type: 'paragraph', children: [{ text: value || '' }] }];
    }
    return initialValue;
  }, [value]);
  
  const handleValueChange = useCallback((newValue: Descendant[]) => {
      const isAstChange = editor.operations.some(
        op => 'set_selection' !== op.type
      );
      if (isAstChange) {
        const json = JSON.stringify(newValue);
        onChange(json);
      }
  }, [editor.operations, onChange]);

  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  return (
    <div className="rounded-md border border-input">
      <Slate editor={editor} initialValue={parsedValue} onChange={handleValueChange}>
        <Toolbar />
        <div className="relative">
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              placeholder="Describe the event..."
              spellCheck
              autoFocus={false}
              className="min-h-[150px] w-full rounded-b-md bg-transparent px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 prose dark:prose-invert max-w-full"
              onKeyDown={event => {
                for (const hotkey in HOTKEYS) {
                  if (isHotkey(hotkey, event as any)) {
                    event.preventDefault();
                    const mark = HOTKEYS[hotkey];
                    toggleMark(editor, mark);
                  }
                }
              }}
            />
        </div>
      </Slate>
    </div>
  );
};

const Toolbar = () => {
    const editor = useSlateStatic();
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [imageWidth, setImageWidth] = useState('');
    const [imageHeight, setImageHeight] = useState('');
    const selectionRef = useRef<Range | null>(null);

    const handleInsertImage = () => {
        if (!imageUrl) return;

        try {
            new URL(imageUrl);
        } catch {
            alert('Invalid URL');
            return;
        }

        if (selectionRef.current) {
            Transforms.select(editor, selectionRef.current);
        }
        
        insertImageUtil(editor, imageUrl, imageWidth, imageHeight);
        setIsImageDialogOpen(false);
        setImageUrl('');
        setImageWidth('');
        setImageHeight('');
        selectionRef.current = null;
    };

    const handleOpenImageDialog = (event: React.MouseEvent) => {
        event.preventDefault();
        selectionRef.current = editor.selection;
        setIsImageDialogOpen(true);
    }


    return (
      <>
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
            <MarkButton format="bold" icon={<Bold />} tooltip="Bold (Ctrl+B)" />
            <MarkButton format="italic" icon={<Italic />} tooltip="Italic (Ctrl+I)" />
            <MarkButton format="underline" icon={<Underline />} tooltip="Underline (Ctrl+U)" />
            <MarkButton format="code" icon={<Code />} tooltip="Code (Ctrl+`)" />
            <Separator orientation="vertical" className="h-6 mx-1" />
            <BlockButton format="heading-one" icon={<Heading1 />} tooltip="Heading 1" />
            <BlockButton format="heading-two" icon={<Heading2 />} tooltip="Heading 2" />
            <BlockButton format="block-quote" icon={<Quote />} tooltip="Quote" />
            <BlockButton format="numbered-list" icon={<ListOrdered />} tooltip="Numbered List" />
            <BlockButton format="bulleted-list" icon={<List />} tooltip="Bulleted List" />
            <Separator orientation="vertical" className="h-6 mx-1" />
            <BlockButton format="left" icon={<AlignLeft />} tooltip="Align Left" />
            <BlockButton format="center" icon={<AlignCenter />} tooltip="Align Center" />
            <BlockButton format="right" icon={<AlignRight />} tooltip="Align Right" />
            <BlockButton format="justify" icon={<AlignJustify />} tooltip="Justify" />
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onMouseDown={handleOpenImageDialog}
                    >
                        <ImageIcon />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Insert Image</p>
                </TooltipContent>
            </Tooltip>
        </div>
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Insert Image</DialogTitle>
                    <DialogDescription>Enter the URL and optional dimensions for the image.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="imageUrl" className="text-right">URL *</Label>
                        <Input
                            id="imageUrl"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="col-span-3"
                            autoFocus
                            placeholder="https://example.com/image.png"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="imageWidth" className="text-right">Width</Label>
                        <Input
                            id="imageWidth"
                            value={imageWidth}
                            onChange={(e) => setImageWidth(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g., 400px or 50%"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="imageHeight" className="text-right">Height</Label>
                        <Input
                            id="imageHeight"
                            value={imageHeight}
                            onChange={(e) => setImageHeight(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleInsertImage();
                                }
                            }}
                            className="col-span-3"
                            placeholder="e.g., 300px or auto"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsImageDialogOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleInsertImage}>Insert</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </>
    );
};

const MarkButton = ({ format, icon, tooltip }: { format: string; icon: React.ReactNode; tooltip: string }) => {
  const editor = useSlate();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isMarkActive(editor, format) ? 'is-active bg-secondary' : '')}
          onMouseDown={event => {
            event.preventDefault();
            toggleMark(editor, format);
          }}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const BlockButton = ({ format, icon, tooltip }: { format: string; icon: React.ReactNode; tooltip: string }) => {
  const editor = useSlate();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", isBlockActive(editor, format, ['left', 'center', 'right', 'justify'].includes(format) ? 'align' : 'type') ? 'is-active bg-secondary' : '')}
          onMouseDown={event => {
            event.preventDefault();
            toggleBlock(editor, format);
          }}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const Element = ({ attributes, children, element }: { attributes: any; children: any; element: CustomElement }) => {
  const style = { textAlign: element.align };
  
  switch (element.type) {
    case 'block-quote':
      return <blockquote style={style} {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul style={style} {...attributes}>{children}</ul>;
    case 'heading-one':
      return <h1 style={style} {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 style={style} {...attributes}>{children}</h2>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'numbered-list':
      return <ol style={style} {...attributes}>{children}</ol>;
    case 'image':
      return <ImageElementComponent attributes={attributes} element={element}>{children}</ImageElementComponent>;
    default:
      return <p style={style} {...attributes}>{children}</p>;
  }
};

const ImageElementComponent = ({ attributes, children, element }: { attributes: any, children: any, element: ImageElement }) => {
    const selected = useSelected();
    const editor = useSlateStatic();
    const isFocused = ReactEditor.isFocused(editor);
    const { url, width, height } = element;
    
    const style = {
        width: width || 'auto',
        height: height || 'auto',
    };

    return (
        <div {...attributes}>
            <div contentEditable={false} className="relative my-4">
                <img
                    src={url}
                    alt=""
                    style={style}
                    className={cn(
                        'block max-w-full shadow-md rounded-md',
                        selected && isFocused && 'ring-2 ring-ring ring-offset-2'
                    )}
                />
            </div>
            {children}
        </div>
    );
};


const Leaf = ({ attributes, children, leaf }: { attributes: any; children: any; leaf: CustomText }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.code) {
    children = <code>{children}</code>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  return <span {...attributes}>{children}</span>;
};

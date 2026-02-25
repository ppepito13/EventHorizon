
'use client';

import React, { useCallback, useMemo } from 'react';
import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
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
} from 'lucide-react';
import { Button } from './button';
import { Separator } from './separator';
import { cn } from '@/lib/utils';
import { toggleMark, isMarkActive, toggleBlock, isBlockActive } from '@/lib/slate-editor-utils';
import { CustomElement, CustomText } from '@/lib/slate-types';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';


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

interface RichTextEditorProps {
  value?: string;
  onChange: (value: string) => void;
}

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
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
              className="min-h-[150px] w-full rounded-b-md bg-transparent px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 prose dark:prose-invert"
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
  return (
    <div className="flex items-center gap-1 border-b p-2">
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
    </div>
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
          className={cn("h-8 w-8", isBlockActive(editor, format) ? 'is-active bg-secondary' : '')}
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

// Custom `useSlate` hook to provide editor instance with correct types
import { useSlate as useSlateReact } from 'slate-react';
import { CustomTypes } from 'slate';

export const useSlate = (): CustomTypes['Editor'] => {
  return useSlateReact() as CustomTypes['Editor'];
};


const Element = ({ attributes, children, element }: { attributes: any; children: any; element: CustomElement }) => {
  const style = { textAlign: (element as any).align };
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
      return <li style={style} {...attributes}>{children}</li>;
    case 'numbered-list':
      return <ol style={style} {...attributes}>{children}</ol>;
    default:
      return <p style={style} {...attributes}>{children}</p>;
  }
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

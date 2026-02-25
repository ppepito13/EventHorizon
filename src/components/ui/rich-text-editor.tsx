
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { createEditor, Descendant, Editor, Transforms } from 'slate';
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
  Pilcrow,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { Button } from './button';
import { Separator } from './separator';
import { cn } from '@/lib/utils';
import { toggleMark, isMarkActive, toggleBlock, isBlockActive } from '@/lib/slate-editor-utils';
import { CustomElement, CustomText } from '@/lib/slate-types';

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
  
  const handleValueChange = (newValue: Descendant[]) => {
      const isAstChange = editor.operations.some(
        op => 'set_selection' !== op.type
      );
      if (isAstChange) {
        const json = JSON.stringify(newValue);
        onChange(json);
      }
  };

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
      <MarkButton format="bold" icon={<Bold />} />
      <MarkButton format="italic" icon={<Italic />} />
      <MarkButton format="underline" icon={<Underline />} />
      <MarkButton format="code" icon={<Code />} />
      <Separator orientation="vertical" className="h-6 mx-1" />
      <BlockButton format="heading-one" icon={<Heading1 />} />
      <BlockButton format="heading-two" icon={<Heading2 />} />
      <BlockButton format="block-quote" icon={<Quote />} />
      <BlockButton format="numbered-list" icon={<ListOrdered />} />
      <BlockButton format="bulleted-list" icon={<List />} />
    </div>
  );
};

const MarkButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlate();
  return (
    <Button
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
  );
};

const BlockButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlate();
  return (
    <Button
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

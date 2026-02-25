// This file is based on the type definitions from the Slate.js documentation
// to ensure type safety for our rich text editor's content.

import { BaseEditor } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

export type BlockQuoteElement = { type: 'block-quote'; children: Descendant[] };
export type BulletedListElement = { type: 'bulleted-list'; children: Descendant[] };
export type HeadingOneElement = { type: 'heading-one'; children: Descendant[] };
export type HeadingTwoElement = { type: 'heading-two'; children: Descendant[] };
export type ListItemElement = { type: 'list-item'; children: Descendant[] };
export type NumberedListElement = { type: 'numbered-list'; children: Descendant[] };
export type ParagraphElement = { type: 'paragraph'; children: Descendant[] };

export type CustomElement =
  | BlockQuoteElement
  | BulletedListElement
  | HeadingOneElement
  | HeadingTwoElement
  | ListItemElement
  | NumberedListElement
  | ParagraphElement;

export type FormattedText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

export type CustomText = FormattedText;

// This is the core type for any node in the Slate editor
export type Descendant = CustomElement | CustomText;

// This extends the base Slate editor with React-specific functionality,
// history tracking, and our custom node types.
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

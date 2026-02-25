// This utility file contains helper functions for the Slate.js editor,
// based on common patterns from the official Slate documentation.

import { Editor, Transforms, Element as SlateElement } from 'slate';

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

// --- Mark Functions (for inline formatting like bold, italic) ---

export const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format as keyof typeof marks] === true : false;
};

export const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};


// --- Block Functions (for block-level elements like headings, lists) ---

export const isBlockActive = (
  editor: Editor,
  format: string,
  blockType: 'type' | 'align' = 'type'
) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        n[blockType as keyof typeof n] === format,
    })
  );

  return !!match;
};

export const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });
  
  let newProperties: Partial<SlateElement>;
  const align = TEXT_ALIGN_TYPES.includes(format) ? format : undefined;

  if (align) {
      newProperties = { align: isActive ? undefined : align } as Partial<SlateElement>;
  } else {
      newProperties = {
          type: isActive ? 'paragraph' : isList ? 'list-item' : format,
      } as Partial<SlateElement>
  }
  
  Transforms.setNodes<SlateElement>(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] } as SlateElement;
    Transforms.wrapNodes(editor, block);
  }
};

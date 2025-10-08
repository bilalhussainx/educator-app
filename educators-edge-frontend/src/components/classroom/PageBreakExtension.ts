import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-break"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-break',
        class: 'page-break',
        style: 'page-break-after: always; break-after: page; height: 0; border: none; margin: 2rem 0; border-top: 2px dashed #ccc; position: relative;'
      }),
      [
        'span',
        {
          style: 'position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: white; padding: 0 8px; font-size: 12px; color: #666;'
        },
        'Page Break'
      ]
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Ctrl-Return': () => this.editor.commands.setPageBreak(),
      'Cmd-Return': () => this.editor.commands.setPageBreak(),
    };
  },
});

export default PageBreak;
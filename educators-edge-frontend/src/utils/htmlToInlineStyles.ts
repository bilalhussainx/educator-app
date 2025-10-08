/**
 * Convert HTML with CSS classes to inline styles
 * This ensures formatting is preserved when exporting to PDF/DOCX
 */

export const convertToInlineStyles = (element: HTMLElement): string => {
  const clonedElement = element.cloneNode(true) as HTMLElement;

  // Recursively apply computed styles as inline styles
  const applyInlineStyles = (el: HTMLElement) => {
    if (el.nodeType !== Node.ELEMENT_NODE) return;

    // Get computed styles
    const computed = window.getComputedStyle(el);

    // Important styles to preserve
    const importantStyles = [
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'color',
      'background-color',
      'margin',
      'margin-top',
      'margin-bottom',
      'margin-left',
      'margin-right',
      'padding',
      'padding-top',
      'padding-bottom',
      'padding-left',
      'padding-right',
      'border',
      'border-top',
      'border-bottom',
      'border-left',
      'border-right',
      'text-align',
      'text-decoration',
      'line-height',
      'letter-spacing',
      'text-transform',
      'display',
      'width',
      'max-width',
      'height',
      'list-style-type',
      'list-style-position'
    ];

    // Build inline style string
    let inlineStyle = '';
    importantStyles.forEach(prop => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal' && value !== '0px') {
        inlineStyle += `${prop}: ${value}; `;
      }
    });

    // Set the inline style
    if (inlineStyle) {
      el.setAttribute('style', inlineStyle);
    }

    // Remove class attribute (no longer needed)
    el.removeAttribute('class');

    // Process children
    Array.from(el.children).forEach(child => {
      if (child instanceof HTMLElement) {
        applyInlineStyles(child);
      }
    });
  };

  applyInlineStyles(clonedElement);

  return clonedElement.outerHTML;
};

/**
 * Simpler version - just preserve essential formatting
 */
export const preserveEssentialStyles = (html: string): string => {
  // If HTML already has inline styles, return as-is
  if (html.includes('style=')) {
    return html;
  }

  // Wrap in container with basic styling
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 8.5in; margin: 0 auto; padding: 0.75in; line-height: 1.6;">
      ${html}
    </div>
  `;
};

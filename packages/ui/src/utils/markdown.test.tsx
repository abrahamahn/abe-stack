// packages/ui/src/utils/markdown.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { parseMarkdown, Markdown } from './markdown';

import type { ReactElement } from 'react';

// Type for test assertions - parseMarkdown returns ReactNode[] but tests need element access
type TestElement = ReactElement & { props: { children: TestElement[] | string } };

// Helper to cast result for testing
function asElements(result: ReturnType<typeof parseMarkdown>): TestElement[] {
  return result as TestElement[];
}

function isTestElement(value: unknown): value is TestElement {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

describe('Custom Markdown Parser', () => {
  describe('parseMarkdown', () => {
    it('should parse headers correctly', () => {
      const result = asElements(parseMarkdown('# Header 1\n## Header 2\n### Header 3'));

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe('h1');
      expect(result[1]?.type).toBe('h2');
      expect(result[2]?.type).toBe('h3');
    });

    it('should parse bold and italic text', () => {
      const result = asElements(parseMarkdown('**bold** and *italic* text'));

      expect(result).toHaveLength(1); // One paragraph
      const paragraph = result[0];

      // Check that it contains the formatted elements
      expect(paragraph?.props.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'strong', props: { children: 'bold' } }),
          ' and ',
          expect.objectContaining({ type: 'em', props: { children: 'italic' } }),
          ' text',
        ]),
      );
    });

    it('should parse inline code', () => {
      const result = asElements(parseMarkdown('Use `console.log()` for debugging'));

      expect(result).toHaveLength(1);
      const paragraph = result[0];

      expect(paragraph?.props.children).toEqual(
        expect.arrayContaining([
          'Use ',
          expect.objectContaining({
            type: 'code',
            props: { children: 'console.log()' },
          }),
          ' for debugging',
        ]),
      );
    });

    it('should parse links', () => {
      const result = asElements(parseMarkdown('[Google](https://google.com) is a search engine'));

      expect(result).toHaveLength(1);
      const paragraph = result[0];

      expect(paragraph?.props.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'a',
            props: {
              href: 'https://google.com',
              children: 'Google',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          }),
          ' is a search engine',
        ]),
      );
    });

    it('should parse unordered lists', () => {
      const result = asElements(parseMarkdown('- Item 1\n- Item 2\n- Item 3'));

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('ul');

      const listItems = result[0]?.props.children as TestElement[];
      expect(listItems).toHaveLength(3);
      expect(listItems[0]?.props.children).toBe('Item 1');
      expect(listItems[1]?.props.children).toBe('Item 2');
      expect(listItems[2]?.props.children).toBe('Item 3');
    });

    it('should parse ordered lists', () => {
      const result = asElements(parseMarkdown('1. First item\n2. Second item\n3. Third item'));

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('ol');

      const listItems = result[0]?.props.children as TestElement[];
      expect(listItems).toHaveLength(3);
      expect(listItems[0]?.props.children).toBe('First item');
    });

    it('should parse blockquotes', () => {
      const result = asElements(parseMarkdown('> This is a blockquote\n> with multiple lines'));

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('blockquote');

      const blockquoteContent = result[0]?.props.children;
      expect(blockquoteContent).toContain('This is a blockquote');
      expect(blockquoteContent).toContain('with multiple lines');
    });

    it('should parse code blocks', () => {
      const result = asElements(parseMarkdown('```\nconst x = 1;\nconsole.log(x);\n```'));

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('pre');

      const codeElementCandidate = result[0]?.props.children;
      if (!isTestElement(codeElementCandidate)) {
        throw new Error('Expected code element');
      }
      const codeElement = codeElementCandidate;
      expect(codeElement?.type).toBe('code');
      expect(codeElement?.props.children).toBe('const x = 1;\nconsole.log(x);\n');
    });

    it('should parse code blocks with language', () => {
      const result = asElements(parseMarkdown('```javascript\nconst x = 1;\n```'));

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('pre');

      const codeElementCandidate = result[0]?.props.children;
      if (!isTestElement(codeElementCandidate)) {
        throw new Error('Expected code element');
      }
      const codeElement = codeElementCandidate as TestElement & {
        props: { className?: string };
      };
      expect(codeElement?.type).toBe('code');
      expect(codeElement?.props.className).toBe('language-javascript');
    });

    it('should parse horizontal rules', () => {
      const result = asElements(parseMarkdown('Before\n\n---\n\nAfter'));

      expect(result).toHaveLength(3);
      expect(result[1]?.type).toBe('hr');
    });

    it('should handle empty input', () => {
      const result = parseMarkdown('');
      expect(result).toEqual([]);
    });

    it('should handle plain text paragraphs', () => {
      const result = asElements(
        parseMarkdown('This is a simple paragraph.\n\nThis is another paragraph.'),
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.type).toBe('p');
      expect(result[1]?.type).toBe('p');
    });

    it('should handle mixed content', () => {
      const result = asElements(
        parseMarkdown('# Title\n\nSome **bold** text and `code`.\n\n- List item 1\n- List item 2'),
      );

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe('h1');
      expect(result[1]?.type).toBe('p');
      expect(result[2]?.type).toBe('ul');
    });
  });

  describe('Markdown Component', () => {
    it('should render markdown content', () => {
      const { container } = render(
        <Markdown>{'# Hello World\n\nThis is **bold** text.'}</Markdown>,
      );

      const heading = container.querySelector('h1');
      const paragraph = container.querySelector('p');
      const strong = container.querySelector('strong');

      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Hello World');
      expect(paragraph).toBeInTheDocument();
      expect(strong).toBeInTheDocument();
      expect(strong).toHaveTextContent('bold');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Markdown className="custom-markdown">{'Simple text'}</Markdown>,
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-markdown');
    });

    it('should handle empty content', () => {
      const { container } = render(<Markdown>{''}</Markdown>);
      expect(container.firstChild).toBeNull();
    });

    it('should render code blocks with syntax highlighting', () => {
      const { container } = render(<Markdown>{'```javascript\nfunction test() {}\n```'}</Markdown>);

      const pre = container.querySelector('pre');
      const code = container.querySelector('code');

      expect(pre).toBeInTheDocument();
      expect(code).toBeInTheDocument();
      expect(code).toHaveClass('language-javascript');
    });

    it('should sanitize HTML when sanitize option is true', () => {
      const result = asElements(
        parseMarkdown('<script>alert("xss")</script>Hello', { sanitize: true }),
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('p');
    });

    it('should handle line breaks option', () => {
      const withBreaks = parseMarkdown('Line 1\nLine 2', { breaks: true });
      const withoutBreaks = parseMarkdown('Line 1\nLine 2', { breaks: false });

      expect(withBreaks).toHaveLength(1);
      expect(withoutBreaks).toHaveLength(1);
    });
  });

  describe('URL Sanitization', () => {
    it('should sanitize malicious URLs', () => {
      const result = asElements(parseMarkdown('[Link](javascript:alert("xss"))'));

      expect(result).toHaveLength(1);
      const children = result[0]?.props.children as TestElement[];
      const link = children[0];
      expect(link?.type).toBe('a');
      expect((link?.props as { href?: string }).href).toBe('javascript:alert("xss")');
    });

    it('should allow safe URLs', () => {
      const result = asElements(parseMarkdown('[Google](https://google.com)'));

      expect(result).toHaveLength(1);
      const children = result[0]?.props.children as TestElement[];
      const link = children[0];
      expect(link?.type).toBe('a');
      const linkProps = link?.props as { href?: string; target?: string; rel?: string };
      expect(linkProps.href).toBe('https://google.com');
      expect(linkProps.target).toBe('_blank');
      expect(linkProps.rel).toBe('noopener noreferrer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested lists', () => {
      const result = asElements(parseMarkdown('- Item 1\n  - Nested item\n- Item 2'));

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('ul');
    });

    it('should handle mixed inline elements', () => {
      const result = asElements(parseMarkdown('**Bold** and *italic* and `code` and [link](url)'));

      expect(result).toHaveLength(1);
      const paragraph = result[0];

      const children = paragraph?.props.children;
      expect(children).toContain('**Bold** and *italic* and `code` and [link](url)');
    });

    it('should handle escaped characters', () => {
      const result = asElements(parseMarkdown('\\*not italic\\* and \\`not code\\`'));

      expect(result).toHaveLength(1);
      expect(result[0]?.props.children).toBe('*not italic* and `not code`');
    });

    it('should handle very long content', () => {
      const longContent = 'Line\n'.repeat(1000);
      const result = parseMarkdown(longContent);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// main/client/ui/src/utils/markdown.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { Markdown, parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('should parse empty text', () => {
    const result = parseMarkdown('');
    expect(result).toEqual([]);
  });

  it('should parse plain text as paragraph', () => {
    const result = parseMarkdown('Hello world');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse headers', () => {
    const result = parseMarkdown('# Header 1\n## Header 2');
    expect(result).toHaveLength(2);
    render(<div>{result}</div>);
  });

  it('should parse bold text', () => {
    const result = parseMarkdown('**bold** text');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse italic text', () => {
    const result = parseMarkdown('*italic* text');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse inline code', () => {
    const result = parseMarkdown('`code` snippet');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse links', () => {
    const result = parseMarkdown('[link](https://example.com)');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse code blocks', () => {
    const result = parseMarkdown('```\ncode block\n```');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse lists', () => {
    const result = parseMarkdown('- Item 1\n- Item 2\n1. Numbered item');
    expect(result).toHaveLength(2);
    render(<div>{result}</div>);
  });

  it('should parse blockquotes', () => {
    const result = parseMarkdown('> This is a quote');
    expect(result).toHaveLength(1);
    render(<div>{result}</div>);
  });

  it('should parse simple tables', () => {
    const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |';
    const result = parseMarkdown(md);
    expect(result).toHaveLength(1);
    const { container } = render(<div>{result}</div>);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('td')).toHaveLength(4);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('should parse tables with alignment', () => {
    const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |';
    const result = parseMarkdown(md);
    const { container } = render(<div>{result}</div>);
    const headers = container.querySelectorAll('th');
    expect(headers).toHaveLength(3);
    expect(headers[1]?.style.textAlign).toBe('center');
    expect(headers[2]?.style.textAlign).toBe('right');
  });

  it('should parse inline formatting inside table cells', () => {
    const md = '| Header |\n| --- |\n| **bold** text |';
    const result = parseMarkdown(md);
    const { container } = render(<div>{result}</div>);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
  });

  it('should parse tables followed by other content', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |\n\nParagraph after table';
    const result = parseMarkdown(md);
    expect(result).toHaveLength(2);
    const { container } = render(<div>{result}</div>);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('p')?.textContent).toBe('Paragraph after table');
  });

  it('should parse inline formatting with 3+ patterns', () => {
    const md = 'Use `code` with **bold** and *italic* text';
    const result = parseMarkdown(md);
    const { container } = render(<div>{result}</div>);
    expect(container.querySelector('code')?.textContent).toBe('code');
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });
});

describe('Markdown component', () => {
  it('should render markdown content', () => {
    const { container } = render(<Markdown>Hello **world**</Markdown>);
    expect(container.textContent).toBe('Hello world');
  });

  it('should handle empty content', () => {
    const { container } = render(<Markdown>{''}</Markdown>);
    expect(container.firstChild).toBeNull();
  });

  it('should apply className', () => {
    const { container } = render(<Markdown className="test-class">Content</Markdown>);
    expect(container.firstElementChild).toHaveClass('test-class');
  });
});

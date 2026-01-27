// packages/ui/src/utils/__tests__/markdown.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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

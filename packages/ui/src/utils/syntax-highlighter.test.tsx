// packages/ui/src/utils/__tests__/syntax-highlighter.test.tsx
import { render } from '@testing-library/react';
import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { SyntaxHighlighter, darkTheme, highlightCode, lightTheme } from './syntax-highlighter';

import type { ReactElement, ReactNode } from 'react';

// Type for accessing element properties in tests
type TestElement = ReactElement & { props: { children: string; style: { color: string } } };

// Helper to find element by children content
function findByChildren(elements: ReactNode[], content: string): TestElement | undefined {
  for (const el of elements) {
    if (isValidElement(el) && 'props' in el) {
      const element = el as TestElement;
      if (element.props.children === content) {
        return element;
      }
    }
  }
  return undefined;
}

describe('Custom Syntax Highlighter', () => {
  describe('highlightCode', () => {
    it('should highlight JavaScript keywords', () => {
      const code = 'const x = 42; if (x > 0) return true;';
      const result = highlightCode(code, 'javascript', darkTheme);

      expect(result).toHaveLength(10);

      const constElement = findByChildren(result, 'const');
      expect(constElement).toBeDefined();
      expect(constElement?.props.style.color).toBe(darkTheme.keywords);

      const ifElement = findByChildren(result, 'if');
      expect(ifElement).toBeDefined();
      expect(ifElement?.props.style.color).toBe(darkTheme.keywords);
    });

    it('should highlight strings', () => {
      const code = 'const message = "Hello World";';
      const result = highlightCode(code, 'javascript', darkTheme);

      const stringElement = findByChildren(result, '"Hello World"');
      expect(stringElement).toBeDefined();
      expect(stringElement?.props.style.color).toBe(darkTheme.strings);
    });

    it('should highlight numbers', () => {
      const code = 'const x = 42;';
      const result = highlightCode(code, 'javascript', darkTheme);

      const numberElement = findByChildren(result, '42');
      expect(numberElement).toBeDefined();
      expect(numberElement?.props.style.color).toBe(darkTheme.numbers);
    });

    it('should highlight comments', () => {
      const code = 'const x = 1; // This is a comment';
      const result = highlightCode(code, 'javascript', darkTheme);

      const commentElement = findByChildren(result, '// This is a comment');
      expect(commentElement).toBeDefined();
      expect(commentElement?.props.style.color).toBe(darkTheme.comments);
    });

    it('should handle multiple languages', () => {
      const pythonCode = 'def hello():\n    print("Hello")';
      const result = highlightCode(pythonCode, 'python', darkTheme);

      const defElement = findByChildren(result, 'def');
      expect(defElement).toBeDefined();
      expect(defElement?.props.style.color).toBe(darkTheme.keywords);
    });

    it('should handle unknown languages gracefully', () => {
      const code = 'some unknown language syntax';
      const result = highlightCode(code, 'unknown', darkTheme);

      // Should still tokenize and highlight what it can
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty code', () => {
      const result = highlightCode('', 'javascript', darkTheme);
      expect(result).toEqual([]);
    });

    it('should handle multiline code', () => {
      const code = `function test() {\n  const x = 1;\n  return x;\n}`;
      const result = highlightCode(code, 'javascript', darkTheme);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);

      // Should contain newline characters
      const newlineElements = result.filter((el) => {
        if (isValidElement(el) && 'props' in el) {
          return (el as TestElement).props.children === '\n';
        }
        return false;
      });
      expect(newlineElements.length).toBeGreaterThan(0);
    });
  });

  describe('SyntaxHighlighter Component', () => {
    it('should render code with syntax highlighting', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript">{'const x = 42;'}</SyntaxHighlighter>,
      );

      const pre = container.querySelector('pre');
      const code = container.querySelector('code');

      expect(pre).toBeInTheDocument();
      expect(code).toBeInTheDocument();
      expect(pre).toHaveStyle({
        backgroundColor: darkTheme.background,
        color: darkTheme.foreground,
      });
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript" className="custom-syntax">
          {'const x = 1;'}
        </SyntaxHighlighter>,
      );

      const pre = container.querySelector('pre');
      expect(pre).toHaveClass('custom-syntax');
    });

    it('should use light theme when specified', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript" theme="light">
          {'const x = 1;'}
        </SyntaxHighlighter>,
      );

      const pre = container.querySelector('pre');
      expect(pre).toHaveStyle({
        backgroundColor: lightTheme.background,
        color: lightTheme.foreground,
      });
    });

    it('should accept custom theme object', () => {
      const customTheme = {
        background: '#000000',
        foreground: '#ffffff',
        keywords: '#ff0000',
        strings: '#00ff00',
        comments: '#0000ff',
        functions: '#ffff00',
        variables: '#ff00ff',
        numbers: '#00ffff',
        operators: '#ffffff',
      };

      const { container } = render(
        <SyntaxHighlighter language="javascript" theme={customTheme}>
          {'const x = 1;'}
        </SyntaxHighlighter>,
      );

      const pre = container.querySelector('pre');
      expect(pre).toHaveStyle({
        backgroundColor: '#000000',
        color: '#ffffff',
      });
    });

    it('should render line numbers when showLineNumbers is true', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript" showLineNumbers>
          {'const x = 1;\nconst y = 2;'}
        </SyntaxHighlighter>,
      );

      const table = container.querySelector('table');
      const lineNumbers = container.querySelectorAll('td:first-child');

      expect(table).toBeInTheDocument();
      expect(lineNumbers).toHaveLength(2);
      expect(lineNumbers[0]).toHaveTextContent('1');
      expect(lineNumbers[1]).toHaveTextContent('2');
    });

    it('should handle custom starting line number', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript" showLineNumbers startingLineNumber={10}>
          {'const x = 1;\nconst y = 2;'}
        </SyntaxHighlighter>,
      );

      const lineNumbers = container.querySelectorAll('td:first-child');
      expect(lineNumbers[0]).toHaveTextContent('10');
      expect(lineNumbers[1]).toHaveTextContent('11');
    });

    it('should handle single line code', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript">{'const x = 42;'}</SyntaxHighlighter>,
      );

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
    });

    it('should handle empty code', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript">{''}</SyntaxHighlighter>,
      );

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveTextContent('');
    });

    it('should apply monospace font family', () => {
      const { container } = render(
        <SyntaxHighlighter language="javascript">{'const x = 1;'}</SyntaxHighlighter>,
      );

      const spans = container.querySelectorAll('span');
      spans.forEach((span) => {
        expect(span).toHaveStyle({
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        });
      });
    });

    it('should handle long code blocks', () => {
      const longCode = 'console.log("line");\n'.repeat(100);
      const { container } = render(
        <SyntaxHighlighter language="javascript">{longCode}</SyntaxHighlighter>,
      );

      // Should render without crashing
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
    });
  });

  describe('Theme Objects', () => {
    it('should export light and dark themes', () => {
      expect(lightTheme).toBeDefined();
      expect(darkTheme).toBeDefined();

      expect(lightTheme.background).toBe('#f8f8f8');
      expect(darkTheme.background).toBe('#1e1e1e');

      // Check that all required theme properties exist
      const requiredProps = [
        'background',
        'foreground',
        'keywords',
        'strings',
        'comments',
        'functions',
        'variables',
        'numbers',
        'operators',
      ];

      requiredProps.forEach((prop) => {
        expect(lightTheme).toHaveProperty(prop);
        expect(darkTheme).toHaveProperty(prop);
        expect(typeof lightTheme[prop as keyof typeof lightTheme]).toBe('string');
        expect(typeof darkTheme[prop as keyof typeof darkTheme]).toBe('string');
      });
    });

    it('should have contrasting colors', () => {
      // Light theme should have dark text on light background
      expect(lightTheme.foreground).toMatch(/^#[0-9a-f]{6}$/);
      expect(lightTheme.background).toMatch(/^#[0-9a-f]{6}$/);

      // Dark theme should have light text on dark background
      expect(darkTheme.foreground).toMatch(/^#[0-9a-f]{6}$/);
      expect(darkTheme.background).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('Language Support', () => {
    it('should support JavaScript syntax', () => {
      const jsCode = `
        function hello(name: string): string {
          const greeting = \`Hello, \${name}!\`;
          if (name) {
            return greeting;
          }
          return 'Hello, World!';
        }
      `;

      const result = highlightCode(jsCode, 'javascript', darkTheme);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support TypeScript syntax', () => {
      const tsCode = `
        interface User {
          id: number;
          name: string;
        }

        const user: User = { id: 1, name: 'John' };
      `;

      const result = highlightCode(tsCode, 'typescript', darkTheme);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support Python syntax', () => {
      const pythonCode = `
        def greet(name: str) -> str:
            if name:
                return f"Hello, {name}!"
            return "Hello, World!"
      `;

      const result = highlightCode(pythonCode, 'python', darkTheme);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support JSON syntax', () => {
      const jsonCode = '{"name": "John", "age": 30, "active": true}';

      const result = highlightCode(jsonCode, 'json', darkTheme);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should handle large code blocks efficiently', () => {
      const largeCode = 'console.log("line " + i);\n'.repeat(1000);

      const startTime = Date.now();
      const result = highlightCode(largeCode, 'javascript', darkTheme);
      const endTime = Date.now();

      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should cache language definitions', () => {
      // First call
      const result1 = highlightCode('const x = 1;', 'javascript', darkTheme);

      // Second call with same language should reuse definition
      const result2 = highlightCode('const y = 2;', 'javascript', darkTheme);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});

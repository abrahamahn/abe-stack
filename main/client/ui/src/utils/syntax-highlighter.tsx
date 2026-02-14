// main/client/ui/src/utils/syntax-highlighter.tsx
/**
 * Custom Syntax Highlighter - Lightweight replacement for react-syntax-highlighter
 *
 * Features:
 * - Basic syntax highlighting for common languages
 * - Lightweight implementation
 * - Customizable themes
 * - Line numbers support
 */

import type { ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Props for the {@link SyntaxHighlighter} React component. */
export interface SyntaxHighlighterProps {
  /** Programming language identifier (e.g. `'typescript'`, `'python'`, `'json'`). */
  language: string;
  /** Source code string to highlight. */
  children: string;
  /** When true, displays line numbers in the left gutter. @default false */
  showLineNumbers?: boolean;
  /** Starting line number when `showLineNumbers` is enabled. @default 1 */
  startingLineNumber?: number;
  /** Color theme -- pass `'light'` or `'dark'` for built-in themes, or a custom {@link SyntaxTheme}. @default 'dark' */
  theme?: 'light' | 'dark' | SyntaxTheme;
  /** Optional CSS class name applied to the outermost container element. */
  className?: string;
}

/**
 * Custom color theme for syntax highlighting.
 *
 * Each property maps to a token category and accepts any valid CSS color value.
 */
export interface SyntaxTheme {
  /** Background color of the code container. */
  background: string;
  /** Default foreground (text) color for unclassified tokens. */
  foreground: string;
  /** Color for language keywords (`const`, `if`, `return`, etc.). */
  keywords: string;
  /** Color for string literals. */
  strings: string;
  /** Color for comments. */
  comments: string;
  /** Color for function names. */
  functions: string;
  /** Color for variable identifiers. */
  variables: string;
  /** Color for numeric literals. */
  numbers: string;
  /** Color for operators (`+`, `===`, `&&`, etc.). */
  operators: string;
}

// ============================================================================
// Built-in Themes
// ============================================================================

/** Built-in light syntax theme with VS Code-inspired colors. */
const lightTheme: SyntaxTheme = {
  background: '#f8f8f8',
  foreground: '#333333',
  keywords: '#0000ff',
  strings: '#008000',
  comments: '#808080',
  functions: '#795e26',
  variables: '#001080',
  numbers: '#09885a',
  operators: '#000000',
};

/** Built-in dark syntax theme with VS Code Dark+-inspired colors. */
const darkTheme: SyntaxTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  keywords: '#569cd6',
  strings: '#ce9178',
  comments: '#6a9955',
  functions: '#dcdcaa',
  variables: '#9cdcfe',
  numbers: '#b5cea8',
  operators: '#d4d4d4',
};

// ============================================================================
// Language Definitions
// ============================================================================

/**
 * Definition of a programming language's syntax rules used by the tokenizer.
 *
 * Each supported language provides its own keyword list, operator set,
 * and regular expressions for matching comments and strings.
 */
interface LanguageDefinition {
  /** Reserved keywords that receive keyword-colored highlighting. */
  keywords: string[];
  /** Built-in function names (currently unused for coloring but available for extension). */
  builtinFunctions?: string[];
  /** Built-in type names (currently unused for coloring but available for extension). */
  builtinTypes?: string[];
  /** Operator symbols, sorted longest-first during tokenization. */
  operators: string[];
  /** Regular expression matching single-line and multi-line comments. */
  commentRegex: RegExp;
  /** Regular expression matching string literals (single, double, template). */
  stringRegex: RegExp;
}

/**
 * Built-in language definitions for syntax highlighting.
 *
 * Supported languages: `javascript`, `typescript`, `python`, `json`.
 * Unknown languages fall back to the JavaScript definition.
 */
const languages: Record<string, LanguageDefinition> = {
  javascript: {
    keywords: [
      'async',
      'await',
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'else',
      'export',
      'extends',
      'finally',
      'for',
      'function',
      'if',
      'import',
      'in',
      'instanceof',
      'let',
      'new',
      'return',
      'super',
      'switch',
      'this',
      'throw',
      'try',
      'typeof',
      'var',
      'void',
      'while',
      'with',
      'yield',
      'true',
      'false',
      'null',
      'undefined',
    ],
    builtinFunctions: [
      'console',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURIComponent',
      'decodeURIComponent',
      'JSON',
      'Object',
      'Array',
      'String',
      'Number',
      'Boolean',
      'Math',
      'Date',
      'RegExp',
      'Promise',
      'fetch',
    ],
    operators: [
      '+',
      '-',
      '*',
      '/',
      '%',
      '=',
      '==',
      '===',
      '!=',
      '!==',
      '<',
      '>',
      '<=',
      '>=',
      '&&',
      '||',
      '!',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '%',
      '&',
      '|',
      '^',
      '~',
      '<<',
      '>>',
      '>>>',
    ],
    commentRegex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    stringRegex: /(".*?"|'.*?'|`[\s\S]*?`)/g,
  },

  typescript: {
    keywords: [
      'async',
      'await',
      'break',
      'case',
      'catch',
      'class',
      'const',
      'continue',
      'debugger',
      'default',
      'delete',
      'do',
      'else',
      'export',
      'extends',
      'finally',
      'for',
      'function',
      'if',
      'import',
      'in',
      'instanceof',
      'interface',
      'let',
      'new',
      'return',
      'super',
      'switch',
      'this',
      'throw',
      'try',
      'type',
      'typeof',
      'var',
      'void',
      'while',
      'with',
      'yield',
      'true',
      'false',
      'null',
      'undefined',
      'any',
      'unknown',
      'never',
      'void',
      'boolean',
      'number',
      'string',
      'object',
      'symbol',
    ],
    builtinFunctions: [
      'console',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURIComponent',
      'decodeURIComponent',
      'JSON',
      'Object',
      'Array',
      'String',
      'Number',
      'Boolean',
      'Math',
      'Date',
      'RegExp',
      'Promise',
      'fetch',
    ],
    operators: [
      '+',
      '-',
      '*',
      '/',
      '%',
      '=',
      '==',
      '===',
      '!=',
      '!==',
      '<',
      '>',
      '<=',
      '>=',
      '&&',
      '||',
      '!',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '%',
      '&',
      '|',
      '^',
      '~',
      '<<',
      '>>',
      '>>>',
      'as',
      'extends',
      'implements',
    ],
    commentRegex: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    stringRegex: /(".*?"|'.*?'|`[\s\S]*?`)/g,
  },

  python: {
    keywords: [
      'and',
      'as',
      'assert',
      'break',
      'class',
      'continue',
      'def',
      'del',
      'elif',
      'else',
      'except',
      'finally',
      'for',
      'from',
      'global',
      'if',
      'import',
      'in',
      'is',
      'lambda',
      'nonlocal',
      'not',
      'or',
      'pass',
      'raise',
      'return',
      'try',
      'while',
      'with',
      'yield',
      'True',
      'False',
      'None',
    ],
    builtinFunctions: [
      'abs',
      'all',
      'any',
      'bin',
      'bool',
      'bytearray',
      'bytes',
      'chr',
      'classmethod',
      'complex',
      'delattr',
      'dict',
      'dir',
      'divmod',
      'enumerate',
      'eval',
      'exec',
      'filter',
      'float',
      'format',
      'frozenset',
      'getattr',
      'globals',
      'hasattr',
      'hash',
      'help',
      'hex',
      'id',
      'input',
      'int',
      'isinstance',
      'issubclass',
      'iter',
      'len',
      'list',
      'locals',
      'map',
      'max',
      'memoryview',
      'min',
      'next',
      'object',
      'oct',
      'open',
      'ord',
      'pow',
      'print',
      'property',
      'range',
      'repr',
      'reversed',
      'round',
      'set',
      'setattr',
      'slice',
      'sorted',
      'staticmethod',
      'str',
      'sum',
      'super',
      'tuple',
      'type',
      'vars',
      'zip',
    ],
    operators: [
      '+',
      '-',
      '*',
      '/',
      '//',
      '%',
      '**',
      '=',
      '==',
      '!=',
      '<',
      '>',
      '<=',
      '>=',
      'and',
      'or',
      'not',
      'is',
      'in',
    ],
    commentRegex: /(#.*$)/gm,
    stringRegex: /(".*?"|'.*?'|"""[\s\S]*?"""|'''[\s\S]*?''')/g,
  },

  json: {
    keywords: [],
    operators: [':', ',', '{', '}', '[', ']'],
    commentRegex: /$^/gm, // No comments in JSON
    stringRegex: /(".*?"|'.*?')/g,
  },
};

// ============================================================================
// Syntax Highlighter Implementation
// ============================================================================

/**
 * Tokenizes and highlights source code, returning an array of styled React `<span>` elements.
 *
 * For code exceeding 10,000 characters, the input is returned as a single
 * unstyled span to avoid performance issues.
 *
 * @param code - The source code string to highlight
 * @param language - Language identifier (case-insensitive). Falls back to JavaScript if unknown.
 * @param theme - The color theme to apply to tokens
 * @returns Array of React elements with inline color styles
 *
 * @example
 * ```ts
 * const elements = highlightCode('const x = 1;', 'typescript', darkTheme);
 * ```
 */
export function highlightCode(code: string, language: string, theme: SyntaxTheme): ReactNode[] {
  if (code === '') return [];
  const langDef = languages[language.toLowerCase()] ?? languages['javascript'];
  if (langDef == null) {
    return [<span key="0">{code}</span>];
  }
  const elements: ReactNode[] = [];

  const baseStyle: React.CSSProperties = {
    color: theme.foreground,
    backgroundColor: 'transparent',
    fontFamily: 'var(--ui-font-family-mono, monospace)',
    fontSize: 'var(--ui-font-size-sm)',
    lineHeight: '1.4',
  };

  if (code.length > 10000) {
    return [
      <span key="0" style={baseStyle}>
        {code}
      </span>,
    ];
  }

  const tokens = tokenizeCode(code, language.toLowerCase(), langDef);

  tokens.forEach((token, index) => {
    const style: React.CSSProperties = {
      ...baseStyle,
      color: getTokenColor(token.type, theme),
    };

    elements.push(
      <span key={index} style={style}>
        {token.value}
      </span>,
    );
  });

  return elements;
}

/** A classified fragment of source code produced by the tokenizer. */
interface Token {
  /** The semantic category of this token, used to select a theme color. */
  type: 'keyword' | 'string' | 'comment' | 'function' | 'number' | 'operator' | 'plain';
  /** The raw source text of this token. */
  value: string;
}

/**
 * Splits source code into an ordered list of classified tokens.
 *
 * Walks the code character-by-character, trying matchers in priority
 * order: newlines, comments, strings, numbers, words (keywords vs plain),
 * and operators.
 *
 * @param code - Source code to tokenize
 * @param language - Normalized language identifier
 * @param langDef - The language definition providing keywords and patterns
 * @returns Ordered array of tokens covering the entire input
 */
function tokenizeCode(code: string, language: string, langDef: LanguageDefinition): Token[] {
  const tokens: Token[] = [];
  const operators = [...new Set(langDef.operators)].sort((a, b) => b.length - a.length);
  let index = 0;

  while (index < code.length) {
    const char = code[index];
    if (char === '\n') {
      tokens.push({ type: 'plain', value: '\n' });
      index += 1;
      continue;
    }

    const commentMatch = matchComment(code, index, language);
    if (commentMatch !== null) {
      tokens.push({ type: 'comment', value: commentMatch });
      index += commentMatch.length;
      continue;
    }

    const stringMatch = matchString(code, index, language);
    if (stringMatch !== null) {
      tokens.push({ type: 'string', value: stringMatch });
      index += stringMatch.length;
      continue;
    }

    const numberMatch = matchNumberAt(code, index);
    if (numberMatch !== null) {
      tokens.push({ type: 'number', value: numberMatch });
      index += numberMatch.length;
      continue;
    }

    const wordMatch = matchWordAt(code, index);
    if (wordMatch !== null) {
      tokens.push({
        type: langDef.keywords.includes(wordMatch) ? 'keyword' : 'plain',
        value: wordMatch,
      });
      index += wordMatch.length;
      continue;
    }

    const operatorMatch = matchOperatorAt(code, index, operators);
    if (operatorMatch !== null) {
      if (!/^[(){}[\],;]$/.test(operatorMatch)) {
        tokens.push({ type: 'operator', value: operatorMatch });
      }
      index += operatorMatch.length;
      continue;
    }

    index += 1;
  }

  return tokens;
}

/**
 * Attempts to match a comment starting at the given index.
 *
 * Supports `//` and `/* ... * /` for C-style languages, and `#` for Python.
 *
 * @param code - Full source code string
 * @param index - Position to start matching from
 * @param language - Language identifier (determines comment syntax)
 * @returns The matched comment string, or null if no comment starts here
 */
function matchComment(code: string, index: number, language: string): string | null {
  if (language === 'python') {
    if (code[index] === '#') {
      const end = code.indexOf('\n', index);
      return code.slice(index, end === -1 ? code.length : end);
    }
    return null;
  }

  if (code.startsWith('//', index)) {
    const end = code.indexOf('\n', index);
    return code.slice(index, end === -1 ? code.length : end);
  }

  if (code.startsWith('/*', index)) {
    const end = code.indexOf('*/', index + 2);
    return end === -1 ? code.slice(index) : code.slice(index, end + 2);
  }

  return null;
}

/**
 * Attempts to match a string literal starting at the given index.
 *
 * Handles single quotes, double quotes, and template literals (backticks).
 * For Python, also handles triple-quoted strings (`"""` / `'''`).
 * Respects backslash escapes within strings.
 *
 * @param code - Full source code string
 * @param index - Position to start matching from
 * @param language - Language identifier (affects triple-quote handling)
 * @returns The matched string literal including delimiters, or null
 */
function matchString(code: string, index: number, language: string): string | null {
  const char = code[index];
  if ((char ?? '') === '' || !['"', "'", '`'].includes(char as string)) {
    if (language === 'python') {
      if (code.startsWith('"""', index) || code.startsWith("'''", index)) {
        const quote = code.slice(index, index + 3);
        const end = code.indexOf(quote, index + 3);
        return end === -1 ? code.slice(index) : code.slice(index, end + 3);
      }
    }
    return null;
  }

  if (language === 'python' && (code.startsWith('"""', index) || code.startsWith("'''", index))) {
    const quote = code.slice(index, index + 3);
    const end = code.indexOf(quote, index + 3);
    return end === -1 ? code.slice(index) : code.slice(index, end + 3);
  }

  let cursor = index + 1;
  while (cursor < code.length) {
    const current = code[cursor];
    if (current === '\\') {
      cursor += 2;
      continue;
    }
    if (current === char) {
      return code.slice(index, cursor + 1);
    }
    cursor += 1;
  }

  return code.slice(index);
}

/**
 * Matches an identifier (word) starting at the given index.
 *
 * Uses a sticky regex to match `[A-Za-z_$][\w$]*`.
 *
 * @param code - Full source code string
 * @param index - Position to start matching from
 * @returns The matched word string, or null
 */
function matchWordAt(code: string, index: number): string | null {
  const wordRegex = /[A-Za-z_$][\w$]*/y;
  wordRegex.lastIndex = index;
  const match = wordRegex.exec(code);
  return match != null ? match[0] : null;
}

/**
 * Matches a numeric literal (integer or decimal) starting at the given index.
 *
 * @param code - Full source code string
 * @param index - Position to start matching from
 * @returns The matched number string, or null
 */
function matchNumberAt(code: string, index: number): string | null {
  const numberRegex = /\d+(?:\.\d+)?/y;
  numberRegex.lastIndex = index;
  const match = numberRegex.exec(code);
  return match != null ? match[0] : null;
}

/**
 * Matches an operator starting at the given index.
 *
 * Operators are checked longest-first to ensure multi-character operators
 * (e.g. `===`) are matched before shorter prefixes (e.g. `==`).
 *
 * @param code - Full source code string
 * @param index - Position to start matching from
 * @param operators - Pre-sorted operator list (longest first)
 * @returns The matched operator string, or null
 */
function matchOperatorAt(code: string, index: number, operators: string[]): string | null {
  for (const op of operators) {
    if (code.startsWith(op, index)) {
      return op;
    }
  }
  return null;
}

/**
 * Maps a token type to its corresponding theme color.
 *
 * @param type - The semantic token type
 * @param theme - The active syntax theme
 * @returns CSS color string for the token
 */
function getTokenColor(type: Token['type'], theme: SyntaxTheme): string {
  switch (type) {
    case 'keyword':
      return theme.keywords;
    case 'string':
      return theme.strings;
    case 'comment':
      return theme.comments;
    case 'function':
      return theme.functions;
    case 'number':
      return theme.numbers;
    case 'operator':
      return theme.operators;
    case 'plain':
    default:
      return theme.foreground;
  }
}

// ============================================================================
// React Component
// ============================================================================

/**
 * Renders syntax-highlighted source code as a styled React element.
 *
 * A lightweight, zero-dependency alternative to `react-syntax-highlighter`.
 * Supports JavaScript, TypeScript, Python, and JSON with built-in light
 * and dark themes. Optionally displays line numbers.
 *
 * @example
 * ```tsx
 * <SyntaxHighlighter language="typescript" theme="dark" showLineNumbers>
 *   {'const greeting: string = "hello";'}
 * </SyntaxHighlighter>
 * ```
 */
export const SyntaxHighlighter = ({
  language,
  children,
  showLineNumbers = false,
  startingLineNumber = 1,
  theme = 'dark',
  className,
}: SyntaxHighlighterProps): React.ReactElement => {
  const resolvedTheme =
    typeof theme === 'string' ? (theme === 'dark' ? darkTheme : lightTheme) : theme;

  const highlighted = highlightCode(children, language, resolvedTheme);
  const lines = children.split('\n');

  const containerStyle: React.CSSProperties = {
    backgroundColor: resolvedTheme.background,
    color: resolvedTheme.foreground,
    padding: 'var(--ui-gap-lg)',
    borderRadius: 'var(--ui-radius-md)',
    fontFamily: 'var(--ui-font-family-mono, monospace)',
    fontSize: 'var(--ui-font-size-sm)',
    lineHeight: '1.4',
    overflow: 'auto',
  };

  if (showLineNumbers) {
    return (
      <div className={className} style={containerStyle}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {lines.map((line, index) => {
              const lineNumber = startingLineNumber + index;
              const lineHighlighted = highlightCode(line, language, resolvedTheme);

              return (
                <tr key={index}>
                  <td
                    style={{
                      color: resolvedTheme.comments,
                      paddingRight: 'var(--ui-gap-lg)',
                      textAlign: 'right',
                      userSelect: 'none',
                      borderRight: `1px solid color-mix(in srgb, ${resolvedTheme.foreground} 12%, transparent)`,
                    }}
                  >
                    {lineNumber}
                  </td>
                  <td style={{ paddingLeft: 'var(--ui-gap-lg)' }}>{lineHighlighted}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className={className} style={containerStyle}>
      <code>{highlighted}</code>
    </pre>
  );
};

// ============================================================================
// Export themes for customization
// ============================================================================

export { darkTheme, lightTheme };

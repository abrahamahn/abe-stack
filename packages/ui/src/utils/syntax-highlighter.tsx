// packages/ui/src/utils/syntax-highlighter.tsx
/**
 * Custom Syntax Highlighter - Lightweight replacement for react-syntax-highlighter
 *
 * Features:
 * - Basic syntax highlighting for common languages
 * - Lightweight implementation
 * - Customizable themes
 * - Line numbers support
 */

import { type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface SyntaxHighlighterProps {
  language: string;
  children: string;
  showLineNumbers?: boolean;
  startingLineNumber?: number;
  theme?: 'light' | 'dark' | SyntaxTheme;
  className?: string;
}

export interface SyntaxTheme {
  background: string;
  foreground: string;
  keywords: string;
  strings: string;
  comments: string;
  functions: string;
  variables: string;
  numbers: string;
  operators: string;
}

// ============================================================================
// Built-in Themes
// ============================================================================

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

interface LanguageDefinition {
  keywords: string[];
  builtinFunctions?: string[];
  builtinTypes?: string[];
  operators: string[];
  commentRegex: RegExp;
  stringRegex: RegExp;
}

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

export function highlightCode(code: string, language: string, theme: SyntaxTheme): ReactNode[] {
  if (code === '') return [];
  const langDef = languages[language.toLowerCase()] ?? languages.javascript;
  if (langDef == null) {
    return [<span key="0">{code}</span>];
  }
  const elements: ReactNode[] = [];

  const baseStyle: React.CSSProperties = {
    color: theme.foreground,
    backgroundColor: 'transparent',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    fontSize: '14px',
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

interface Token {
  type: 'keyword' | 'string' | 'comment' | 'function' | 'number' | 'operator' | 'plain';
  value: string;
}

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

function matchWordAt(code: string, index: number): string | null {
  const wordRegex = /[A-Za-z_$][\w$]*/y;
  wordRegex.lastIndex = index;
  const match = wordRegex.exec(code);
  return match != null ? match[0] : null;
}

function matchNumberAt(code: string, index: number): string | null {
  const numberRegex = /\d+(?:\.\d+)?/y;
  numberRegex.lastIndex = index;
  const match = numberRegex.exec(code);
  return match != null ? match[0] : null;
}

function matchOperatorAt(code: string, index: number, operators: string[]): string | null {
  for (const op of operators) {
    if (code.startsWith(op, index)) {
      return op;
    }
  }
  return null;
}

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
    default:
      return theme.foreground;
  }
}

// ============================================================================
// React Component
// ============================================================================

export function SyntaxHighlighter({
  language,
  children,
  showLineNumbers = false,
  startingLineNumber = 1,
  theme = 'dark',
  className,
}: SyntaxHighlighterProps): React.ReactElement {
  const resolvedTheme =
    typeof theme === 'string' ? (theme === 'dark' ? darkTheme : lightTheme) : theme;

  const highlighted = highlightCode(children, language, resolvedTheme);
  const lines = children.split('\n');

  const containerStyle: React.CSSProperties = {
    backgroundColor: resolvedTheme.background,
    color: resolvedTheme.foreground,
    padding: '16px',
    borderRadius: '6px',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    fontSize: '14px',
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
                      paddingRight: '16px',
                      textAlign: 'right',
                      userSelect: 'none',
                      borderRight: `1px solid ${resolvedTheme.foreground}20`,
                    }}
                  >
                    {lineNumber}
                  </td>
                  <td style={{ paddingLeft: '16px' }}>{lineHighlighted}</td>
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
}

// ============================================================================
// Export themes for customization
// ============================================================================

export { darkTheme, lightTheme };


// main/client/ui/src/utils/markdown.tsx
/**
 * Custom Markdown Parser - Lightweight replacement for react-markdown
 *
 * Supports basic markdown features:
 * - Headers (# ## ###)
 * - Bold/Italic (**bold**, *italic*)
 * - Code blocks (```language)
 * - Inline code (`code`)
 * - Links ([text](url))
 * - Lists (- item, 1. item)
 * - Blockquotes (> quote)
 * - Tables (| col | col |)
 * - Line breaks
 */

import { createElement, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

/** Options controlling markdown parsing behavior. */
export interface MarkdownOptions {
  /** Whether to allow raw HTML pass-through (not currently implemented). */
  allowHtml?: boolean;
  /** When true, URLs in links are sanitized to only allow http/https protocols. */
  sanitize?: boolean;
  /** When true, single newlines within paragraphs produce `<br>` elements. */
  breaks?: boolean;
}

/** Result of parsing a markdown header line. */
interface ParsedHeader {
  /** Header depth (1 for `#`, 2 for `##`, etc.). */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** The text content following the `#` markers. */
  content: string;
}

/** Result of parsing a markdown list item line. */
interface ParsedList {
  /** The list marker character(s) (e.g. `-`, `*`, `1.`). */
  marker: string;
  /** The text content following the marker. */
  content: string;
}

/**
 * Attempts to parse a line as a markdown header (`# heading`).
 *
 * @param line - A single line of markdown text
 * @returns The parsed header, or null if the line is not a valid header
 */
function parseHeaderLine(line: string): ParsedHeader | null {
  let i = 0;
  while (i < line.length && line.charCodeAt(i) === 35 && i < 6) {
    i++;
  }
  if (i === 0 || i > 6) return null;
  if (i >= line.length || line.charCodeAt(i) !== 32) return null;
  const content = line.slice(i + 1).trim();
  if (content === '') return null;
  return { level: i as ParsedHeader['level'], content };
}

/**
 * Attempts to parse a line as a markdown list item (unordered or ordered).
 *
 * Recognizes `-`, `*`, `+` for unordered lists and `1.`, `2.`, etc. for ordered.
 *
 * @param line - A single line of markdown text
 * @returns The parsed list item, or null if the line is not a valid list item
 */
function parseListLine(line: string): ParsedList | null {
  let i = 0;
  while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) {
    i++;
  }
  if (i >= line.length) return null;

  let marker = '';
  const charCode = line.charCodeAt(i);
  if (charCode === 45 || charCode === 42 || charCode === 43) {
    marker = line[i] ?? '';
    i++;
  } else {
    const start = i;
    while (i < line.length) {
      const code = line.charCodeAt(i);
      if (code < 48 || code > 57) break;
      i++;
    }
    if (i > start && line.charCodeAt(i) === 46) {
      marker = line.slice(start, i + 1);
      i++;
    }
  }

  if (marker === '' || i >= line.length || line.charCodeAt(i) !== 32) {
    return null;
  }
  const content = line.slice(i + 1).trim();
  if (content === '') return null;
  return { marker, content };
}

/**
 * Checks whether a line starts with a list item marker.
 *
 * @param line - A single line of markdown text
 * @returns True if the line can be parsed as a list item
 */
function isListLine(line: string): boolean {
  return parseListLine(line) != null;
}

/**
 * Determines whether a list marker indicates an ordered list (e.g. `1.`).
 *
 * @param marker - The extracted marker string
 * @returns True if the marker is a numeric ordered-list prefix
 */
function isOrderedListMarker(marker: string): boolean {
  if (!marker.endsWith('.')) return false;
  const numericPart = marker.slice(0, -1);
  if (numericPart === '') return false;
  for (let i = 0; i < numericPart.length; i++) {
    const code = numericPart.charCodeAt(i);
    if (code < 48 || code > 57) return false;
  }
  return true;
}

/** Check if a string consists solely of `-`, `*`, or `_` repeated 3+ times. */
function isHorizontalRule(s: string): boolean {
  if (s.length < 3) return false;
  const first = s.charCodeAt(0);
  if (first !== 45 && first !== 42 && first !== 95) return false;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) !== first) return false;
  }
  return true;
}

/** Check if a cell matches the table separator pattern (e.g. `---`, `:---:`, `---:`). */
function isTableSeparatorCell(cell: string): boolean {
  const len = cell.length;
  if (len < 3) return false;
  let start = 0;
  let end = len;
  if (cell.charCodeAt(start) === 58) start++; // leading ':'
  if (cell.charCodeAt(end - 1) === 58) end--; // trailing ':'
  if (end - start < 3) return false;
  for (let i = start; i < end; i++) {
    if (cell.charCodeAt(i) !== 45) return false; // must be '-'
  }
  return true;
}

/** Column alignment derived from the separator row's colon positions. */
type TableAlignment = 'left' | 'center' | 'right' | undefined;

/**
 * Checks whether a line is a valid markdown table separator row
 * (e.g. `| --- | :---: | ---: |`).
 *
 * @param line - A single line of markdown text
 * @returns True if the line matches the table separator pattern
 */
function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
  if (cells.length === 0) return false;
  return cells.every(isTableSeparatorCell);
}

/**
 * Extracts column alignment instructions from a table separator row.
 *
 * @param separatorLine - The separator row (e.g. `| :--- | :---: | ---: |`)
 * @returns Array of alignment values corresponding to each column
 */
function parseTableAlignments(separatorLine: string): TableAlignment[] {
  const cells = separatorLine
    .trim()
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
  return cells.map((cell): TableAlignment => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return undefined;
  });
}

/**
 * Splits a table row line into individual cell content strings.
 *
 * @param line - A pipe-delimited table row
 * @returns Array of trimmed cell content strings
 */
function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutTrailing = inner.endsWith('|') ? inner.slice(0, -1) : inner;
  return withoutTrailing.split('|').map((c) => c.trim());
}

/**
 * Checks whether a line contains pipe characters, indicating it may be a table row.
 *
 * @param line - A single line of markdown text
 * @returns True if the line contains at least one pipe character
 */
function isTableRow(line: string): boolean {
  return line.trim().includes('|');
}

// ============================================================================
// Markdown Parser
// ============================================================================

/**
 * Parses a markdown string into an array of React elements.
 *
 * Supports headers, bold/italic, code blocks, inline code, links,
 * ordered/unordered lists, blockquotes, tables, horizontal rules,
 * and strikethrough.
 *
 * @param text - Raw markdown string to parse
 * @param options - Optional parsing configuration
 * @returns Array of React nodes representing the parsed markdown
 *
 * @example
 * ```ts
 * const nodes = parseMarkdown('# Hello\n\nWorld **bold**');
 * // [<h1>Hello</h1>, <p>World <strong>bold</strong></p>]
 * ```
 */
export function parseMarkdown(text: string, options: MarkdownOptions = {}): ReactNode[] {
  if (text === '') return [];

  // Split into lines for processing
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: ReactNode[] } | null = null;
  let currentBlockquote: ReactNode[] | null = null;
  let currentParagraph: ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockContent = '';
  const { breaks = false } = options;

  const flushParagraph = (keySuffix: string): void => {
    if (currentParagraph.length === 0) return;
    const content =
      currentParagraph.length === 1 && typeof currentParagraph[0] === 'string'
        ? currentParagraph[0]
        : currentParagraph;
    elements.push(<p key={`p-${keySuffix}`}>{content}</p>);
    currentParagraph = [];
  };

  const flushList = (keySuffix: string): void => {
    if (currentList == null) return;
    const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
    elements.push(<ListTag key={`list-${keySuffix}`}>{currentList.items}</ListTag>);
    currentList = null;
  };

  const flushBlockquote = (keySuffix: string): void => {
    if (currentBlockquote == null) return;
    elements.push(<blockquote key={`blockquote-${keySuffix}`}>{currentBlockquote}</blockquote>);
    currentBlockquote = null;
  };

  const appendInline = (target: ReactNode[], content: ReactNode): void => {
    if (Array.isArray(content)) {
      const arrayContent = content as ReactNode[];
      for (const node of arrayContent) {
        target.push(node);
      }
    } else if (content !== '') {
      target.push(content);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        flushParagraph(String(i));
        flushList(String(i));
        flushBlockquote(String(i));
        const className = codeBlockLanguage !== '' ? `language-${codeBlockLanguage}` : undefined;
        elements.push(
          <pre key={`codeblock-${String(i)}`}>
            <code className={className}>{codeBlockContent}</code>
          </pre>,
        );
        inCodeBlock = false;
        codeBlockLanguage = '';
        codeBlockContent = '';
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }

    // Handle headers
    const headerMatch = parseHeaderLine(line);
    if (headerMatch != null) {
      flushParagraph(String(i));
      flushList(String(i));
      flushBlockquote(String(i));
      const level = headerMatch.level;
      const content = parseInlineMarkdown(headerMatch.content, options);
      const tagName = `h${String(level)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      elements.push(createElement(tagName, { key: `header-${String(i)}` }, content));
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      flushParagraph(String(i));
      flushList(String(i));
      const quoteContent = line.slice(1).trim();
      currentBlockquote ??= [];
      appendInline(currentBlockquote, parseInlineMarkdown(quoteContent, options));
      if (breaks) {
        currentBlockquote.push(<br key={`br-${String(i)}`} />);
      }

      // Check if next line continues blockquote
      const nextLine = lines[i + 1];
      if (i + 1 < lines.length && (nextLine?.startsWith('>') ?? false)) {
        continue;
      }

      // End blockquote
      flushBlockquote(String(i));
      continue;
    }

    // Handle lists
    const listMatch = parseListLine(line);
    if (listMatch != null) {
      const marker = listMatch.marker;
      const content = parseInlineMarkdown(listMatch.content, options);

      const isOrdered = isOrderedListMarker(marker);

      flushParagraph(String(i));
      flushBlockquote(String(i));

      if (currentList?.type !== (isOrdered ? 'ol' : 'ul')) {
        // Start new list
        if (currentList != null) {
          flushList(String(i - 1));
        }
        currentList = {
          type: isOrdered ? 'ol' : 'ul',
          items: [],
        };
      }

      currentList.items.push(<li key={`item-${String(i)}`}>{content}</li>);

      // Check if next line continues the list
      const nextListLine = lines[i + 1];
      if (i + 1 >= lines.length || nextListLine == null || !isListLine(nextListLine)) {
        // End list
        flushList(String(i));
      }
      continue;
    }

    // Handle horizontal rules
    if (isHorizontalRule(line.trim())) {
      flushParagraph(String(i));
      flushList(String(i));
      flushBlockquote(String(i));
      elements.push(<hr key={`hr-${String(i)}`} />);
      continue;
    }

    // Handle tables
    if (line.includes('|') && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1] ?? '')) {
      flushParagraph(String(i));
      flushList(String(i));
      flushBlockquote(String(i));

      const headerCells = parseTableRow(line);
      const alignments = parseTableAlignments(lines[i + 1] ?? '');

      const headerRow = (
        <tr key={`thead-tr-${String(i)}`}>
          {headerCells.map((cell, colIdx) => (
            <th
              key={`th-${String(i)}-${String(colIdx)}`}
              style={alignments[colIdx] != null ? { textAlign: alignments[colIdx] } : undefined}
            >
              {parseInlineMarkdown(cell, options)}
            </th>
          ))}
        </tr>
      );

      const bodyRows: ReactNode[] = [];
      let rowIdx = i + 2;
      while (rowIdx < lines.length && isTableRow(lines[rowIdx] ?? '')) {
        const rowLine = lines[rowIdx] ?? '';
        if (rowLine.trim() === '') break;
        const cells = parseTableRow(rowLine);
        bodyRows.push(
          <tr key={`tr-${String(rowIdx)}`}>
            {cells.map((cell, colIdx) => (
              <td
                key={`td-${String(rowIdx)}-${String(colIdx)}`}
                style={alignments[colIdx] != null ? { textAlign: alignments[colIdx] } : undefined}
              >
                {parseInlineMarkdown(cell, options)}
              </td>
            ))}
          </tr>,
        );
        rowIdx++;
      }

      elements.push(
        <table key={`table-${String(i)}`}>
          <thead>{headerRow}</thead>
          {bodyRows.length > 0 && <tbody>{bodyRows}</tbody>}
        </table>,
      );

      i = rowIdx - 1;
      continue;
    }

    // Handle empty lines or regular paragraphs
    if (line.trim() === '') {
      flushParagraph(String(i));
      flushList(String(i));
      flushBlockquote(String(i));
      continue;
    }

    // Regular paragraph
    const content = parseInlineMarkdown(line, options);
    if (currentParagraph.length > 0) {
      if (breaks) {
        currentParagraph.push(<br key={`br-${String(i)}`} />);
      } else {
        currentParagraph.push('\n');
      }
    }
    appendInline(currentParagraph, content);
  }

  // Clean up any remaining structures
  flushParagraph('final');
  flushList('final');
  flushBlockquote('final');

  return elements;
}

// ============================================================================
// Inline Markdown Parser
// ============================================================================

/**
 * Parses inline markdown formatting within a single line of text.
 *
 * Processes (in priority order): inline code, bold, italic, links,
 * and strikethrough. Also handles backslash-escaped characters.
 *
 * @param text - A single line (or fragment) of markdown text
 * @param options - Parsing options (e.g. sanitize for URL filtering)
 * @returns A React node (string, element, or array of mixed nodes)
 */
function parseInlineMarkdown(text: string, options: MarkdownOptions): ReactNode {
  const { sanitize = false } = options;

  if (text === '') return '';
  if (text.length > 8_000) return text;

  let unescaped = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i] as string;
    const next = text[i + 1];
    if (char === '\\' && (next === '`' || next === '*' || next === '\\')) {
      unescaped += next;
      i++;
      continue;
    }
    unescaped += char;
  }
  if (unescaped !== text) {
    return unescaped;
  }

  const elements: ReactNode[] = [];
  let remaining = text;

  // Process inline elements in order of specificity (most specific first)
  const patterns: Array<{
    regex: RegExp;
    replace: (groups: string[], key: string) => ReactNode;
  }> = [
    // Code (must come before other patterns that might interfere)
    {
      regex: /`([^`]+)`/g,
      replace: (groups: string[], key: string): ReactNode => (
        <code key={`code-${key}`}>{groups[0]}</code>
      ),
    },
    // Bold
    {
      regex: /\*\*([^*\n]+)\*\*/g,
      replace: (groups: string[], key: string): ReactNode => (
        <strong key={`bold-${key}`}>{groups[0]}</strong>
      ),
    },
    // Italic
    {
      regex: /\*([^*\n]+)\*/g,
      replace: (groups: string[], key: string): ReactNode => (
        <em key={`italic-${key}`}>{groups[0]}</em>
      ),
    },
    // Links
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/g,
      replace: (groups: string[], key: string): ReactNode => (
        <a
          key={`link-${key}`}
          href={sanitizeUrl(groups[1] ?? '', sanitize)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {groups[0]}
        </a>
      ),
    },
    // Strikethrough
    {
      regex: /~~([^~\n]+)~~/g,
      replace: (groups: string[], key: string): ReactNode => (
        <del key={`strike-${key}`}>{groups[0]}</del>
      ),
    },
  ];

  let inlineKeyCounter = 0;

  while (remaining !== '') {
    let earliestMatch: { index: number; match: string; replacement: ReactNode } | null = null;

    // Find the earliest match across all patterns
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0; // Reset regex state
      const regexMatch = pattern.regex.exec(remaining);
      if (
        regexMatch !== null &&
        (earliestMatch === null || regexMatch.index < earliestMatch.index)
      ) {
        const groups = regexMatch.slice(1);
        inlineKeyCounter++;
        const replacement = pattern.replace(groups, String(inlineKeyCounter));
        earliestMatch = {
          index: regexMatch.index,
          match: regexMatch[0],
          replacement,
        };
      }
    }

    if (earliestMatch != null) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        elements.push(remaining.slice(0, earliestMatch.index));
      }

      // Add the replacement
      elements.push(earliestMatch.replacement);

      // Continue with remaining text
      remaining = remaining.slice(earliestMatch.index + earliestMatch.match.length);
    } else {
      // No more matches, add remaining text
      elements.push(remaining);
      break;
    }
  }

  if (elements.length === 0) return text;
  if (elements.length === 1 && typeof elements[0] === 'string') return elements[0];
  return elements;
}

// ============================================================================
// URL Sanitization
// ============================================================================

/**
 * Sanitizes a URL by ensuring only http/https protocols are allowed.
 *
 * When sanitization is disabled, the URL is returned as-is. When enabled,
 * invalid URLs or non-http(s) protocols are replaced with `'#'`.
 *
 * @param url - The URL string to sanitize
 * @param shouldSanitize - Whether sanitization is active
 * @returns The original URL if safe, or `'#'` as a fallback
 */
function sanitizeUrl(url: string, shouldSanitize: boolean): string {
  if (!shouldSanitize) return url;

  // Basic URL sanitization - only allow http/https protocols
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '#'; // Return safe fallback
    }
    return url;
  } catch {
    return '#'; // Return safe fallback for invalid URLs
  }
}

// ============================================================================
// React Component
// ============================================================================

/** Props for the {@link Markdown} React component. */
export interface MarkdownProps extends MarkdownOptions {
  /** Raw markdown string to render. */
  children: string;
  /** Optional CSS class name applied to the wrapper `<div>`. */
  className?: string;
}

/**
 * Renders a markdown string as React elements inside a wrapper `<div>`.
 *
 * A lightweight alternative to `react-markdown` that supports the most
 * common markdown features without external dependencies.
 *
 * @example
 * ```tsx
 * <Markdown className="prose">
 *   {"# Hello\n\nSome **bold** text."}
 * </Markdown>
 * ```
 */
export const Markdown = ({
  children,
  className,
  ...options
}: MarkdownProps): React.ReactElement | null => {
  const elements = parseMarkdown(children, options);

  if (elements.length === 0) {
    return null;
  }

  return <div className={className}>{elements}</div>;
};

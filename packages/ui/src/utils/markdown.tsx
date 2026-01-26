// packages/ui/src/utils/markdown.tsx
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
 * - Line breaks
 */

import { createElement, type ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface MarkdownOptions {
  allowHtml?: boolean;
  sanitize?: boolean;
  breaks?: boolean;
}

// ============================================================================
// Markdown Parser
// ============================================================================

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
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch !== null && (headerMatch[1] ?? '') !== '' && (headerMatch[2] ?? '') !== '') {
      flushParagraph(String(i));
      flushList(String(i));
      flushBlockquote(String(i));
      const level = headerMatch[1]?.length ?? 1;
      const content = parseInlineMarkdown(headerMatch[2] ?? '', options);
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
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listMatch?.[1] !== undefined && (listMatch[2] ?? '') !== '' && (listMatch[3] ?? '') !== '') {
      const marker = listMatch[2] ?? '';
      const content = parseInlineMarkdown(listMatch[3] ?? '', options);

      const isOrdered = /^\d+\./.test(marker);

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
      if (i + 1 >= lines.length || nextListLine?.match(/^(\s*)([-*+]|\d+\.)\s+/) == null) {
        // End list
        flushList(String(i));
      }
      continue;
    }

    // Handle horizontal rules
    if (/^[-*_]{3,}$/.test(line.trim())) {
      flushParagraph(String(i));
      flushList(String(i));
      flushBlockquote(String(i));
      elements.push(<hr key={`hr-${String(i)}`} />);
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

function parseInlineMarkdown(text: string, options: MarkdownOptions): ReactNode {
  const { sanitize = false } = options;

  if (text === '') return '';

  const unescaped = text.replace(/\\([`*\\])/g, '$1');
  if (unescaped !== text) {
    return unescaped;
  }

  const patternsToCheck = [
    /`[^`]+`/,
    /\*\*[^*\n]+\*\*/,
    /\*[^*\n]+\*/,
    /\[[^\]]+\]\([^)]+\)/,
    /~~[^~\n]+~~/,
  ];
  const matchedPatternCount = patternsToCheck.reduce(
    (count, pattern) => count + Number(pattern.test(text)),
    0,
  );
  if (matchedPatternCount >= 3) {
    return text;
  }

  const elements: ReactNode[] = [];
  let remaining = text;

  // Process inline elements in order of specificity (most specific first)
  const patterns: Array<{
    regex: RegExp;
    replace: (groups: string[]) => ReactNode;
  }> = [
    // Code (must come before other patterns that might interfere)
    {
      regex: /`([^`]+)`/g,
      replace: (groups: string[]): ReactNode => (
        <code key={`code-${String(Math.random())}`}>{groups[0]}</code>
      ),
    },
    // Bold
    {
      regex: /\*\*([^*\n]+)\*\*/g,
      replace: (groups: string[]): ReactNode => (
        <strong key={`bold-${String(Math.random())}`}>{groups[0]}</strong>
      ),
    },
    // Italic
    {
      regex: /\*([^*\n]+)\*/g,
      replace: (groups: string[]): ReactNode => (
        <em key={`italic-${String(Math.random())}`}>{groups[0]}</em>
      ),
    },
    // Links
    {
      regex: /\[([^\]]+)\]\((.+)\)/g,
      replace: (groups: string[]): ReactNode => (
        <a
          key={`link-${String(Math.random())}`}
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
      replace: (groups: string[]): ReactNode => (
        <del key={`strike-${String(Math.random())}`}>{groups[0]}</del>
      ),
    },
  ];

  while (remaining !== '') {
    let earliestMatch: { index: number; match: string; replacement: ReactNode } | null = null;

    // Find the earliest match across all patterns
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0; // Reset regex state
      const regexMatch = pattern.regex.exec(remaining);
      if (regexMatch !== null && (earliestMatch === null || regexMatch.index < earliestMatch.index)) {
        const groups = regexMatch.slice(1);
        const replacement = pattern.replace(groups);
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

export interface MarkdownProps extends MarkdownOptions {
  children: string;
  className?: string;
}

export function Markdown({
  children,
  className,
  ...options
}: MarkdownProps): React.ReactElement | null {
  const elements = parseMarkdown(children, options);

  if (elements.length === 0) {
    return null;
  }

  return <div className={className}>{elements}</div>;
}

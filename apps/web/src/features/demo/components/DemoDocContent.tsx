// apps/web/src/features/demo/components/DemoDocContent.tsx
import { Heading, Skeleton, Text } from '@abe-stack/ui';
import { getComponentDocsLazy } from '@demo/utils/lazyDocs';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import type { ComponentDemo } from '@demo/types';
import type { ReactElement } from 'react';

type DemoDocContentProps = {
  component: ComponentDemo;
};

export function DemoDocContent({ component }: DemoDocContentProps): ReactElement {
  const [docs, setDocs] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    void getComponentDocsLazy(component.id, component.category, component.name).then((result) => {
      if (!cancelled) {
        setDocs(result);
        setIsLoading(false);
      }
    });

    return (): void => {
      cancelled = true;
    };
  }, [component.id, component.category, component.name]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton width="60%" height="1.5rem" />
        <Skeleton width="100%" height="4rem" />
        <Skeleton width="80%" height="1rem" />
      </div>
    );
  }

  if (docs) {
    return (
      <div className="markdown-content">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              // Convert children to string - react-markdown typically passes string content
              let codeString = '';
              if (typeof children === 'string') {
                codeString = children;
              } else if (Array.isArray(children)) {
                codeString = children.join('');
              }
              codeString = codeString.replace(/\n$/, '');
              return match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: 'var(--ui-radius-md)' }}
                >
                  {codeString}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {docs}
        </Markdown>
      </div>
    );
  }

  return (
    <>
      <section>
        <Heading as="h3" size="sm">
          Description
        </Heading>
        <Text>{component.description}</Text>
      </section>
      <section>
        <Heading as="h3" size="sm">
          Category
        </Heading>
        <Text>{component.category}</Text>
      </section>
      <section>
        <Heading as="h3" size="sm">
          Variants
        </Heading>
        <Text>{component.variants.length} available</Text>
      </section>
    </>
  );
}

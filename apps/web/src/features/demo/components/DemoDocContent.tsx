// apps/web/src/features/demo/components/DemoDocContent.tsx
import { Heading, Skeleton, Text } from '@abe-stack/ui';
import { getComponentDocsLazy, parseMarkdownLazy } from '@demo/utils/lazyDocs';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

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
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdownLazy(docs)) }} />
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

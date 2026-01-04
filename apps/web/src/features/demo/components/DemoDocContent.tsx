import { Heading, Text } from '@abe-stack/ui';
import { getComponentDocs, parseMarkdown } from '@demo/utils';
import DOMPurify from 'dompurify';

import type { ComponentDemo } from '@demo/types';
import type { ReactElement } from 'react';

type DemoDocContentProps = {
  component: ComponentDemo;
};

export function DemoDocContent({ component }: DemoDocContentProps): ReactElement {
  const docs = getComponentDocs(component.id, component.category, component.name);

  if (docs) {
    return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(docs)) }} />;
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

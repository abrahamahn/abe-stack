// apps/web/src/pages/HomePage.tsx
import {
  Button,
  Card,
  Heading,
  Link,
  Markdown,
  PageContainer,
  Skeleton,
  Text,
  useDelayedFlag,
} from '@abe-stack/ui';
import { useCallback, useEffect, useState } from 'react';

import type { JSX } from 'react';

// Prefetch demo page on hover for instant navigation
const prefetchDemo = (): void => {
  void import('@demo');
};

type DocKey =
  | 'readme'
  // Apps
  | 'web'
  | 'desktop'
  // Packages
  | 'core'
  | 'ui'
  | 'client'
  // Dev docs
  | 'architecture'
  | 'configSetup'
  | 'devEnvironment'
  | 'legacy'
  | 'performance'
  | 'principles'
  | 'security'
  | 'syncScripts'
  | 'testing'
  // Logs
  | 'logW01'
  | 'logW02'
  | 'logW03'
  | 'logW04';

interface DocMeta {
  label: string;
  category: 'root' | 'apps' | 'packages' | 'dev' | 'logs';
}

// Doc metadata (no content - loaded on demand)
const docsMeta: Record<DocKey, DocMeta> = {
  // Root
  readme: { label: 'README', category: 'root' },

  // Apps
  web: { label: 'Web', category: 'apps' },
  desktop: { label: 'Desktop', category: 'apps' },

  // Packages
  core: { label: 'Core', category: 'packages' },
  ui: { label: 'UI', category: 'packages' },
  client: { label: 'Client', category: 'packages' },

  // Dev docs
  architecture: { label: 'Architecture', category: 'dev' },
  principles: { label: 'Principles', category: 'dev' },
  devEnvironment: { label: 'Dev Environment', category: 'dev' },
  configSetup: { label: 'Config Setup', category: 'dev' },
  testing: { label: 'Testing', category: 'dev' },
  security: { label: 'Security', category: 'dev' },
  syncScripts: { label: 'Sync Scripts', category: 'dev' },
  performance: { label: 'Performance', category: 'dev' },
  legacy: { label: 'Legacy', category: 'dev' },

  // Logs
  logW01: { label: 'Week 01', category: 'logs' },
  logW02: { label: 'Week 02', category: 'logs' },
  logW03: { label: 'Week 03', category: 'logs' },
  logW04: { label: 'Week 04', category: 'logs' },
};

// Lazy load doc content on demand
async function loadDocContent(key: DocKey): Promise<string> {
  const loaders: Record<DocKey, () => Promise<{ default: string }>> = {
    readme: () => import('../../../../README.md?raw'),
    web: () => import('../../../../apps/web/README.md?raw'),
    desktop: () => import('../../../../apps/desktop/README.md?raw'),
    core: () => import('../../../../core/README.md?raw'),
    ui: () => import('../../../../client/ui/docs/README.md?raw'),
    client: () => import('../../../../client/README.md?raw'),
    architecture: () => import('../../../../apps/docs/specs/architecture.md?raw'),
    principles: () => import('../../../../apps/docs/specs/principles.md?raw'),
    devEnvironment: () => import('../../../../apps/docs/deploy/dev/workflow.md?raw'),
    configSetup: () => import('../../../../apps/docs/deploy/dev/configuration.md?raw'),
    testing: () => import('../../../../apps/docs/deploy/dev/testing.md?raw'),
    security: () => import('../../../../apps/docs/deploy/dev/security.md?raw'),
    syncScripts: () => import('../../../../apps/docs/deploy/dev/sync-scripts.md?raw'),
    performance: () => import('../../../../apps/docs/deploy/dev/performance.md?raw'),
    legacy: () => import('../../../../apps/docs/reference/legacy.md?raw'),
    logW01: () => import('../../../../apps/docs/log/2026-W01.md?raw'),
    logW02: () => import('../../../../apps/docs/log/2026-W02.md?raw'),
    logW03: () => import('../../../../apps/docs/log/2026-W03.md?raw'),
    logW04: () => import('../../../../apps/docs/log/2026-W04.md?raw'),
  };

  const module = await loaders[key]();
  return module.default;
}

// Hook to load doc content with caching
function useDocContent(key: DocKey): { content: string | null; isLoading: boolean } {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cache] = useState<Map<DocKey, string>>(() => new Map());

  useEffect(() => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      setContent(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadDocContent(key)
      .then((loaded) => {
        cache.set(key, loaded);
        setContent(loaded);
      })
      .catch(() => {
        setContent('Failed to load documentation.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [key, cache]);

  return { content, isLoading };
}

const DocIndex = ({
  activeDoc,
  onSelect,
}: {
  activeDoc: DocKey;
  onSelect: (key: DocKey) => void;
}): JSX.Element => {
  const categories: { key: DocMeta['category']; label: string }[] = [
    { key: 'root', label: 'Home' },
    { key: 'apps', label: 'Apps' },
    { key: 'packages', label: 'Packages' },
    { key: 'dev', label: 'Dev Docs' },
    { key: 'logs', label: 'Changelog' },
  ];

  const handleSelect = useCallback(
    (key: DocKey) => {
      onSelect(key);
    },
    [onSelect],
  );

  return (
    <Card className="p-4">
      <nav className="flex flex-col gap-4">
        {categories.map((cat) => (
          <div key={cat.key} className="flex flex-col gap-2">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide">
              {cat.label}
            </Text>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(docsMeta) as [DocKey, DocMeta][])
                .filter(([, doc]) => doc.category === cat.key)
                .map(([key, doc]) => (
                  <Button
                    key={key}
                    variant={activeDoc === key ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => {
                      handleSelect(key);
                    }}
                  >
                    {doc.label}
                  </Button>
                ))}
            </div>
          </div>
        ))}
      </nav>
    </Card>
  );
};

export const HomePage = (): JSX.Element => {
  const [activeDoc, setActiveDoc] = useState<DocKey>('readme');
  const { content, isLoading } = useDocContent(activeDoc);
  // Delay showing skeleton to prevent flash for fast loads
  const showSkeleton = useDelayedFlag(isLoading, 150);

  return (
    <PageContainer>
      <section className="grid gap-3">
        <Heading as="h1" size="xl">
          ABE Stack
        </Heading>
        <Text className="text-md">
          A production-ready TypeScript monorepo for web, desktop, and backend.
        </Text>
      </section>

      <section className="flex gap-2">
        <Link to="/login">
          <Button>Login</Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="secondary">Dashboard</Button>
        </Link>
        <Link to="/demo" onMouseEnter={prefetchDemo}>
          <Button variant="secondary">Demo</Button>
        </Link>
      </section>

      <DocIndex activeDoc={activeDoc} onSelect={setActiveDoc} />

      <Card className="p-4">
        {showSkeleton ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <Markdown className="markdown-content">{content ?? ''}</Markdown>
        )}
      </Card>
    </PageContainer>
  );
};

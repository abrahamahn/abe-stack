// apps/web/src/pages/HomePage.tsx
import { Button, Card, Heading, PageContainer, Text } from '@abe-stack/ui';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import desktopReadme from '../../../../apps/desktop/README.md?raw';
import webReadme from '../../../../apps/web/README.md?raw';
import apiTestPlanDoc from '../../../../docs/dev/api-test-plan.md?raw';
import architectureDoc from '../../../../docs/dev/architecture.md?raw';
import configSetupDoc from '../../../../docs/dev/config-setup.md?raw';
import devEnvironmentDoc from '../../../../docs/dev/dev-environment.md?raw';
import legacyDoc from '../../../../docs/dev/legacy.md?raw';
import performanceDoc from '../../../../docs/dev/performance.md?raw';
import principlesDoc from '../../../../docs/dev/principles.md?raw';
import securityDoc from '../../../../docs/dev/security.md?raw';
import syncScriptsDoc from '../../../../docs/dev/sync-scripts.md?raw';
import testingDoc from '../../../../docs/dev/testing.md?raw';
import weekLog01 from '../../../../docs/log/2026-W01.md?raw';
import weekLog02 from '../../../../docs/log/2026-W02.md?raw';
import weekLog03 from '../../../../docs/log/2026-W03.md?raw';
import weekLog04 from '../../../../docs/log/2026-W04.md?raw';
import coreReadme from '../../../../packages/core/README.md?raw';
import sdkReadme from '../../../../packages/sdk/README.md?raw';
import uiReadme from '../../../../packages/ui/docs/README.md?raw';
import readmeContent from '../../../../README.md?raw';

import type { JSX } from 'react';

type DocKey =
  | 'readme'
  // Apps
  | 'web'
  | 'desktop'
  // Packages
  | 'core'
  | 'ui'
  | 'sdk'
  // Dev docs
  | 'api-test-plan'
  | 'architecture'
  | 'config-setup'
  | 'dev-environment'
  | 'legacy'
  | 'performance'
  | 'principles'
  | 'security'
  | 'sync-scripts'
  | 'testing'
  // Logs
  | 'log-w01'
  | 'log-w02'
  | 'log-w03'
  | 'log-w04';

interface DocEntry {
  label: string;
  content: string;
  category: 'root' | 'apps' | 'packages' | 'dev' | 'logs';
}

const docs: Record<DocKey, DocEntry> = {
  // Root
  readme: { label: 'README', content: readmeContent, category: 'root' },

  // Apps
  web: { label: 'Web', content: webReadme, category: 'apps' },
  desktop: { label: 'Desktop', content: desktopReadme, category: 'apps' },

  // Packages
  core: { label: 'Core', content: coreReadme, category: 'packages' },
  ui: { label: 'UI', content: uiReadme, category: 'packages' },
  sdk: { label: 'SDK', content: sdkReadme, category: 'packages' },

  // Dev docs
  architecture: { label: 'Architecture', content: architectureDoc, category: 'dev' },
  principles: { label: 'Principles', content: principlesDoc, category: 'dev' },
  'dev-environment': { label: 'Dev Environment', content: devEnvironmentDoc, category: 'dev' },
  'config-setup': { label: 'Config Setup', content: configSetupDoc, category: 'dev' },
  testing: { label: 'Testing', content: testingDoc, category: 'dev' },
  security: { label: 'Security', content: securityDoc, category: 'dev' },
  'api-test-plan': { label: 'API Test Plan', content: apiTestPlanDoc, category: 'dev' },
  'sync-scripts': { label: 'Sync Scripts', content: syncScriptsDoc, category: 'dev' },
  performance: { label: 'Performance', content: performanceDoc, category: 'dev' },
  legacy: { label: 'Legacy', content: legacyDoc, category: 'dev' },

  // Logs
  'log-w01': { label: 'Week 01', content: weekLog01, category: 'logs' },
  'log-w02': { label: 'Week 02', content: weekLog02, category: 'logs' },
  'log-w03': { label: 'Week 03', content: weekLog03, category: 'logs' },
  'log-w04': { label: 'Week 04', content: weekLog04, category: 'logs' },
};

function DocIndex({
  activeDoc,
  onSelect,
}: {
  activeDoc: DocKey;
  onSelect: (key: DocKey) => void;
}): JSX.Element {
  const categories: { key: DocEntry['category']; label: string }[] = [
    { key: 'root', label: 'Home' },
    { key: 'apps', label: 'Apps' },
    { key: 'packages', label: 'Packages' },
    { key: 'dev', label: 'Dev Docs' },
    { key: 'logs', label: 'Changelog' },
  ];

  return (
    <Card className="p-4">
      <nav className="flex flex-col gap-4">
        {categories.map((cat) => (
          <div key={cat.key} className="flex flex-col gap-2">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide">
              {cat.label}
            </Text>
            <div className="flex flex-wrap gap-1">
              {(Object.entries(docs) as [DocKey, DocEntry][])
                .filter(([, doc]) => doc.category === cat.key)
                .map(([key, doc]) => (
                  <Button
                    key={key}
                    variant={activeDoc === key ? 'primary' : 'secondary'}
                    size="small"
                    onClick={() => {
                      onSelect(key);
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
}

export function HomePage(): JSX.Element {
  const [activeDoc, setActiveDoc] = useState<DocKey>('readme');
  const currentDoc = docs[activeDoc];

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
        <Link to="/demo">
          <Button variant="secondary">Demo</Button>
        </Link>
      </section>

      <DocIndex activeDoc={activeDoc} onSelect={setActiveDoc} />

      <Card className="p-4">
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentDoc.content}</ReactMarkdown>
        </div>
      </Card>
    </PageContainer>
  );
}

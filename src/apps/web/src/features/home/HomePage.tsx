// src/apps/web/src/features/home/HomePage.tsx
import { useSearchParams } from '@abe-stack/ui';

import { HomeDocViewer } from './components/HomeDocViewer';
import { docsMeta } from './data/docsMeta';
import { useDocContent } from './hooks/useDocContent';

import type { DocKey } from './types';

function isDocKey(value: string): value is DocKey {
  return value in docsMeta;
}

/**
 * Home page content rendered inside the global AppLayout shell.
 * Reads `?doc=<key>` from the URL to select which document to display.
 */
export const HomePage = (): React.ReactElement => {
  const [searchParams] = useSearchParams();
  const docParam = searchParams.get('doc');
  const selectedDoc: DocKey = docParam !== null && isDocKey(docParam) ? docParam : 'readme';
  const { content, isLoading } = useDocContent(selectedDoc);

  return <HomeDocViewer selectedDoc={selectedDoc} content={content} isLoading={isLoading} />;
};

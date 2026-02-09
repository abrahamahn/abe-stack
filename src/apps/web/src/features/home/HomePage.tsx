// src/apps/web/src/features/home/HomePage.tsx
import { HomeDocViewer } from './components';
import { useDocContent } from './hooks';

/**
 * Home page content rendered inside the global AppLayout shell.
 */
export const HomePage = (): React.ReactElement => {
  const { content, isLoading } = useDocContent('readme');

  return <HomeDocViewer selectedDoc="readme" content={content} isLoading={isLoading} />;
};

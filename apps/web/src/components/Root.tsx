import { Suspense } from 'react';

import { AuthProvider } from './auth';
import { ConfirmEmail } from './auth/ConfirmEmail';
import MainLayout from '../layouts/MainLayout';
import { ClientEnvironment, ClientEnvironmentProvider } from '../services/ClientEnvironment';
import { useRoute } from '../services/Router';
import { ResendVerification } from './auth/ResendVerification';
import { Design } from './Design';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { MediaPage } from './pages/MediaPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadPage } from './pages/UploadPage';
import { ThemeProvider } from './theme';

type BaseRoute = {
  url: string;
};

type Route =
  | (BaseRoute & {
      type:
        | 'root'
        | 'dashboard'
        | 'profile'
        | 'upload'
        | 'explore'
        | 'notifications'
        | 'media'
        | 'settings'
        | 'home'
        | 'social'
        | 'unknown';
    })
  | (BaseRoute & { type: 'design'; page: string })
  | (BaseRoute & { type: 'auth'; action: string; token?: string });

export function Root(props: { environment: ClientEnvironment }) {
  return (
    <ClientEnvironmentProvider value={props.environment}>
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Router />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </ClientEnvironmentProvider>
  );
}

function Loading() {
  return (
    <div style={{ textAlign: 'center', marginTop: '33vh' }}>
      <div className="spinner"></div>
    </div>
  );
}

function Router() {
  const route = useRoute();

  // Only design routes and auth routes don't use the main layout
  if (route.type === 'design' || route.type === 'auth') {
    return renderRouteContent(route);
  }

  // All other routes, including root, use the main layout
  return <MainLayout>{renderRouteContent(route)}</MainLayout>;
}

function renderRouteContent(route: Route) {
  switch (route.type) {
    case 'root':
      return <HomePage />;
    case 'design':
      return <Design page={route.page} />;
    case 'dashboard':
      return <DashboardPage />;
    case 'profile':
      return <ProfilePage />;
    case 'upload':
      return <UploadPage />;
    case 'explore':
      return <ExplorePage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'media':
      return <MediaPage />;
    case 'settings':
      return <SettingsPage />;
    case 'home':
      return <HomePage />;
    case 'auth':
      // Handle auth routes
      switch (route.action) {
        case 'confirm-email':
          return <ConfirmEmail />;
        case 'resend-confirmation':
          return <ResendVerification />;
        default:
          return <div>Auth page not found</div>;
      }
    default:
      return <div>Page not found</div>;
  }
}

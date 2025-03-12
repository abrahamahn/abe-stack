import React, { Suspense, lazy } from 'react';
import { ClientEnvironment, ClientEnvironmentProvider } from '../services/ClientEnvironment';
import { useRoute } from '../services/Router';
import { App } from './App';
import { Design } from './Design';
import { HomePage } from './pages/HomePage';
import { MediaPage } from './pages/MediaPage';
import { SocialPage } from './pages/SocialPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { UploadPage } from './pages/UploadPage';
import { ExplorePage } from './pages/ExplorePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PageContent } from './layouts/PageContent';
import { AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import MainLayout from './layouts/MainLayout';

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
	
	// Only design routes don't use the main layout
	if (route.type === 'design') {
		return renderRouteContent(route);
	}
	
	// All other routes, including root, use the main layout
	return (
		<MainLayout>
			{renderRouteContent(route)}
		</MainLayout>
	);
}

function renderRouteContent(route: any) {
	switch (route.type) {
		case 'root':
			return <App />;
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
		default:
			return <div>Page not found</div>;
	}
}

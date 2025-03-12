import React, { Suspense } from 'react';
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
import { MainLayout } from './layouts/MainLayout';
import { PageContent } from './layouts/PageContent';

export function Root(props: { environment: ClientEnvironment }) {
	return (
		<Suspense fallback={<Loading />}>
			<ClientEnvironmentProvider value={props.environment}>
				<Router />
			</ClientEnvironmentProvider>
		</Suspense>
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
	
	// Special case for the root route which has its own layout
	if (route.type === 'root') return <App />;
	
	// For design pages, we don't use the main layout
	if (route.type === 'design') return <Design page={route.page} />;
	
	// For all other routes, use the MainLayout
	return (
		<MainLayout>
			{renderRouteContent(route)}
		</MainLayout>
	);
}

function renderRouteContent(route: ReturnType<typeof useRoute>) {
	switch (route.type) {
		case 'home':
			return <HomePage />;
		case 'media':
			return <MediaPage />;
		case 'social':
			return <SocialPage />;
		case 'settings':
			return <SettingsPage />;
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
		default:
			return <PageContent title="Page Not Found">Unknown route: {route.url}</PageContent>;
	}
}

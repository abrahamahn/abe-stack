import { Suspense} from 'react';
import { ClientEnvironment, ClientEnvironmentProvider } from '../services/ClientEnvironment';
import { useRoute } from '../services/Router';
import { Design } from './Design';
import { HomePage } from './pages/HomePage';
import { MediaPage } from './pages/MediaPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { UploadPage } from './pages/UploadPage';
import { ExplorePage } from './pages/ExplorePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AuthProvider } from './auth';
import { ThemeProvider } from './theme';
import MainLayout from './layouts/MainLayout';
import { ConfirmEmail } from './auth/ConfirmEmail';
import { ResendVerification } from './auth/ResendVerification';

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
	return (
		<MainLayout>
			{renderRouteContent(route)}
		</MainLayout>
	);
}

function renderRouteContent(route: any) {
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

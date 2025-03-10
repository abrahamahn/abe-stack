import React, { Suspense } from 'react';
import { ClientEnvironment, ClientEnvironmentProvider } from '../services/ClientEnvironment';
import { useRoute } from '../services/Router';
import { App } from './App';
import { Design } from './Design';

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
	
	if (route.type === 'root') return <App />;
	if (route.type === 'design') return <Design page={route.page} />;
	
	return <div>Unknown route: {route.url}</div>;
}

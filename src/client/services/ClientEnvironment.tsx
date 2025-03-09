import React, { createContext, useContext } from 'react';
import type { Router } from './Router';
import type { WebsocketPubsubClient } from './WebsocketPubsubClient';
import type { ClientApi } from './api';

export type ClientConfig = {
	apiUrl: string;
	wsUrl: string;
	production: boolean;
};

export type ClientEnvironment = {
	config: ClientConfig;
	router: Router;
	api: ClientApi;
	pubsub: WebsocketPubsubClient;
};

const ClientEnvironmentContext = createContext<ClientEnvironment | undefined>(undefined);

export function ClientEnvironmentProvider(props: {
	value: ClientEnvironment;
	children: React.ReactNode;
}) {
	return (
		<ClientEnvironmentContext.Provider value={props.value}>
			{props.children}
		</ClientEnvironmentContext.Provider>
	);
}

export function useClientEnvironment(): ClientEnvironment {
	const clientEnvironment = useContext(ClientEnvironmentContext);
	if (!clientEnvironment) throw new Error('Missing ClientEnvironment');
	return clientEnvironment;
}

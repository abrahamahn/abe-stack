import { WebSocketServer } from 'ws';

import { QueueDatabase } from './QueueDatabase';

export type ServerConfig = {
	port: number;
	dbConnectionString: string;
	production: boolean;
	domain: string;
	baseUrl: string;
	corsOrigin: string | string[];
	corsOrigins: string[];
	jwtSecret: string;
	uploadDir: string;
	queuePath: string;
	signatureSecret: Buffer;
	passwordSalt: Buffer;
	dbPath: string;
	db: {
		host: string;
		port: number;
		database: string;
		username: string;
		password: string;
	};
};

export type DatabaseApi = {
	query: <T>(text: string, params?: T[]) => Promise<{ rows: T[] }>;
	getClient: () => Promise<unknown>;
};

export type PubsubApi = {
	broadcast: (key: string, value: unknown) => void;
	subscribe: (key: string, callback: (value: unknown) => void) => () => void;
};

export type ServerEnvironment = {
	config: ServerConfig;
	db: DatabaseApi;
	pubsub: PubsubApi;
	wss?: WebSocketServer;
	queue: QueueDatabase; // Add the queue property
};
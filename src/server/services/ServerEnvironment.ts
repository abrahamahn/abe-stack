import { Pool } from 'pg';
import { WebSocketServer } from 'ws';

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
	query: <T = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
	getClient: () => Promise<any>;
};

export type PubsubApi = {
	broadcast: (key: string, value: any) => void;
	subscribe: (key: string, callback: (value: any) => void) => () => void;
};

export type ServerEnvironment = {
	config: ServerConfig;
	db: DatabaseApi;
	pubsub: PubsubApi;
	wss?: WebSocketServer;
};

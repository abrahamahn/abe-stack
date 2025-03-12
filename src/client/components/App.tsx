import React from 'react';
import { useClientEnvironment } from '../services/ClientEnvironment';
import { PageContent } from './layouts/PageContent';

export function App() {
	const environment = useClientEnvironment();

	return (
		<PageContent
			title="Welcome to ABE Stack"
			description="A modern full-stack boilerplate with PERN stack and multimedia capabilities"
		>
			<div>
				<p>A modern full-stack boilerplate with PERN stack and multimedia capabilities:</p>
				<ul>
					<li><strong>P</strong>ostgreSQL - Powerful open-source relational database</li>
					<li><strong>E</strong>xpress.js - Fast, unopinionated, minimalist web framework for Node.js</li>
					<li><strong>R</strong>eact - A JavaScript library for building user interfaces</li>
					<li><strong>N</strong>ode.js - JavaScript runtime built on Chrome's V8 JavaScript engine</li>
				</ul>
				
				<h3>Features</h3>
				<ul>
					<li>Full-stack TypeScript</li>
					<li>Client-side routing</li>
					<li>WebSocket for real-time updates</li>
					<li>PostgreSQL database integration</li>
					<li>Modern React with hooks</li>
					<li>Vite for fast development</li>
					<li>Multimedia streaming capabilities</li>
					<li>Social media features</li>
					<li>Light/Dark theme support</li>
					<li>Authentication system</li>
				</ul>
			</div>
		</PageContent>
	);
}

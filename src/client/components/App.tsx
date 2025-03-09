import React, { useState } from 'react';
import { useClientEnvironment } from '../services/ClientEnvironment';
import { useRoute } from '../services/Router';
import Button from './ui/Button';

export function App() {
	const environment = useClientEnvironment();
	const route = useRoute();

	return <Layout />;
}

function TopbarLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderBottom: '2px solid var(--transparent1)',
				transition: !props.show ? 'height 0.1s ease-in' : 'height 0.1s ease-out',
				height: props.show ? 64 : 0,
				overflow: 'hidden',
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', padding: '0 16px' }}>
				<h1>ABE Stack</h1>
				<div style={{ marginLeft: 'auto' }}>
					<Button onClick={() => props.setShow(!props.show)}>{props.show ? 'Hide Header' : 'Show Header'}</Button>
				</div>
			</div>
		</div>
	);
}

function BottombarLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderTop: '2px solid var(--transparent1)',
				transition: !props.show ? 'height 0.1s ease-in' : 'height 0.1s ease-out',
				height: props.show ? 64 : 0,
				overflow: 'hidden',
			}}
		>
			<div
				style={{
					padding: 8,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<span>ABE Stack &copy; {new Date().getFullYear()}</span>
				<Button onClick={() => props.setShow(!props.show)}>
					{props.show ? 'Hide Footer' : 'Show Footer'}
				</Button>
			</div>
		</div>
	);
}

function LeftPanelLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderRight: '2px solid var(--transparent1)',
				transition: !props.show ? 'width 0.1s ease-in' : 'width 0.1s ease-out',
				width: props.show ? 256 : 0,
				overflow: 'hidden',
			}}
		>
			<div style={{ padding: '16px' }}>
				<h2>Navigation</h2>
				<ul style={{ listStyle: 'none', padding: 0, marginTop: '16px' }}>
					<li style={{ marginBottom: '8px' }}><a href="#" style={{ color: 'var(--blue)' }}>Home</a></li>
					<li style={{ marginBottom: '8px' }}><a href="#" style={{ color: 'var(--blue)' }}>Media</a></li>
					<li style={{ marginBottom: '8px' }}><a href="#" style={{ color: 'var(--blue)' }}>Social</a></li>
					<li style={{ marginBottom: '8px' }}><a href="#" style={{ color: 'var(--blue)' }}>Settings</a></li>
				</ul>
				<Button onClick={() => props.setShow(!props.show)} style={{ marginTop: '16px' }}>
					{props.show ? 'Hide Sidebar' : 'Show Sidebar'}
				</Button>
			</div>
		</div>
	);
}

function RightPanelLayout(props: { show: boolean; setShow: (show: boolean) => void }) {
	return (
		<div
			style={{
				flexGrow: 0,
				flexShrink: 0,
				borderLeft: '2px solid var(--transparent1)',
				transition: !props.show ? 'width 0.1s ease-in' : 'width 0.1s ease-out',
				width: props.show ? 256 : 0,
				overflow: 'hidden',
			}}
		>
			<div style={{ padding: '16px' }}>
				<h2>Details</h2>
				<div style={{ marginTop: '16px' }}>
					<p>This panel can show details, notifications, or other contextual information.</p>
				</div>
				<Button onClick={() => props.setShow(!props.show)} style={{ marginTop: '16px' }}>
					{props.show ? 'Hide Details' : 'Show Details'}
				</Button>
			</div>
		</div>
	);
}

function Layout() {
	const [showTopbar, setShowTopbar] = useState(true);
	const [showSidebar, setShowSidebar] = useState(true);
	const [showRightPanel, setShowRightPanel] = useState(true);
	const [showBottomBar, setShowBottomBar] = useState(true);

	return (
		<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
			<TopbarLayout show={showTopbar} setShow={setShowTopbar} />

			<div style={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
				<LeftPanelLayout show={showSidebar} setShow={setShowSidebar} />

				<div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}>
					<h2>Welcome to ABE Stack</h2>
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
					</ul>

					<div style={{ marginTop: '16px', display: 'flex', gap: 12 }}>
						<Button onClick={() => setShowTopbar(!showTopbar)}>Toggle Header</Button>
						<Button onClick={() => setShowSidebar(!showSidebar)}>Toggle Sidebar</Button>
						<Button onClick={() => setShowRightPanel(!showRightPanel)}>Toggle Details</Button>
						<Button onClick={() => setShowBottomBar(!showBottomBar)}>Toggle Footer</Button>
					</div>
				</div>

				<RightPanelLayout show={showRightPanel} setShow={setShowRightPanel} />
			</div>

			<BottombarLayout show={showBottomBar} setShow={setShowBottomBar} />
		</div>
	);
}

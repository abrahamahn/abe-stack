import { useEffect, useState } from "react"

export type Route = 
	| { type: 'root'; url: string }
	| { type: 'home'; url: string }
	| { type: 'media'; url: string }
	| { type: 'social'; url: string }
	| { type: 'settings'; url: string }
	| { type: 'dashboard'; url: string }
	| { type: 'profile'; url: string }
	| { type: 'upload'; url: string }
	| { type: 'explore'; url: string }
	| { type: 'notifications'; url: string }
	| { type: 'design'; url: string; page: string }
	| { type: 'unknown'; url: string };

export class Router {
	private listeners: Set<() => void> = new Set()
	private currentRoute: Route

	constructor() {
		this.currentRoute = this.parseUrl(window.location.pathname)

		// Listen for popstate events (back/forward buttons)
		window.addEventListener('popstate', () => {
			this.currentRoute = this.parseUrl(window.location.pathname)
			this.notifyListeners()
		})
	}

	private parseUrl(url: string): Route {
		if (url === '/' || url === '') {
			return { type: 'root', url }
		}
		
		if (url === '/home') {
			return { type: 'home', url }
		}
		
		if (url === '/media') {
			return { type: 'media', url }
		}
		
		if (url === '/social') {
			return { type: 'social', url }
		}
		
		if (url === '/settings') {
			return { type: 'settings', url }
		}
		
		if (url === '/dashboard') {
			return { type: 'dashboard', url }
		}
		
		if (url === '/profile') {
			return { type: 'profile', url }
		}
		
		if (url === '/upload') {
			return { type: 'upload', url }
		}
		
		if (url === '/explore') {
			return { type: 'explore', url }
		}
		
		if (url === '/notifications') {
			return { type: 'notifications', url }
		}
		
		if (url.startsWith('/design/')) {
			const page = url.slice('/design/'.length)
			return { type: 'design', url, page }
		}
		
		return { type: 'unknown', url }
	}

	private notifyListeners() {
		this.listeners.forEach(listener => listener())
	}

	public getCurrentRoute(): Route {
		return this.currentRoute
	}

	public navigate(url: string) {
		window.history.pushState(null, '', url)
		this.currentRoute = this.parseUrl(url)
		this.notifyListeners()
	}

	public subscribe(listener: () => void): () => void {
		this.listeners.add(listener)
		return () => {
			this.listeners.delete(listener)
		}
	}
}

export function useRoute(): Route {
	const [route, setRoute] = useState<Route>(() => {
		// Access the router from the window object during development
		const router = (window as any).router as Router | undefined
		return router ? router.getCurrentRoute() : { type: 'unknown', url: window.location.pathname }
	})

	useEffect(() => {
		const router = (window as any).router as Router
		if (!router) {
			console.error('Router not found on window object')
			return
		}

		const unsubscribe = router.subscribe(() => {
			setRoute(router.getCurrentRoute())
		})

		return unsubscribe
	}, [])

	return route
}

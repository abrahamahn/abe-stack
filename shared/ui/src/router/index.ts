// shared/ui/src/router/index.ts
/**
 * Custom Router
 *
 * A minimal router implementation (~150 lines) that replaces react-router-dom.
 * Uses native browser APIs (window.history, popstate) for navigation.
 *
 * @example
 * // In your app root
 * import { Router, Routes, Route } from '@abe-stack/ui';
 *
 * function App() {
 *   return (
 *     <Router>
 *       <Routes>
 *         <Route path="/" element={<Home />} />
 *         <Route path="/users/:id" element={<UserPage />} />
 *       </Routes>
 *     </Router>
 *   );
 * }
 *
 * // Navigation
 * import { useNavigate, Link } from '@abe-stack/ui';
 *
 * function Nav() {
 *   const navigate = useNavigate();
 *   return (
 *     <>
 *       <Link to="/home">Home</Link>
 *       <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
 *     </>
 *   );
 * }
 */

// Context and providers
export { MemoryRouter, Router, RouterContext, useHistory, useNavigationType } from './context';
export type {
  History,
  MemoryRouterProps,
  NavigateFunction,
  NavigateOptions,
  NavigationType,
  RouterContextValue,
  RouterLocation,
  RouterProps,
  RouterState,
} from './context';

// Hooks
export { useLocation, useNavigate, useSearchParams } from './hooks';

// Components
export { Link, Navigate, Outlet, OutletProvider, Route, Routes, useParams } from './components';
export type {
  LinkProps,
  NavigateProps,
  OutletProviderProps,
  RouteProps,
  RoutesProps,
} from './components';

// Alias for compatibility
export { Router as BrowserRouter } from './context';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@abe-stack/ui/styles/elements.css';
import { App } from './app/root';
import './styles/global.css';

type GetElementById = (elementId: string) => HTMLElement | null;

const documentRef = document as unknown as { getElementById: GetElementById };
const rootElement = documentRef.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

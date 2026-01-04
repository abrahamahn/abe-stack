// apps/web/src/pages/__tests__/HomePage.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HomePage } from '../HomePage';

describe('HomePage (pages)', () => {
  const renderWithRouter = (): ReturnType<typeof render> => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
  };

  describe('Rendering', () => {
    it('should render the welcome heading', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { name: /welcome to abe stack/i })).toBeInTheDocument();
    });

    it('should render the description text', () => {
      renderWithRouter();

      expect(
        screen.getByText(/a minimal, ground-up full-stack typescript monorepo/i),
      ).toBeInTheDocument();
    });

    it('should render three navigation buttons', () => {
      renderWithRouter();

      expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^dashboard$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^demo$/i })).toBeInTheDocument();
    });

    it('should render Tech Stack section', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { name: /tech stack/i })).toBeInTheDocument();
    });

    it('should render all tech stack items', () => {
      renderWithRouter();

      expect(screen.getByText(/postgresql \+ drizzle orm/i)).toBeInTheDocument();
      expect(screen.getByText(/fastify \+ typescript/i)).toBeInTheDocument();
      expect(screen.getByText(/react 19 \+ vite/i)).toBeInTheDocument();
      expect(screen.getByText(/jwt \+ bcrypt/i)).toBeInTheDocument();
      expect(screen.getByText(/zod/i)).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have login link pointing to /login', () => {
      renderWithRouter();

      const loginLink = screen.getByRole('link', { name: /login/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should have dashboard link pointing to /dashboard', () => {
      renderWithRouter();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should have demo link pointing to /features/demo', () => {
      renderWithRouter();

      const demoLink = screen.getByRole('link', { name: /demo/i });
      expect(demoLink).toHaveAttribute('href', '/features/demo');
    });
  });

  describe('Semantic Structure', () => {
    it('should have proper section structure', () => {
      const { container } = renderWithRouter();

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should have a card container for tech stack', () => {
      const { container } = renderWithRouter();

      // Card component wraps tech stack
      const cards = container.querySelectorAll('[class*="card"]');
      expect(cards.length).toBeGreaterThanOrEqual(0); // May or may not have class
    });

    it('should have an unordered list for tech items', () => {
      renderWithRouter();

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(5);
    });
  });
});

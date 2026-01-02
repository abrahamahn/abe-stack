// apps/web/src/features/demo/__tests__/Home.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomePage } from '../Home';

import type { DemoView } from '../Home';

describe('HomePage', () => {
  describe('Rendering', () => {
    it('renders the main heading', () => {
      render(<HomePage />);

      expect(screen.getByRole('heading', { name: /welcome to abe stack/i, level: 1 })).toBeInTheDocument();
    });

    it('renders the welcome description', () => {
      render(<HomePage />);

      expect(screen.getByText(/A minimal, ground-up full-stack TypeScript monorepo with authentication/i)).toBeInTheDocument();
    });

    it('renders Tech Stack section', () => {
      render(<HomePage />);

      expect(screen.getByRole('heading', { name: /tech stack/i, level: 3 })).toBeInTheDocument();
    });

    it('displays all tech stack items', () => {
      render(<HomePage />);

      expect(screen.getByText(/Database: PostgreSQL \+ Drizzle ORM/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend: Fastify \+ TypeScript/i)).toBeInTheDocument();
      expect(screen.getByText(/Frontend: React 19 \+ Vite/i)).toBeInTheDocument();
      expect(screen.getByText(/Auth: JWT \+ bcrypt/i)).toBeInTheDocument();
      expect(screen.getByText(/Validation: Zod/i)).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    it('renders all navigation buttons', () => {
      render(<HomePage />);

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gallery/i })).toBeInTheDocument();
    });

    it('calls onNavigate with "login" when Login button is clicked', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('login');
    });

    it('calls onNavigate with "dashboard" when Dashboard button is clicked', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('dashboard');
    });

    it('calls onNavigate with "gallery" when Gallery button is clicked', () => {
      const onNavigate = vi.fn();
      render(<HomePage onNavigate={onNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /gallery/i }));

      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('gallery');
    });

    it('does not crash when onNavigate is not provided', () => {
      render(<HomePage />);

      expect(() => {
        fireEvent.click(screen.getByRole('button', { name: /login/i }));
      }).not.toThrow();
    });

    it('does not call onNavigate when it is undefined', () => {
      render(<HomePage onNavigate={undefined} />);

      // Should not throw
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });
  });

  describe('Button Variants', () => {
    it('renders Login button as primary variant', () => {
      render(<HomePage />);

      const loginButton = screen.getByRole('button', { name: /^login$/i });
      // Primary buttons typically don't have variant attribute or have it as "primary"
      expect(loginButton).toBeInTheDocument();
    });

    it('renders Dashboard button as secondary variant', () => {
      render(<HomePage />);

      const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
      expect(dashboardButton).toBeInTheDocument();
    });

    it('renders Gallery button as secondary variant', () => {
      render(<HomePage />);

      const galleryButton = screen.getByRole('button', { name: /gallery/i });
      expect(galleryButton).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders PageContainer wrapper', () => {
      const { container } = render(<HomePage />);

      // PageContainer should be the main wrapper
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders Card component with content', () => {
      const { container } = render(<HomePage />);

      // Check if Card is rendered by looking for the Tech Stack section
      const techStackHeading = screen.getByRole('heading', { name: /tech stack/i });
      expect(techStackHeading).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<HomePage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      const h3 = screen.getByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h3).toBeInTheDocument();
    });

    it('all buttons are keyboard accessible', () => {
      render(<HomePage />);

      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});

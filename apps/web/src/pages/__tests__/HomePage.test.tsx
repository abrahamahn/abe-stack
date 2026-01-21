// apps/web/src/pages/__tests__/HomePage.test.tsx
import { HomePage } from '@pages/HomePage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock all markdown imports
// Root README
vi.mock('../../../../../README.md?raw', () => ({
  default: `# ABE Stack

**A production-ready TypeScript monorepo.**

## What You Get

- **Auth that works** — JWT with refresh rotation
- **5,300+ tests** — Vitest unit tests

\`\`\`bash
pnpm install
pnpm dev
\`\`\`
`,
}));

// Apps READMEs
vi.mock('../../../../../apps/web/README.md?raw', () => ({
  default: `# Web App\n\nWeb application documentation.`,
}));

vi.mock('../../../../../apps/desktop/README.md?raw', () => ({
  default: `# Desktop App\n\nDesktop application documentation.`,
}));

// Package READMEs
vi.mock('../../../../../packages/core/README.md?raw', () => ({
  default: `# @abe-stack/core\n\nCore package documentation.`,
}));

vi.mock('../../../../../packages/sdk/README.md?raw', () => ({
  default: `# @abe-stack/sdk\n\nSDK package documentation.`,
}));

vi.mock('../../../../../packages/ui/docs/README.md?raw', () => ({
  default: `# @abe-stack/ui\n\nUI package documentation.`,
}));

// Dev docs
vi.mock('../../../../../docs/dev/api-test-plan.md?raw', () => ({
  default: `# API Test Plan\n\nAPI test plan documentation.`,
}));

vi.mock('../../../../../docs/dev/architecture.md?raw', () => ({
  default: `# Architecture\n\nArchitecture documentation.`,
}));

vi.mock('../../../../../docs/dev/config-setup.md?raw', () => ({
  default: `# Config Setup\n\nConfiguration setup documentation.`,
}));

vi.mock('../../../../../docs/dev/dev-environment.md?raw', () => ({
  default: `# Dev Environment\n\nDevelopment environment setup.`,
}));

vi.mock('../../../../../docs/dev/legacy.md?raw', () => ({
  default: `# Legacy\n\nLegacy documentation.`,
}));

vi.mock('../../../../../docs/dev/performance.md?raw', () => ({
  default: `# Performance\n\nPerformance documentation.`,
}));

vi.mock('../../../../../docs/dev/principles.md?raw', () => ({
  default: `# Principles\n\nDesign principles.`,
}));

vi.mock('../../../../../docs/dev/security.md?raw', () => ({
  default: `# Security\n\nSecurity documentation.`,
}));

vi.mock('../../../../../docs/dev/sync-scripts.md?raw', () => ({
  default: `# Sync Scripts\n\nSync scripts documentation.`,
}));

vi.mock('../../../../../docs/dev/testing.md?raw', () => ({
  default: `# Testing\n\nTesting documentation.`,
}));

// Weekly logs
vi.mock('../../../../../docs/log/2026-W01.md?raw', () => ({
  default: `# Week 01\n\nWeekly log.`,
}));

vi.mock('../../../../../docs/log/2026-W02.md?raw', () => ({
  default: `# Week 02\n\nWeekly log.`,
}));

vi.mock('../../../../../docs/log/2026-W03.md?raw', () => ({
  default: `# Week 03\n\nWeekly log.`,
}));

vi.mock('../../../../../docs/log/2026-W04.md?raw', () => ({
  default: `# Week 04\n\nWeekly log.`,
}));

describe('HomePage', () => {
  const renderWithRouter = (): ReturnType<typeof render> => {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
  };

  describe('Layout', () => {
    it('should render the main heading', async () => {
      renderWithRouter();

      // Wait for async content to load, then check headings
      await waitFor(() => {
        // Use getAllByRole since README content also has an h1 "ABE Stack"
        const headings = screen.getAllByRole('heading', { name: /abe stack/i, level: 1 });
        expect(headings.length).toBeGreaterThanOrEqual(1);
        // First one is the page heading
        expect(headings[0]).toHaveClass('heading');
      });
    });

    it('should render the tagline', () => {
      renderWithRouter();

      // The tagline in the component includes "for web, desktop, and backend"
      expect(
        screen.getByText(/production-ready typescript monorepo for web, desktop, and backend/i),
      ).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      renderWithRouter();

      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /demo/i })).toBeInTheDocument();
    });

    it('should have correct navigation links', () => {
      renderWithRouter();

      expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard',
      );
      expect(screen.getByRole('link', { name: /demo/i })).toHaveAttribute('href', '/demo');
    });
  });

  describe('Doc Index', () => {
    it('should render category labels', () => {
      renderWithRouter();

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Apps')).toBeInTheDocument();
      expect(screen.getByText('Packages')).toBeInTheDocument();
      expect(screen.getByText('Dev Docs')).toBeInTheDocument();
      expect(screen.getByText('Changelog')).toBeInTheDocument();
    });

    it('should render doc navigation buttons', () => {
      renderWithRouter();

      expect(screen.getByRole('button', { name: 'README' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Core' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'UI' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SDK' })).toBeInTheDocument();
    });

    it('should render apps navigation buttons', () => {
      renderWithRouter();

      expect(screen.getByRole('button', { name: 'Web' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Desktop' })).toBeInTheDocument();
    });

    it('should render changelog navigation buttons', () => {
      renderWithRouter();

      expect(screen.getByRole('button', { name: 'Week 01' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Week 02' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Week 03' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Week 04' })).toBeInTheDocument();
    });

    it('should switch content when clicking a different doc', async () => {
      renderWithRouter();

      // Wait for initial README content to load
      await waitFor(() => {
        expect(screen.getByText(/auth that works/i)).toBeInTheDocument();
      });

      // Click on core package
      fireEvent.click(screen.getByRole('button', { name: 'Core' }));

      // Wait for new content to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /@abe-stack\/core/i })).toBeInTheDocument();
        expect(screen.getByText(/core package documentation/i)).toBeInTheDocument();
      });
    });

    it('should switch to changelog', async () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: 'Week 04' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /week 04/i })).toBeInTheDocument();
        expect(screen.getByText(/weekly log/i)).toBeInTheDocument();
      });
    });

    it('should switch to dev docs', async () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: 'Architecture' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /architecture/i })).toBeInTheDocument();
        expect(screen.getByText(/architecture documentation/i)).toBeInTheDocument();
      });
    });
  });

  describe('README Content', () => {
    it('should render markdown content', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /what you get/i })).toBeInTheDocument();
      });
    });

    it('should render code blocks', async () => {
      const { container } = renderWithRouter();

      await waitFor(() => {
        const codeBlocks = container.querySelectorAll('pre');
        expect(codeBlocks.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should contain bash commands in code blocks', async () => {
      const { container } = renderWithRouter();

      await waitFor(() => {
        const codeContent = container.textContent ?? '';
        expect(codeContent).toContain('pnpm install');
        expect(codeContent).toContain('pnpm dev');
      });
    });
  });

  describe('Styling', () => {
    it('should render content in markdown-content container', async () => {
      const { container } = renderWithRouter();

      await waitFor(() => {
        const markdownContentElement = container.querySelector('.markdown-content');
        expect(markdownContentElement).toBeInTheDocument();
      });
    });
  });
});

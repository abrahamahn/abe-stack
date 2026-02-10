// src/apps/web/src/app/layouts/AppSidePeekPage.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppSidePeekPage } from './AppSidePeekPage';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('@ui-library/components', () => {
  const sidePeekUILibraryContent = () => <div>SidePeek content</div>;

  return {
    SidePeekUILibraryContent: sidePeekUILibraryContent,
  };
});

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AppSidePeekPage', () => {
  it('renders page and navigates back to ui-library', () => {
    render(<AppSidePeekPage />);

    expect(screen.getByRole('heading', { name: 'Side Peek UI Library' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to UI Library' }));
    expect(mockNavigate).toHaveBeenCalledWith('/ui-library');
  });
});

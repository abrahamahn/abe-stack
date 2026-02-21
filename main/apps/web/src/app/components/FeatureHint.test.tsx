// main/apps/web/src/app/components/FeatureHint.test.tsx
import { Button } from '@bslt/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FeatureHint } from './FeatureHint';

const TEST_KEY = 'test-feature';

describe('FeatureHint', () => {
  beforeEach(() => {
    localStorage.removeItem(`abe:hint:${TEST_KEY}`);
  });

  afterEach(() => {
    localStorage.removeItem(`abe:hint:${TEST_KEY}`);
  });

  it('renders children and callout when not dismissed', () => {
    render(
      <FeatureHint featureKey={TEST_KEY} title="Tip" description="Helpful info">
        <Button>Target</Button>
      </FeatureHint>,
    );
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(screen.getByText('Helpful info')).toBeInTheDocument();
    expect(screen.getByText('Got it')).toBeInTheDocument();
  });

  it('renders only children when already dismissed', () => {
    localStorage.setItem(`abe:hint:${TEST_KEY}`, 'true');
    render(
      <FeatureHint featureKey={TEST_KEY} title="Tip" description="Helpful info">
        <Button>Target</Button>
      </FeatureHint>,
    );
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.queryByText('Tip')).not.toBeInTheDocument();
  });

  it('dismisses on "Got it" click and persists to localStorage', async () => {
    render(
      <FeatureHint featureKey={TEST_KEY} title="Tip" description="Helpful info">
        <Button>Target</Button>
      </FeatureHint>,
    );
    await userEvent.click(screen.getByText('Got it'));
    expect(screen.queryByText('Tip')).not.toBeInTheDocument();
    // localStorage write is deferred via queueMicrotask
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    expect(localStorage.getItem(`abe:hint:${TEST_KEY}`)).toBe('true');
  });

  it('dismisses on Escape key', async () => {
    render(
      <FeatureHint featureKey={TEST_KEY} title="Tip" description="Helpful info">
        <Button>Target</Button>
      </FeatureHint>,
    );
    expect(screen.getByText('Tip')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Tip')).not.toBeInTheDocument();
  });

  it('applies data-placement attribute', () => {
    const { container } = render(
      <FeatureHint featureKey={TEST_KEY} title="Tip" description="Info" placement="right">
        <Button>Target</Button>
      </FeatureHint>,
    );
    const wrapper = container.querySelector('.feature-hint');
    expect(wrapper?.getAttribute('data-placement')).toBe('right');
  });
});

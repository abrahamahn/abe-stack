// packages/ui/src/elements/__tests__/Image.test.tsx
/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Image } from '../Image';

// Helper to trigger image load event
const triggerLoad = (img: HTMLImageElement) => {
  act(() => {
    const event = new Event('load', { bubbles: true });
    img.dispatchEvent(event);
  });
};

// Helper to trigger image error event
const triggerError = (img: HTMLImageElement) => {
  act(() => {
    const event = new Event('error', { bubbles: true });
    img.dispatchEvent(event);
  });
};

describe('Image', () => {
  describe('happy path', () => {
    it('renders image with src and alt', () => {
      render(<Image src="/test.jpg" alt="Test Image" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', '/test.jpg');
      expect(img).toHaveAttribute('alt', 'Test Image');
    });

    it('defaults to lazy loading', () => {
      render(<Image src="/test.jpg" alt="Test" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('supports eager loading', () => {
      render(<Image src="/test.jpg" alt="Test" loading="eager" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('loading', 'eager');
    });

    it('starts in loading state with fallback', () => {
      render(
        <Image
          src="/test.jpg"
          alt="Test"
          fallback={<div data-testid="fallback">Loading...</div>}
        />,
      );

      expect(screen.getByTestId('fallback')).toBeInTheDocument();

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveStyle({ display: 'none' });
    });

    it('shows image after load and hides fallback', () => {
      const onLoad = vi.fn();
      render(
        <Image
          src="/test.jpg"
          alt="Test"
          fallback={<div data-testid="fallback">Loading...</div>}
          onLoad={onLoad}
        />,
      );

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerLoad(img);

      expect(onLoad).toHaveBeenCalled();
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
      expect(img).toHaveStyle({ display: 'block' });
    });

    it('shows fallback on error', () => {
      const onError = vi.fn();
      render(
        <Image
          src="/invalid.jpg"
          alt="Test"
          fallback={<div data-testid="fallback">Error</div>}
          onError={onError}
        />,
      );

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerError(img);

      expect(onError).toHaveBeenCalled();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(img).toHaveStyle({ display: 'none' });
    });

    it('applies aspectRatio to wrapper', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" aspectRatio="16/9" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '16/9' });
    });

    it('defaults aspectRatio to auto', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: 'auto' });
    });

    it('applies objectFit to img', () => {
      render(<Image src="/test.jpg" alt="Test" objectFit="contain" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveStyle({ objectFit: 'contain' });
    });

    it('defaults objectFit to cover', () => {
      render(<Image src="/test.jpg" alt="Test" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveStyle({ objectFit: 'cover' });
    });

    it('forwards className to wrapper', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('image-container');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('forwards ref to img element', () => {
      const ref = { current: null };
      render(<Image ref={ref} src="/test.jpg" alt="Test" />);

      expect(ref.current).toBeInstanceOf(HTMLImageElement);
      expect(ref.current).toHaveAttribute('src', '/test.jpg');
    });

    it('forwards style to wrapper', () => {
      const { container } = render(
        <Image src="/test.jpg" alt="Test" style={{ border: '1px solid red' }} />,
      );

      const wrapper = container.querySelector('.image-container') as HTMLElement;
      expect(wrapper).toBeInTheDocument();

      // Check if border style is in the computed style
      const computedStyle = window.getComputedStyle(wrapper);
      const hasAnyBorder = computedStyle.border || computedStyle.borderTop || wrapper.style.border;

      // If style forwarding works, at least one should have the border
      expect(hasAnyBorder || wrapper.getAttribute('style')?.includes('border')).toBeTruthy();
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without fallback', () => {
      expect(() => {
        render(<Image src="/test.jpg" alt="Test" />);
      }).not.toThrow();

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toBeInTheDocument();
    });

    it('handles null fallback gracefully', () => {
      render(<Image src="/test.jpg" alt="Test" fallback={null} />);

      // Should not show fallback
      const container = document.querySelector('.image-fallback');
      expect(container).not.toBeInTheDocument();
    });

    it('handles undefined fallback', () => {
      render(<Image src="/test.jpg" alt="Test" fallback={undefined} />);

      const container = document.querySelector('.image-fallback');
      expect(container).not.toBeInTheDocument();
    });

    it('handles empty string src', () => {
      // Suppress expected React warning about empty src
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Image src="" alt="Test" />);
      }).not.toThrow();

      const img = screen.getByRole('img', { hidden: true });
      // React/browser normalizes empty string to null for src attribute
      expect(img.getAttribute('src')).toBeNull();

      consoleSpy.mockRestore();
    });

    it('handles very long src URL', () => {
      const longUrl = `https://example.com/${'a'.repeat(1000)}.jpg`;

      render(<Image src={longUrl} alt="Test" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', longUrl);
    });

    it('handles null onLoad gracefully', () => {
      // @ts-expect-error Testing invalid prop
      render(<Image src="/test.jpg" alt="Test" onLoad={null} />);

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

      expect(() => {
        triggerLoad(img);
      }).not.toThrow();
    });

    it('handles null onError gracefully', () => {
      // @ts-expect-error Testing invalid prop
      render(<Image src="/test.jpg" alt="Test" onError={null} />);

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

      expect(() => {
        triggerError(img);
      }).not.toThrow();
    });
  });

  describe('edge cases - aspectRatio values', () => {
    it('handles numeric aspectRatio', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" aspectRatio="1.5" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '1.5' });
    });

    it('handles aspectRatio with spaces', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" aspectRatio=" 16 / 9 " />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: ' 16 / 9 ' });
    });

    it('handles square aspectRatio', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" aspectRatio="1/1" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '1/1' });
    });

    it('handles unusual aspectRatio', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" aspectRatio="21/9" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ aspectRatio: '21/9' });
    });
  });

  describe('edge cases - loading state transitions', () => {
    it('handles src change after successful load', () => {
      const { rerender } = render(<Image src="/first.jpg" alt="Test" />);

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerLoad(img);

      expect(img).toHaveStyle({ display: 'block' });

      // Change src - should start loading again
      rerender(
        <Image
          src="/second.jpg"
          alt="Test"
          fallback={<div data-testid="fallback">Loading...</div>}
        />,
      );

      // Should show fallback again for new image
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('handles load after error', () => {
      const { rerender } = render(
        <Image src="/bad.jpg" alt="Test" fallback={<div data-testid="fallback">Error</div>} />,
      );

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerError(img);

      expect(screen.getByTestId('fallback')).toBeInTheDocument();

      // Change to good src
      rerender(
        <Image
          src="/good.jpg"
          alt="Test"
          fallback={<div data-testid="fallback">Loading...</div>}
        />,
      );

      // Should show loading fallback
      expect(screen.getByTestId('fallback')).toBeInTheDocument();

      const newImg = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerLoad(newImg);

      // Should hide fallback after successful load
      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });

    it('handles rapid src changes', () => {
      const { rerender } = render(<Image src="/img1.jpg" alt="Test" />);

      // Rapidly change src 10 times
      for (let i = 2; i <= 10; i++) {
        rerender(<Image src={`/img${i}.jpg`} alt="Test" />);
      }

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', '/img10.jpg');
    });

    it('handles error then load on same render', () => {
      const onLoad = vi.fn();
      const onError = vi.fn();

      render(<Image src="/test.jpg" alt="Test" onLoad={onLoad} onError={onError} />);

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

      // Trigger error first
      triggerError(img);
      expect(onError).toHaveBeenCalled();

      // Then trigger load (shouldn't happen in real life, but test it)
      triggerLoad(img);
      expect(onLoad).toHaveBeenCalled();
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount while loading', () => {
      const { unmount } = render(
        <Image
          src="/test.jpg"
          alt="Test"
          fallback={<div data-testid="fallback">Loading...</div>}
        />,
      );

      expect(screen.getByTestId('fallback')).toBeInTheDocument();

      unmount();

      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });

    it('cleans up properly on unmount after load', () => {
      const { unmount } = render(<Image src="/test.jpg" alt="Test" />);

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerLoad(img);

      expect(img).toHaveStyle({ display: 'block' });

      unmount();

      expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
    });

    it('cleans up properly on unmount after error', () => {
      const { unmount } = render(
        <Image src="/test.jpg" alt="Test" fallback={<div data-testid="fallback">Error</div>} />,
      );

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;
      triggerError(img);

      expect(screen.getByTestId('fallback')).toBeInTheDocument();

      unmount();

      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles alt text with special characters', () => {
      const altText = `Photo of "Cat & Dog" <special chars>`;
      render(<Image src="/test.jpg" alt={altText} />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('alt', altText);
    });

    it('handles src with query params and hash', () => {
      const src = '/image.jpg?width=500&height=300#fragment';
      render(<Image src={src} alt="Test" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', src);
    });

    it('handles src with special URL characters', () => {
      const src = '/images/file%20with%20spaces.jpg?param=value&other=123';
      render(<Image src={src} alt="Test" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', src);
    });

    it('handles className with special characters', () => {
      const { container } = render(
        <Image src="/test.jpg" alt="Test" className="test-class__with--special___chars" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('test-class__with--special___chars');
    });

    it('handles empty className', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" className="" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('image-container');
      expect(wrapper.className).toBe('image-container');
    });
  });

  describe('accessibility', () => {
    it('requires alt attribute', () => {
      render(<Image src="/test.jpg" alt="Descriptive alt text" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('alt', 'Descriptive alt text');
    });

    it('supports empty alt for decorative images', () => {
      const { container } = render(<Image src="/decorative.jpg" alt="" />);

      // Decorative images (alt="") don't have 'img' role, use querySelector
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', '');
    });

    it('wrapper has proper semantic structure', () => {
      const { container } = render(<Image src="/test.jpg" alt="Test" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.tagName).toBe('DIV');
      expect(wrapper).toHaveClass('image-container');
    });

    it('image is accessible via role', () => {
      render(<Image src="/test.jpg" alt="Test" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toBeInTheDocument();
    });

    it('forwards ARIA attributes', () => {
      render(
        <Image
          src="/test.jpg"
          alt="Test"
          aria-label="Custom label"
          aria-describedby="description"
        />,
      );

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('aria-label', 'Custom label');
      expect(img).toHaveAttribute('aria-describedby', 'description');
    });
  });

  describe('real-world chaos - aggressive bug hunting', () => {
    it('survives spamming load events', () => {
      const onLoad = vi.fn();
      render(<Image src="/test.jpg" alt="Test" onLoad={onLoad} />);

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

      // Spam load 20 times
      for (let i = 0; i < 20; i++) {
        triggerLoad(img);
      }

      expect(onLoad).toHaveBeenCalledTimes(20);
      expect(img).toHaveStyle({ display: 'block' });
    });

    it('survives spamming error events', () => {
      const onError = vi.fn();
      render(
        <Image
          src="/test.jpg"
          alt="Test"
          onError={onError}
          fallback={<div data-testid="fallback">Error</div>}
        />,
      );

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

      // Spam error 20 times
      for (let i = 0; i < 20; i++) {
        triggerError(img);
      }

      expect(onError).toHaveBeenCalledTimes(20);
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('handles alternating load/error events', () => {
      const onLoad = vi.fn();
      const onError = vi.fn();
      render(
        <Image
          src="/test.jpg"
          alt="Test"
          onLoad={onLoad}
          onError={onError}
          fallback={<div data-testid="fallback">Fallback</div>}
        />,
      );

      const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement;

      // Alternate between load and error
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          triggerLoad(img);
        } else {
          triggerError(img);
        }
      }

      expect(onLoad).toHaveBeenCalledTimes(5);
      expect(onError).toHaveBeenCalledTimes(5);
    });

    it('handles fallback that changes during loading', () => {
      const { rerender } = render(
        <Image
          src="/test.jpg"
          alt="Test"
          fallback={<div data-testid="fallback-1">Loading 1</div>}
        />,
      );

      expect(screen.getByTestId('fallback-1')).toBeInTheDocument();

      // Change fallback while still loading
      rerender(
        <Image
          src="/test.jpg"
          alt="Test"
          fallback={<div data-testid="fallback-2">Loading 2</div>}
        />,
      );

      expect(screen.queryByTestId('fallback-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback-2')).toBeInTheDocument();
    });

    it('handles data URI images', () => {
      const dataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      render(<Image src={dataUri} alt="1x1 pixel" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', dataUri);
    });

    it('handles blob URLs', () => {
      const blobUrl = 'blob:http://localhost:3000/e9c9e9c9-e9c9-e9c9-e9c9-e9c9e9c9e9c9';

      render(<Image src={blobUrl} alt="Blob image" />);

      const img = screen.getByRole('img', { hidden: true });
      expect(img).toHaveAttribute('src', blobUrl);
    });
  });
});

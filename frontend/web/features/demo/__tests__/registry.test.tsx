/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { componentRegistry, getAllCategories, getComponentsByCategory } from '../registry';

describe('Component Registry', () => {
  describe('Registry Structure', () => {
    it('exports a valid component registry object', () => {
      expect(componentRegistry).toBeDefined();
      expect(typeof componentRegistry).toBe('object');
    });

    it('has components with required properties', () => {
      Object.values(componentRegistry).forEach((component) => {
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('category');
        expect(component).toHaveProperty('description');
        expect(component).toHaveProperty('variants');
        expect(Array.isArray(component.variants)).toBe(true);
      });
    });

    it('has variants with required properties', () => {
      Object.values(componentRegistry).forEach((component) => {
        component.variants.forEach((variant) => {
          expect(variant).toHaveProperty('name');
          expect(variant).toHaveProperty('description');
          expect(variant).toHaveProperty('code');
          expect(variant).toHaveProperty('render');
          expect(typeof variant.render).toBe('function');
        });
      });
    });
  });

  describe('getAllCategories', () => {
    it('returns an array of categories', () => {
      const categories = getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('returns unique categories', () => {
      const categories = getAllCategories();
      const uniqueCategories = [...new Set(categories)];
      expect(categories).toEqual(uniqueCategories);
    });

    it('includes expected categories', () => {
      const categories = getAllCategories();
      expect(categories).toContain('components');
      expect(categories).toContain('elements');
      expect(categories).toContain('layouts');
    });
  });

  describe('getComponentsByCategory', () => {
    it('returns components for a valid category', () => {
      const components = getComponentsByCategory('components');
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
      components.forEach((component) => {
        expect(component.category).toBe('components');
      });
    });

    it('returns empty array for invalid category', () => {
      const components = getComponentsByCategory('nonexistent');
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBe(0);
    });

    it('returns all elements', () => {
      const elements = getComponentsByCategory('elements');
      expect(elements.length).toBeGreaterThan(0);
      elements.forEach((component) => {
        expect(component.category).toBe('elements');
      });
    });

    it('returns all layouts', () => {
      const layouts = getComponentsByCategory('layouts');
      expect(layouts.length).toBeGreaterThan(0);
      layouts.forEach((component) => {
        expect(component.category).toBe('layouts');
      });
    });
  });

  describe('Component Rendering', () => {
    it('renders Alert component variants', () => {
      const alertComponent = componentRegistry.alert;
      expect(alertComponent).toBeDefined();
      if (!alertComponent) return;

      alertComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Avatar component variants', () => {
      const avatarComponent = componentRegistry.avatar;
      expect(avatarComponent).toBeDefined();
      if (!avatarComponent) return;

      avatarComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Button component variants', () => {
      const buttonComponent = componentRegistry.button;
      expect(buttonComponent).toBeDefined();
      if (!buttonComponent) return;

      buttonComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Card component variants', () => {
      const cardComponent = componentRegistry.card;
      expect(cardComponent).toBeDefined();
      if (!cardComponent) return;

      cardComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Pagination component variants', () => {
      const paginationComponent = componentRegistry.pagination;
      expect(paginationComponent).toBeDefined();
      if (!paginationComponent) return;

      paginationComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Text component variants', () => {
      const textComponent = componentRegistry.text;
      expect(textComponent).toBeDefined();
      if (!textComponent) return;

      textComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Toast component variants', () => {
      const toastComponent = componentRegistry.toast;
      expect(toastComponent).toBeDefined();
      if (!toastComponent) return;

      toastComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Modal component variants', () => {
      const modalComponent = componentRegistry.modal;
      expect(modalComponent).toBeDefined();
      if (!modalComponent) return;

      modalComponent.variants.forEach((variant) => {
        const VariantComponent = variant.render;
        const { container } = render(<VariantComponent />);
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Dialog component variants', () => {
      const dialogComponent = componentRegistry.dialog;
      expect(dialogComponent).toBeDefined();
      if (!dialogComponent) return;

      dialogComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('renders Overlay component variants', () => {
      const overlayComponent = componentRegistry.overlay;
      expect(overlayComponent).toBeDefined();
      if (!overlayComponent) return;

      overlayComponent.variants.forEach((variant) => {
        const VariantComponent = variant.render;
        const { container } = render(<VariantComponent />);
        expect(container).toBeInTheDocument();
      });
    });

    it('renders RadioGroup component variants', () => {
      const radioGroupComponent = componentRegistry.radioGroup;
      expect(radioGroupComponent).toBeDefined();
      if (!radioGroupComponent) return;

      radioGroupComponent.variants.forEach((variant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Fixed Type Errors', () => {
    it('Alert uses tone prop not variant', () => {
      const alertComponent = componentRegistry.alert;
      if (!alertComponent) return;

      alertComponent.variants.forEach((variant) => {
        expect(variant.code).not.toContain('variant="');
        if (variant.code.includes('tone=')) {
          expect(variant.code).toMatch(/tone="(info|success|warning|danger)"/);
        }
      });
    });

    it('Avatar uses fallback prop not name', () => {
      const avatarComponent = componentRegistry.avatar;
      if (!avatarComponent) return;

      avatarComponent.variants.forEach((variant) => {
        expect(variant.code).not.toContain('name="');
        if (variant.code.includes('fallback')) {
          expect(variant.code).toContain('fallback=');
        }
      });
    });

    it('Pagination uses value prop not currentPage', () => {
      const paginationComponent = componentRegistry.pagination;
      if (!paginationComponent || !paginationComponent.variants[0]) return;

      expect(paginationComponent.variants[0].code).toContain('value={');
      expect(paginationComponent.variants[0].code).not.toContain('currentPage');
    });

    it('Overlay uses open prop not visible', () => {
      const overlayComponent = componentRegistry.overlay;
      if (!overlayComponent || !overlayComponent.variants[0]) return;

      expect(overlayComponent.variants[0].code).toContain('open={');
      expect(overlayComponent.variants[0].code).not.toContain('visible');
    });

    it('Toast uses message object prop', () => {
      const toastComponent = componentRegistry.toast;
      if (!toastComponent) return;

      toastComponent.variants.forEach((variant) => {
        expect(variant.code).toContain('message={{');
        expect(variant.code).not.toContain('variant="');
      });
    });

    it('Modal uses compound component pattern', () => {
      const modalComponent = componentRegistry.modal;
      if (!modalComponent || !modalComponent.variants[0]) return;

      expect(modalComponent.variants[0].code).toContain('Modal.Root');
      expect(modalComponent.variants[0].code).not.toContain('<Modal ');
    });

    it('Dialog uses compound component pattern', () => {
      const dialogComponent = componentRegistry.dialog;
      if (!dialogComponent || !dialogComponent.variants[0]) return;

      expect(dialogComponent.variants[0].code).toContain('Dialog.Root');
      expect(dialogComponent.variants[0].code).toContain('Dialog.Trigger');
      expect(dialogComponent.variants[0].code).toContain('Dialog.Content');
    });

    it('RadioGroup uses children not options', () => {
      const radioGroupComponent = componentRegistry.radioGroup;
      if (!radioGroupComponent || !radioGroupComponent.variants[0]) return;

      expect(radioGroupComponent.variants[0].code).not.toContain('options={');
    });

    it('Text does not use brand tone', () => {
      const textComponent = componentRegistry.text;
      if (!textComponent) return;

      textComponent.variants.forEach((variant) => {
        expect(variant.code).not.toContain('tone="brand"');
      });
    });
  });
});

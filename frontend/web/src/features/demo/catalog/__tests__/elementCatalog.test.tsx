// apps/web/src/features/demo/catalog/__tests__/elementCatalog.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { elementCatalog } from '../elementCatalog';

import type { ComponentDemo, ComponentVariant } from '@demo/types';

describe('elementCatalog', () => {
  describe('Catalog Structure', () => {
    it('exports a valid element catalog object', () => {
      expect(elementCatalog).toBeDefined();
      expect(typeof elementCatalog).toBe('object');
    });

    it('has components with required properties', () => {
      Object.values(elementCatalog).forEach((component: ComponentDemo) => {
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('category');
        expect(component).toHaveProperty('description');
        expect(component).toHaveProperty('variants');
        expect(Array.isArray(component.variants)).toBe(true);
      });
    });

    it('has variants with required properties', () => {
      Object.values(elementCatalog).forEach((component: ComponentDemo) => {
        component.variants.forEach((variant: ComponentVariant) => {
          expect(variant).toHaveProperty('name');
          expect(variant).toHaveProperty('description');
          expect(variant).toHaveProperty('code');
          expect(variant).toHaveProperty('render');
          expect(typeof variant.render).toBe('function');
        });
      });
    });

    it('all components have category "elements"', () => {
      Object.values(elementCatalog).forEach((component: ComponentDemo) => {
        expect(component.category).toBe('elements');
      });
    });
  });

  describe('Alert component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.alert).toBeDefined();
    });

    it('renders all variants', () => {
      const alert = elementCatalog.alert;
      if (!alert) return;

      alert.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses tone prop not variant', () => {
      const alert = elementCatalog.alert;
      if (!alert) return;

      alert.variants.forEach((variant: ComponentVariant) => {
        expect(variant.code).not.toContain('variant="');
        if (variant.code.includes('tone=')) {
          expect(variant.code).toMatch(/tone="(info|success|warning|danger)"/);
        }
      });
    });
  });

  describe('Avatar component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.avatar).toBeDefined();
    });

    it('renders all variants', () => {
      const avatar = elementCatalog.avatar;
      if (!avatar) return;

      avatar.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses fallback prop not name', () => {
      const avatar = elementCatalog.avatar;
      if (!avatar) return;

      avatar.variants.forEach((variant: ComponentVariant) => {
        expect(variant.code).not.toContain('name="');
        if (variant.code.includes('fallback')) {
          expect(variant.code).toContain('fallback=');
        }
      });
    });
  });

  describe('Badge component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.badge).toBeDefined();
    });

    it('renders all variants', () => {
      const badge = elementCatalog.badge;
      if (!badge) return;

      badge.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Box component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.box).toBeDefined();
    });

    it('renders all variants', () => {
      const box = elementCatalog.box;
      if (!box) return;

      box.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Button component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.button).toBeDefined();
    });

    it('renders all variants', () => {
      const button = elementCatalog.button;
      if (!button) return;

      button.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Checkbox component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.checkbox).toBeDefined();
    });

    it('renders all variants', () => {
      const checkbox = elementCatalog.checkbox;
      if (!checkbox) return;

      checkbox.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('CloseButton component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.closeButton).toBeDefined();
    });

    it('renders all variants', () => {
      const closeButton = elementCatalog.closeButton;
      if (!closeButton) return;

      closeButton.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Divider component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.divider).toBeDefined();
    });

    it('renders all variants', () => {
      const divider = elementCatalog.divider;
      if (!divider) return;

      divider.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('EnvironmentBadge component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.environmentBadge).toBeDefined();
    });

    it('renders all variants', () => {
      const environmentBadge = elementCatalog.environmentBadge;
      if (!environmentBadge) return;

      environmentBadge.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Heading component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.heading).toBeDefined();
    });

    it('renders all variants', () => {
      const heading = elementCatalog.heading;
      if (!heading) return;

      heading.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Input component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.input).toBeDefined();
    });

    it('renders all variants', () => {
      const input = elementCatalog.input;
      if (!input) return;

      input.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Kbd component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.kbd).toBeDefined();
    });

    it('renders all variants', () => {
      const kbd = elementCatalog.kbd;
      if (!kbd) return;

      kbd.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('MenuItem component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.menuItem).toBeDefined();
    });

    it('renders all variants', () => {
      const menuItem = elementCatalog.menuItem;
      if (!menuItem) return;

      menuItem.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Progress component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.progress).toBeDefined();
    });

    it('renders all variants', () => {
      const progress = elementCatalog.progress;
      if (!progress) return;

      progress.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Skeleton component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.skeleton).toBeDefined();
    });

    it('renders all variants', () => {
      const skeleton = elementCatalog.skeleton;
      if (!skeleton) return;

      skeleton.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Spinner component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.spinner).toBeDefined();
    });

    it('renders all variants', () => {
      const spinner = elementCatalog.spinner;
      if (!spinner) return;

      spinner.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Switch component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.switch).toBeDefined();
    });

    it('renders all variants', () => {
      const switchComponent = elementCatalog.switch;
      if (!switchComponent) return;

      switchComponent.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Table component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.table).toBeDefined();
    });

    it('renders all variants', () => {
      const table = elementCatalog.table;
      if (!table) return;

      table.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Text component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.text).toBeDefined();
    });

    it('renders all variants', () => {
      const text = elementCatalog.text;
      if (!text) return;

      text.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('does not use brand tone', () => {
      const text = elementCatalog.text;
      if (!text) return;

      text.variants.forEach((variant: ComponentVariant) => {
        expect(variant.code).not.toContain('tone="brand"');
      });
    });
  });

  describe('TextArea component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.textarea).toBeDefined();
    });

    it('renders all variants', () => {
      const textarea = elementCatalog.textarea;
      if (!textarea) return;

      textarea.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Toaster component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.toaster).toBeDefined();
    });

    it('renders all variants', () => {
      const toaster = elementCatalog.toaster;
      if (!toaster) return;

      toaster.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Tooltip component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.tooltip).toBeDefined();
    });

    it('renders all variants', () => {
      const tooltip = elementCatalog.tooltip;
      if (!tooltip) return;

      tooltip.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('VersionBadge component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.versionBadge).toBeDefined();
    });

    it('renders all variants', () => {
      const versionBadge = elementCatalog.versionBadge;
      if (!versionBadge) return;

      versionBadge.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('VisuallyHidden component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog.visuallyHidden).toBeDefined();
    });

    it('renders all variants', () => {
      const visuallyHidden = elementCatalog.visuallyHidden;
      if (!visuallyHidden) return;

      visuallyHidden.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });
});

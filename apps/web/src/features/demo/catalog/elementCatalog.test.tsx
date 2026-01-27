// apps/web/src/features/demo/catalog/__tests__/elementCatalog.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { elementCatalog } from './elementCatalog';

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
      expect(elementCatalog['alert']).toBeDefined();
    });

    it('renders all variants', () => {
      const alert = elementCatalog['alert'];
      if (!alert) return;

      alert.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses tone prop not variant', () => {
      const alert = elementCatalog['alert'];
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
      expect(elementCatalog['avatar']).toBeDefined();
    });

    it('renders all variants', () => {
      const avatar = elementCatalog['avatar'];
      if (!avatar) return;

      avatar.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses fallback prop not name', () => {
      const avatar = elementCatalog['avatar'];
      if (!avatar) return;

      avatar.variants.forEach((variant: ComponentVariant) => {
        expect(variant.code).not.toContain('name="');
        if (variant.code.includes('fallback')) {
          expect(variant.code).toContain('fallback=');
        }
      });
    });
  });

  describe('Modal component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['modal']).toBeDefined();
    });

    it('renders all variants', () => {
      const modal = elementCatalog['modal'];
      if (!modal) return;

      modal.variants.forEach((variant: ComponentVariant) => {
        const VariantComponent = variant.render;
        const { container } = render(<VariantComponent />);
        expect(container).toBeInTheDocument();
      });
    });

    it('uses compound component pattern', () => {
      const modal = elementCatalog['modal'];
      const firstVariant = modal?.variants[0];
      if (!firstVariant) return;

      expect(firstVariant.code).toContain('Modal.Root');
      expect(firstVariant.code).not.toContain('<Modal ');
    });
  });

  describe('Overlay component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['overlay']).toBeDefined();
    });

    it('renders all variants', () => {
      const overlay = elementCatalog['overlay'];
      if (!overlay) return;

      overlay.variants.forEach((variant: ComponentVariant) => {
        const VariantComponent = variant.render;
        const { container } = render(<VariantComponent />);
        expect(container).toBeInTheDocument();
      });
    });

    it('uses open prop not visible', () => {
      const overlay = elementCatalog['overlay'];
      const firstVariant = overlay?.variants[0];
      if (!firstVariant) return;

      expect(firstVariant.code).toContain('open={');
      expect(firstVariant.code).not.toContain('visible');
    });
  });

  describe('Pagination component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['pagination']).toBeDefined();
    });

    it('renders all variants', () => {
      const pagination = elementCatalog['pagination'];
      if (!pagination) return;

      pagination.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses value prop not currentPage', () => {
      const pagination = elementCatalog['pagination'];
      const firstVariant = pagination?.variants[0];
      if (!firstVariant) return;

      expect(firstVariant.code).toContain('value={');
      expect(firstVariant.code).not.toContain('currentPage');
    });
  });

  describe('Toast component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['toast']).toBeDefined();
    });

    it('renders all variants', () => {
      const toast = elementCatalog['toast'];
      if (!toast) return;

      toast.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses message object prop', () => {
      const toast = elementCatalog['toast'];
      if (!toast) return;

      toast.variants.forEach((variant: ComponentVariant) => {
        expect(variant.code).toContain('message={{');
        expect(variant.code).not.toContain('variant="');
      });
    });
  });

  describe('Dialog component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['dialog']).toBeDefined();
    });

    it('renders all variants', () => {
      const dialog = elementCatalog['dialog'];
      if (!dialog) return;

      dialog.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses compound component pattern', () => {
      const dialog = elementCatalog['dialog'];
      const firstVariant = dialog?.variants[0];
      if (!firstVariant) return;

      expect(firstVariant.code).toContain('Dialog.Root');
      expect(firstVariant.code).toContain('Dialog.Trigger');
      expect(firstVariant.code).toContain('Dialog.Content');
    });
  });

  describe('RadioGroup component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['radioGroup']).toBeDefined();
    });

    it('renders all variants', () => {
      const radioGroup = elementCatalog['radioGroup'];
      if (!radioGroup) return;

      radioGroup.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses children not options', () => {
      const radioGroup = elementCatalog['radioGroup'];
      const firstVariant = radioGroup?.variants[0];
      if (!firstVariant) return;

      expect(firstVariant.code).not.toContain('options={');
    });
  });

  describe('Text component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['text']).toBeDefined();
    });

    it('renders all variants', () => {
      const text = elementCatalog['text'];
      if (!text) return;

      text.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('does not use brand tone', () => {
      const text = elementCatalog['text'];
      if (!text) return;

      text.variants.forEach((variant: ComponentVariant) => {
        expect(variant.code).not.toContain('tone="brand"');
      });
    });
  });

  describe('Accordion component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['accordion']).toBeDefined();
    });

    it('renders all variants', () => {
      const accordion = elementCatalog['accordion'];
      if (!accordion) return;

      accordion.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Checkbox component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['checkbox']).toBeDefined();
    });

    it('renders all variants', () => {
      const checkbox = elementCatalog['checkbox'];
      if (!checkbox) return;

      checkbox.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Select component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['select']).toBeDefined();
    });

    it('renders all variants', () => {
      const select = elementCatalog['select'];
      if (!select) return;

      select.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Table component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['table']).toBeDefined();
    });

    it('renders all variants', () => {
      const table = elementCatalog['table'];
      if (!table) return;

      table.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Tabs component', () => {
    it('is defined in the catalog', () => {
      expect(elementCatalog['tabs']).toBeDefined();
    });

    it('renders all variants', () => {
      const tabs = elementCatalog['tabs'];
      if (!tabs) return;

      tabs.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });
});

// apps/web/src/features/demo/catalog/__tests__/componentCatalog.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { componentCatalog } from './componentCatalog';

import type { ComponentDemo, ComponentVariant } from '@demo/types';

describe('componentCatalog', () => {
  describe('Catalog Structure', () => {
    it('exports a valid component catalog object', () => {
      expect(componentCatalog).toBeDefined();
      expect(typeof componentCatalog).toBe('object');
    });

    it('has components with required properties', () => {
      Object.values(componentCatalog).forEach((component: ComponentDemo) => {
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('category');
        expect(component).toHaveProperty('description');
        expect(component).toHaveProperty('variants');
        expect(Array.isArray(component.variants)).toBe(true);
      });
    });

    it('has variants with required properties', () => {
      Object.values(componentCatalog).forEach((component: ComponentDemo) => {
        component.variants.forEach((variant: ComponentVariant) => {
          expect(variant).toHaveProperty('name');
          expect(variant).toHaveProperty('description');
          expect(variant).toHaveProperty('code');
          expect(variant).toHaveProperty('render');
          expect(typeof variant.render).toBe('function');
        });
      });
    });

    it('all components have category "components"', () => {
      Object.values(componentCatalog).forEach((component: ComponentDemo) => {
        expect(component.category).toBe('components');
      });
    });
  });

  describe('Box component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['box']).toBeDefined();
    });

    it('renders all variants', () => {
      const box = componentCatalog['box'];
      if (!box) return;

      box.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Button component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['button']).toBeDefined();
    });

    it('renders all variants', () => {
      const button = componentCatalog['button'];
      if (!button) return;

      button.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('has expected variants', () => {
      const button = componentCatalog['button'];
      if (!button) return;

      const variantNames = button.variants.map((v: ComponentVariant) => v.name);
      expect(variantNames).toContain('Primary');
      expect(variantNames).toContain('Secondary');
      expect(variantNames).toContain('Text');
      expect(variantNames).toContain('Disabled');
    });
  });

  describe('Card component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['card']).toBeDefined();
    });

    it('renders all variants', () => {
      const card = componentCatalog['card'];
      if (!card) return;

      card.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Input component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['input']).toBeDefined();
    });

    it('renders all variants', () => {
      const input = componentCatalog['input'];
      if (!input) return;

      input.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Spinner component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['spinner']).toBeDefined();
    });

    it('renders all variants', () => {
      const spinner = componentCatalog['spinner'];
      if (!spinner) return;

      spinner.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('AppShell component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['appShell']).toBeDefined();
    });

    it('renders all variants', () => {
      const appShell = componentCatalog['appShell'];
      if (!appShell) return;

      appShell.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Badge component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog['badge']).toBeDefined();
    });

    it('renders all variants', () => {
      const badge = componentCatalog['badge'];
      if (!badge) return;

      badge.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('has tone variants', () => {
      const badge = componentCatalog['badge'];
      if (!badge) return;

      const variantNames = badge.variants.map((v: ComponentVariant) => v.name);
      expect(variantNames).toContain('Success');
      expect(variantNames).toContain('Danger');
      expect(variantNames).toContain('Warning');
    });
  });
});

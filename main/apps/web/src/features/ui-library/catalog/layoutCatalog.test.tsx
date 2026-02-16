// main/apps/web/src/features/ui-library/catalog/layoutCatalog.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { layoutCatalog } from './layoutCatalog';

import type { ComponentDemo, ComponentVariant } from '@ui-library/types';

describe('layoutCatalog', () => {
  describe('Catalog Structure', () => {
    it('exports a valid layout catalog object', () => {
      expect(layoutCatalog).toBeDefined();
      expect(typeof layoutCatalog).toBe('object');
    });

    it('has components with required properties', () => {
      Object.values(layoutCatalog).forEach((component: ComponentDemo) => {
        expect(component).toHaveProperty('id');
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('category');
        expect(component).toHaveProperty('description');
        expect(component).toHaveProperty('variants');
        expect(Array.isArray(component.variants)).toBe(true);
      });
    });

    it('has variants with required properties', () => {
      Object.values(layoutCatalog).forEach((component: ComponentDemo) => {
        component.variants.forEach((variant: ComponentVariant) => {
          expect(variant).toHaveProperty('name');
          expect(variant).toHaveProperty('description');
          expect(variant).toHaveProperty('code');
          expect(variant).toHaveProperty('render');
          expect(typeof variant.render).toBe('function');
        });
      });
    });

    it('all components have category "layouts"', () => {
      Object.values(layoutCatalog).forEach((component: ComponentDemo) => {
        expect(component.category).toBe('layouts');
      });
    });
  });

  describe('Container component', () => {
    it('is defined in the catalog', () => {
      expect(layoutCatalog['container']).toBeDefined();
    });

    it('renders all variants', () => {
      const container = layoutCatalog['container'];
      if (container == null) return;

      container.variants.forEach((variant: ComponentVariant) => {
        const { container: renderedContainer } = render(variant.render());
        expect(renderedContainer).toBeInTheDocument();
      });
    });

    it('has size variants', () => {
      const container = layoutCatalog['container'];
      if (container == null) return;

      const variantNames = container.variants.map((v: ComponentVariant) => v.name);
      expect(variantNames).toContain('Small (640px)');
      expect(variantNames).toContain('Medium (960px)');
      expect(variantNames).toContain('Large (1200px)');
    });
  });

  describe('AuthLayout component', () => {
    it('is defined in the catalog', () => {
      expect(layoutCatalog['authLayout']).toBeDefined();
    });

    it('renders all variants', () => {
      const authLayout = layoutCatalog['authLayout'];
      if (authLayout == null) return;

      authLayout.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('has form variants', () => {
      const authLayout = layoutCatalog['authLayout'];
      if (authLayout == null) return;

      const variantNames = authLayout.variants.map((v: ComponentVariant) => v.name);
      expect(variantNames).toContain('Login Form');
      expect(variantNames).toContain('Sign Up Form');
    });
  });

  describe('PageContainer component', () => {
    it('is defined in the catalog', () => {
      expect(layoutCatalog['pageContainer']).toBeDefined();
    });

    it('renders all variants', () => {
      const pageContainer = layoutCatalog['pageContainer'];
      if (pageContainer == null) return;

      pageContainer.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('SidebarLayout component', () => {
    it('is defined in the catalog', () => {
      expect(layoutCatalog['sidebarLayout']).toBeDefined();
    });

    it('renders all variants', () => {
      const sidebarLayout = layoutCatalog['sidebarLayout'];
      if (sidebarLayout == null) return;

      sidebarLayout.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('StackedLayout component', () => {
    it('is defined in the catalog', () => {
      expect(layoutCatalog['stackedLayout']).toBeDefined();
    });

    it('renders all variants', () => {
      const stackedLayout = layoutCatalog['stackedLayout'];
      if (stackedLayout == null) return;

      stackedLayout.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('has hero variant', () => {
      const stackedLayout = layoutCatalog['stackedLayout'];
      if (stackedLayout == null) return;

      const variantNames = stackedLayout.variants.map((v: ComponentVariant) => v.name);
      expect(variantNames).toContain('With Hero');
    });
  });
});

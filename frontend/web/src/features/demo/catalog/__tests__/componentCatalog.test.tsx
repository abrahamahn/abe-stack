// apps/web/src/features/demo/catalog/__tests__/componentCatalog.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { componentCatalog } from '../componentCatalog';

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

  describe('Accordion component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.accordion).toBeDefined();
    });

    it('renders all variants', () => {
      const accordion = componentCatalog.accordion;
      if (!accordion) return;

      accordion.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Card component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.card).toBeDefined();
    });

    it('renders all variants', () => {
      const card = componentCatalog.card;
      if (!card) return;

      card.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Dialog component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.dialog).toBeDefined();
    });

    it('renders all variants', () => {
      const dialog = componentCatalog.dialog;
      if (!dialog) return;

      dialog.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('uses compound component pattern', () => {
      const dialog = componentCatalog.dialog;
      const firstVariant = dialog?.variants[0];
      if (!firstVariant) return;

      expect(firstVariant.code).toContain('Dialog.Root');
      expect(firstVariant.code).toContain('Dialog.Trigger');
      expect(firstVariant.code).toContain('Dialog.Content');
    });
  });

  describe('Dropdown component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.dropdown).toBeDefined();
    });

    it('renders all variants', () => {
      const dropdown = componentCatalog.dropdown;
      if (!dropdown) return;

      dropdown.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('FormField component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.formField).toBeDefined();
    });

    it('renders all variants', () => {
      const formField = componentCatalog.formField;
      if (!formField) return;

      formField.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });

    it('has expected variants', () => {
      const formField = componentCatalog.formField;
      if (!formField) return;

      const variantNames = formField.variants.map((v: ComponentVariant) => v.name);
      expect(variantNames).toContain('Basic');
      expect(variantNames).toContain('Required');
      expect(variantNames).toContain('With Error');
    });
  });

  describe('Image component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.image).toBeDefined();
    });

    it('renders all variants', () => {
      const image = componentCatalog.image;
      if (!image) return;

      image.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('LoadingContainer component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.loadingContainer).toBeDefined();
    });

    it('renders all variants', () => {
      const loadingContainer = componentCatalog.loadingContainer;
      if (!loadingContainer) return;

      loadingContainer.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Pagination component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.pagination).toBeDefined();
    });

    it('renders all variants', () => {
      const pagination = componentCatalog.pagination;
      if (!pagination) return;

      pagination.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Popover component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.popover).toBeDefined();
    });

    it('renders all variants', () => {
      const popover = componentCatalog.popover;
      if (!popover) return;

      popover.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Radio component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.radio).toBeDefined();
    });

    it('renders all variants', () => {
      const radio = componentCatalog.radio;
      if (!radio) return;

      radio.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('RadioGroup component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.radioGroup).toBeDefined();
    });

    it('renders all variants', () => {
      const radioGroup = componentCatalog.radioGroup;
      if (!radioGroup) return;

      radioGroup.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Select component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.select).toBeDefined();
    });

    it('renders all variants', () => {
      const select = componentCatalog.select;
      if (!select) return;

      select.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Slider component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.slider).toBeDefined();
    });

    it('renders all variants', () => {
      const slider = componentCatalog.slider;
      if (!slider) return;

      slider.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Tabs component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.tabs).toBeDefined();
    });

    it('renders all variants', () => {
      const tabs = componentCatalog.tabs;
      if (!tabs) return;

      tabs.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Toast component', () => {
    it('is defined in the catalog', () => {
      expect(componentCatalog.toast).toBeDefined();
    });

    it('renders all variants', () => {
      const toast = componentCatalog.toast;
      if (!toast) return;

      toast.variants.forEach((variant: ComponentVariant) => {
        const { container } = render(variant.render());
        expect(container).toBeInTheDocument();
      });
    });
  });
});

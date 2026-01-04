// apps/web/src/features/demo/types/index.ts
import type { ReactNode } from 'react';

export type ComponentCategory = 'elements' | 'components' | 'hooks' | 'layouts' | 'theme' | 'utils';

export type ComponentVariant = {
  name: string;
  description: string;
  code: string;
  render: () => ReactNode;
};

export type ComponentDemo = {
  id: string;
  name: string;
  category: ComponentCategory;
  description: string;
  variants: ComponentVariant[];
  props?: Record<string, unknown>;
  docs?: string;
  relatedDocs?: string[];
};

export type DemoPaneConfig = {
  top: { visible: boolean; size: number };
  left: { visible: boolean; size: number };
  right: { visible: boolean; size: number };
  bottom: { visible: boolean; size: number };
};

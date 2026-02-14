// main/apps/web/src/features/ui-library/UILibraryPage.tsx
import { useKeyboardShortcut } from '@abe-stack/react/hooks';
import { Button, MenuItem, ScrollArea, Text } from '@abe-stack/ui';
import { useAppRightSidebar } from '@app/layouts';
import { getAllCategories, getComponentsByCategory } from '@catalog/index';
import { useCallback, useMemo, useState } from 'react';

import { UILibraryPreviewArea } from './components/UILibraryPreviewArea';

import type { ComponentDemo } from './types';
import type { ReactElement } from 'react';

export const UILibraryPage = (): ReactElement => {
  const [activeCategory, setActiveCategory] = useState<string>('elements');
  const [selectedComponent, setSelectedComponent] = useState<ComponentDemo | null>(null);

  const categories = useMemo(() => getAllCategories(), []);
  const componentsInCategory = useMemo(
    () => getComponentsByCategory(activeCategory),
    [activeCategory],
  );

  const handleCategoryChange = useCallback((cat: string): void => {
    setActiveCategory(cat);
    setSelectedComponent(null);
  }, []);

  const handleSelectComponent = useCallback((comp: ComponentDemo): void => {
    setSelectedComponent(comp);
  }, []);

  // Escape key clears selection.
  useKeyboardShortcut({
    key: 'Escape',
    handler: () => {
      setSelectedComponent(null);
    },
    skipInputs: true,
  });

  // Inject component list into AppLayout's right sidebar
  const rightSidebarContent = useMemo(
    () => (
      <UILibraryRightSidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        components={componentsInCategory}
        selectedComponent={selectedComponent}
        onSelectComponent={handleSelectComponent}
      />
    ),
    [
      categories,
      activeCategory,
      handleCategoryChange,
      componentsInCategory,
      selectedComponent,
      handleSelectComponent,
    ],
  );

  useAppRightSidebar(rightSidebarContent);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 min-h-0">
        <UILibraryPreviewArea selectedComponent={selectedComponent} />
      </div>
    </div>
  );
};

interface UILibraryRightSidebarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  components: ComponentDemo[];
  selectedComponent: ComponentDemo | null;
  onSelectComponent: (comp: ComponentDemo) => void;
}

const UILibraryRightSidebar = ({
  categories,
  activeCategory,
  onCategoryChange,
  components,
  selectedComponent,
  onSelectComponent,
}: UILibraryRightSidebarProps): ReactElement => {
  return (
    <div className="flex flex-col h-full">
      {/* Category tabs */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'primary' : 'secondary'}
            size="small"
            onClick={() => {
              onCategoryChange(cat);
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Button>
        ))}
      </div>

      {/* Component list */}
      <ScrollArea className="flex-1">
        <div className="flex-col gap-1 p-2">
          <Text tone="muted" className="text-xs px-1 pb-1">
            {components.length} component{components.length !== 1 ? 's' : ''}
          </Text>
          {components.map((comp) => (
            <MenuItem
              key={comp.id}
              onClick={() => {
                onSelectComponent(comp);
              }}
              data-selected={selectedComponent?.id === comp.id}
            >
              <Text>{comp.name}</Text>
              <Text tone="muted" className="text-xs">
                {comp.variants.length} variant{comp.variants.length !== 1 ? 's' : ''}
              </Text>
            </MenuItem>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

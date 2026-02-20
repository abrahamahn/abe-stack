// main/apps/storybook/.storybook/preview.ts
import { createElement } from 'react';

import type { Preview } from '@storybook/react';

// Import theme CSS variables and element/component/layout styles
import '../../../client/ui/src/styles/theme.css';
import '../../../client/ui/src/styles/elements.css';
import '../../../client/ui/src/styles/components.css';
import '../../../client/ui/src/styles/layouts.css';
import '../../../client/ui/src/styles/utilities.css';

const VIEWPORT_PRESETS = {
  mobile: {
    name: 'Mobile',
    styles: { width: '375px', height: '812px' },
  },
  tablet: {
    name: 'Tablet',
    styles: { width: '768px', height: '1024px' },
  },
  desktop: {
    name: 'Desktop',
    styles: { width: '1440px', height: '900px' },
  },
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      viewports: VIEWPORT_PRESETS,
    },
  },
  decorators: [
    (Story) =>
      createElement(
        'div',
        { 'data-theme': 'light', style: { padding: '1rem' } },
        createElement(Story),
      ),
  ],
};

export default preview;

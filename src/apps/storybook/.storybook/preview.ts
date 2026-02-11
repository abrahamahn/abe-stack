// src/apps/storybook/.storybook/preview.ts
import type { Preview } from '@storybook/react';

// Import theme CSS variables and element/component/layout styles
import '../../../client/ui/src/styles/theme.css';
import '../../../client/ui/src/styles/elements.css';
import '../../../client/ui/src/styles/components.css';
import '../../../client/ui/src/styles/layouts.css';
import '../../../client/ui/src/styles/utilities.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

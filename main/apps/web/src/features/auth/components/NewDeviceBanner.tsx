// main/apps/web/src/features/auth/components/NewDeviceBanner.tsx
import { Alert, CloseButton, Text } from '@abe-stack/ui';
import { useAuth } from '@auth/hooks';

import type { ReactElement } from 'react';

/**
 * Banner shown when the user logs in from a new/unrecognized device.
 * Displays a warning with a dismiss button.
 *
 * @returns Banner element or null if not a new device login
 * @complexity O(1)
 */
export function NewDeviceBanner(): ReactElement | null {
  const { isNewDevice, dismissNewDeviceBanner } = useAuth();

  if (!isNewDevice) return null;

  return (
    <div className="px-2 py-1" data-testid="new-device-banner">
      <Alert tone="warning" title="New device detected">
        <span className="flex items-center justify-between gap-2">
          <Text as="span">
            You signed in from a new device or location. If this wasn&apos;t you, please change your
            password immediately.
          </Text>
          <CloseButton aria-label="Dismiss new device banner" onClick={dismissNewDeviceBanner} />
        </span>
      </Alert>
    </div>
  );
}

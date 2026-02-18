// main/client/ui/src/components/DeviceRowCard.tsx
import { formatDateTime, parseUserAgent } from '@bslt/shared';

import { Button } from '../elements/Button';
import { Text } from '../elements/Text';

import { Card } from './Card';

import type { ReactElement } from 'react';

export interface DeviceRowCardDevice {
  id: string;
  label: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string;
  trusted: boolean;
}

export interface DeviceRowCardProps {
  device: DeviceRowCardDevice;
  onTrust: (id: string) => void;
  onRevoke: (id: string) => void;
}

export const DeviceRowCard = ({ device, onTrust, onRevoke }: DeviceRowCardProps): ReactElement => {
  const { browser } = parseUserAgent(device.userAgent);

  return (
    <Card className="p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Text>{device.label ?? browser}</Text>
          {device.trusted && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--ui-badge-success-bg)',
                color: 'var(--ui-color-success)',
              }}
            >
              Trusted
            </span>
          )}
        </div>
        <Text tone="muted" size="sm">
          {device.ipAddress ?? 'Unknown IP'} &middot; Last seen {formatDateTime(device.lastSeenAt)}
        </Text>
      </div>
      <div className="flex gap-2">
        {!device.trusted && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              onTrust(device.id);
            }}
          >
            Trust
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => {
            onRevoke(device.id);
          }}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
};

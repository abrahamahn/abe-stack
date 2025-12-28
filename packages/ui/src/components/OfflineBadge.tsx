import { Badge } from './Badge';
import { useOnline } from '../hooks/useOnline';

export function OfflineBadge() {
  const online = useOnline();
  return (
    <Badge style={{ backgroundColor: online ? undefined : 'var(--orange)' }}>
      {online ? 'Online' : <strong>Offline</strong>}
    </Badge>
  );
}

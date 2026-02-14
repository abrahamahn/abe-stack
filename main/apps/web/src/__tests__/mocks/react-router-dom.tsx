// main/apps/web/src/__tests__/mocks/react-router-dom.tsx
import { Fragment, type ReactElement } from 'react';

function outlet({ children }: { children?: ReactElement }): ReactElement | null {
  return children ?? <Fragment />;
}

export { outlet as Outlet };

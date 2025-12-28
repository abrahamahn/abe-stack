import React, { useState } from 'react';

import { Button } from '../Button';
import { DropdownMenu } from '../DropdownMenu';

export function DropdownDemo() {
  const [open, setOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div>
      <Button ref={buttonRef} onClick={() => setOpen(true)}>
        Open Dropdown
      </Button>
      {open && (
        <DropdownMenu
          onClose={() => setOpen(false)}
          items={[
            { label: 'Item 1', onClick: () => console.log('Item 1') },
            { label: 'Item 2', onClick: () => console.log('Item 2') },
            { label: 'Item 3', onClick: () => console.log('Item 3') },
          ]}
        />
      )}
    </div>
  );
}

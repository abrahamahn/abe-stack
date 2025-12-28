import React, { useState } from 'react';

import { Button } from '../Button';
import { Popup } from '../Popup';

export function PopupDemo() {
  const [open, setOpen] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div>
      <Button ref={buttonRef} onClick={() => setOpen(true)}>
        Open Popup
      </Button>
      <Popup open={open} anchor={buttonRef.current} onDismiss={() => setOpen(false)}>
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.25rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          This is a popup!
        </div>
      </Popup>
    </div>
  );
}

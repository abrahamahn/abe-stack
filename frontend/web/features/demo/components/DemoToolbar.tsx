import { Button, Heading } from '@ui';
import { useNavigate } from 'react-router-dom';

interface DemoToolbarProps {
  layoutBorder: string;
}

export function DemoToolbar({ layoutBorder }: DemoToolbarProps): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        background: 'var(--ui-color-bg)',
        borderBottom: layoutBorder,
      }}
    >
      <Button
        variant="text"
        size="small"
        onClick={() => {
          void navigate('/');
        }}
        aria-label="Back to home"
        style={{ minWidth: '88px' }}
      >
        ← Back
      </Button>
      <div className="flex-1 text-center">
        <Heading as="h1" size="lg">
          ABE Stack UI Component Gallery
        </Heading>
      </div>
      <div style={{ minWidth: '88px' }} />
    </div>
  );
}

import { Button } from '../Button';

export function ButtonDemo() {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <Button>Default Button</Button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <Button variant="primary">Primary Button</Button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <Button variant="text">Naked Button</Button>
      </div>
    </div>
  );
}

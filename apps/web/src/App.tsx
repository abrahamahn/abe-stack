import React from 'react';

import { Button, Card, Spinner } from '@abe-stack/ui';

export const App: React.FC = () => {
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => {
      setCount((c) => c + 1);
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>ABE Stack - Web App</h1>
      <Card>
        <h2>Component Demo</h2>
        <p>Count: {count}</p>
        {loading ? <Spinner /> : <Button onClick={handleClick}>Increment</Button>}
      </Card>
    </div>
  );
};

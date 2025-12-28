import { useClientEnvironment } from '../services/ClientEnvironment';

export function Design({ page }: { page: string }) {
  const environment = useClientEnvironment();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Design System</h1>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => environment.router.navigate('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Home
        </button>
      </div>

      {renderPage(page)}
    </div>
  );
}

function renderPage(page: string) {
  switch (page) {
    case 'colors':
      return <ColorsPage />;
    case 'typography':
      return <TypographyPage />;
    case 'buttons':
      return <ButtonsPage />;
    default:
      return (
        <div>
          <h2>Design System Pages</h2>
          <ul>
            <li>
              <a href="/design/colors" style={{ color: 'var(--blue)' }}>
                Colors
              </a>
            </li>
            <li>
              <a href="/design/typography" style={{ color: 'var(--blue)' }}>
                Typography
              </a>
            </li>
            <li>
              <a href="/design/buttons" style={{ color: 'var(--blue)' }}>
                Buttons
              </a>
            </li>
          </ul>
        </div>
      );
  }
}

function ColorsPage() {
  return (
    <div>
      <h2>Colors</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {['blue', 'green', 'red', 'orange', 'purple', 'teal'].map((color) => (
          <div key={color} style={{ width: '150px' }}>
            <div
              style={{
                height: '100px',
                backgroundColor: `var(--${color})`,
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            />
            <div>{color}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypographyPage() {
  return (
    <div>
      <h2>Typography</h2>
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <h4>Heading 4</h4>
      <p>Regular paragraph text</p>
      <p>
        <small>Small text</small>
      </p>
      <p>
        <strong>Bold text</strong>
      </p>
      <p>
        <em>Italic text</em>
      </p>
    </div>
  );
}

function ButtonsPage() {
  return (
    <div>
      <h2>Buttons</h2>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Primary
        </button>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: 'transparent',
            color: 'var(--blue)',
            border: '1px solid var(--blue)',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Secondary
        </button>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--red)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Danger
        </button>
      </div>
    </div>
  );
}

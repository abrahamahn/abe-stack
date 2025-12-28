import { PageContent } from '../../layouts/PageContent';

export function DesignPage() {
  return (
    <PageContent
      title="Design System"
      description="This page showcases the design system components available in the ABE Stack."
    >
      <div style={{ marginTop: '20px' }}>
        <h2>Color Palette</h2>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '10px',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              borderRadius: '4px',
            }}
          >
            Blue
          </div>
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              borderRadius: '4px',
            }}
          >
            Green
          </div>
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              borderRadius: '4px',
            }}
          >
            Red
          </div>
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--yellow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'black',
              borderRadius: '4px',
            }}
          >
            Yellow
          </div>
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'var(--purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              borderRadius: '4px',
            }}
          >
            Purple
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Typography</h2>
        <div style={{ marginTop: '10px' }}>
          <h1 style={{ margin: '10px 0' }}>Heading 1</h1>
          <h2 style={{ margin: '10px 0' }}>Heading 2</h2>
          <h3 style={{ margin: '10px 0' }}>Heading 3</h3>
          <h4 style={{ margin: '10px 0' }}>Heading 4</h4>
          <p style={{ margin: '10px 0' }}>Regular paragraph text</p>
          <p style={{ margin: '10px 0', fontWeight: 'bold' }}>Bold text</p>
          <p style={{ margin: '10px 0', fontStyle: 'italic' }}>Italic text</p>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Buttons</h2>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '10px',
          }}
        >
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
              backgroundColor: 'white',
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
              backgroundColor: 'var(--green)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Success
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
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--yellow)',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Warning
          </button>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#ccc',
              color: '#666',
              border: 'none',
              borderRadius: '4px',
              cursor: 'not-allowed',
            }}
          >
            Disabled
          </button>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Form Elements</h2>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginTop: '10px',
            maxWidth: '400px',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Text Input</label>
            <input
              type="text"
              placeholder="Enter text"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Select</label>
            <select
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            >
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Textarea</label>
            <textarea
              placeholder="Enter longer text"
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                minHeight: '100px',
              }}
            ></textarea>
          </div>
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <input type="checkbox" />
              <span>Checkbox option</span>
            </label>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <input type="radio" name="radioGroup" />
              <span>Radio option 1</span>
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <input type="radio" name="radioGroup" />
              <span>Radio option 2</span>
            </label>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h2>Cards</h2>
        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            marginTop: '10px',
          }}
        >
          <div
            style={{
              width: '250px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '150px',
                backgroundColor: 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              Image Placeholder
            </div>
            <div style={{ padding: '15px' }}>
              <h3 style={{ marginTop: 0 }}>Card Title</h3>
              <p>This is a basic card with an image, title, and description.</p>
              <button
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px',
                }}
              >
                Action
              </button>
            </div>
          </div>

          <div
            style={{
              width: '250px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Simple Card</h3>
            <p>This is a simpler card without an image, just text content.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'white',
                  color: 'var(--blue)',
                  border: '1px solid var(--blue)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
}

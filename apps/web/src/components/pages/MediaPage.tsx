import { PageContent } from '../../layouts/PageContent';

export function MediaPage() {
  return (
    <PageContent
      title="Media Page"
      description="This page demonstrates the multimedia capabilities of the ABE Stack."
    >
      <div style={{ marginTop: '20px' }}>
        <h2>Media Features</h2>
        <ul>
          <li>Video streaming with HLS/DASH support</li>
          <li>Audio playback with waveform visualization</li>
          <li>Image galleries with lazy loading</li>
          <li>File uploads with progress tracking</li>
          <li>Media metadata extraction</li>
          <li>Responsive media players</li>
        </ul>
      </div>

      {/* Example media player placeholder */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          height: '360px',
          backgroundColor: '#222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '20px',
          borderRadius: '8px',
        }}
      >
        <p style={{ color: 'white' }}>Media Player Placeholder</p>
      </div>
    </PageContent>
  );
}

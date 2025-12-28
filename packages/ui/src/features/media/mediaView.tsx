interface MediaViewProps {
  filename: string;
  type?: 'audio' | 'video' | 'image';
  controls?: boolean;
  autoPlay?: boolean;
  width?: string | number;
  height?: string | number;
}

export function MediaView({
  filename,
  type,
  controls = true,
  autoPlay = false,
  width = '100%',
  height = 'auto',
}: MediaViewProps) {
  // Construct media URL
  const mediaUrl = `/api/stream?filename=${encodeURIComponent(filename)}`;

  // Automatically detect type from filename extension if not provided
  const detectType = (): 'audio' | 'video' | 'image' => {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext || '')) return 'audio';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';

    return 'video'; // Default fallback
  };

  const mediaType = type || detectType();

  if (mediaType === 'audio') {
    return <audio src={mediaUrl} controls={controls} autoPlay={autoPlay} style={{ width }} />;
  }

  if (mediaType === 'video') {
    return (
      <video src={mediaUrl} controls={controls} autoPlay={autoPlay} style={{ width, height }} />
    );
  }

  if (mediaType === 'image') {
    return <img src={mediaUrl} alt={filename} style={{ width, height }} />;
  }

  return <div>Unsupported media type</div>;
}

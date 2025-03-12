-- Create playlist_tracks table
CREATE TABLE playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX idx_playlist_tracks_added_by ON playlist_tracks(added_by);
CREATE INDEX idx_playlist_tracks_order ON playlist_tracks(order_position);

-- Create unique constraint to prevent duplicate tracks in a playlist
CREATE UNIQUE INDEX idx_playlist_tracks_unique ON playlist_tracks(playlist_id, track_id);

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_playlist_tracks_updated_at
  BEFORE UPDATE ON playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 
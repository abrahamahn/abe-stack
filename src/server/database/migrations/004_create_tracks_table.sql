-- Create tracks table
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  duration INTEGER NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  cover_art_url VARCHAR(255),
  release_date TIMESTAMP WITH TIME ZONE,
  genre VARCHAR(100),
  is_public BOOLEAN NOT NULL DEFAULT true,
  play_count INTEGER NOT NULL DEFAULT 0,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_tracks_artist_id ON tracks(artist_id);
CREATE INDEX idx_tracks_album_id ON tracks(album_id);
CREATE INDEX idx_tracks_release_date ON tracks(release_date);
CREATE INDEX idx_tracks_genre ON tracks(genre);
CREATE INDEX idx_tracks_play_count ON tracks(play_count);

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 
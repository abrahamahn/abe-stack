-- Create albums table
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  cover_art_url VARCHAR(255),
  release_date TIMESTAMP WITH TIME ZONE,
  genre VARCHAR(100),
  is_public BOOLEAN NOT NULL DEFAULT true,
  track_count INTEGER NOT NULL DEFAULT 0,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_albums_artist_id ON albums(artist_id);
CREATE INDEX idx_albums_release_date ON albums(release_date);
CREATE INDEX idx_albums_genre ON albums(genre);

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_albums_updated_at
  BEFORE UPDATE ON albums
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 
-- Create playlists table
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_art_url VARCHAR(255),
  is_public BOOLEAN NOT NULL DEFAULT true,
  track_count INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_followers_count ON playlists(followers_count);

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 
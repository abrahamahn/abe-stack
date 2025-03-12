-- Create artists table
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  profile_image_url VARCHAR(255),
  banner_image_url VARCHAR(255),
  verified BOOLEAN NOT NULL DEFAULT false,
  followers_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 
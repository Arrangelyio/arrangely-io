-- Create trigger to auto-populate created_by when a new song is created
CREATE OR REPLACE FUNCTION set_song_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_set_song_created_by ON songs;

-- Create the trigger
CREATE TRIGGER trigger_set_song_created_by
  BEFORE INSERT ON songs
  FOR EACH ROW
  EXECUTE FUNCTION set_song_created_by();
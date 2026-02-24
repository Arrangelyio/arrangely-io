CREATE OR REPLACE FUNCTION prevent_public_to_private()
RETURNS trigger AS $$
BEGIN
    -- Jika sebelumnya public dan sekarang mau di-set ke private → tolak
    IF OLD.is_public = TRUE AND NEW.is_public = FALSE THEN
        RAISE EXCEPTION 'Songs that are already public cannot be changed back to private';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_visibility_change
BEFORE UPDATE ON songs
FOR EACH ROW
EXECUTE FUNCTION prevent_public_to_private();

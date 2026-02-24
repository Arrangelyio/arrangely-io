CREATE OR REPLACE FUNCTION log_chord_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chord_audit_log (
    master_chord_id,
    action,
    changed_fields,
    old_values,
    new_values,
    editor_id
  )
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    (
      SELECT jsonb_object_agg(key, new_val)
      FROM jsonb_each(to_jsonb(NEW)) n(key, new_val)
      JOIN jsonb_each(to_jsonb(OLD)) o(key, old_val) USING (key)
      WHERE new_val IS DISTINCT FROM old_val
    ),
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- create_chord_version
DECLARE
  changes_data JSONB;
  new_version_number INTEGER;
BEGIN
  -- Only create version for updates, not inserts
  IF TG_OP = 'UPDATE' THEN
    -- Calculate the diff between old and new
    changes_data := jsonb_build_object(
      'old_values', row_to_json(OLD),
      'new_values', row_to_json(NEW),
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::jsonb)
        WHERE key NOT IN ('updated_at', 'version_number')
          AND value IS DISTINCT FROM to_jsonb(row_to_json(OLD)::jsonb ->> key)
      )
    );

    -- Increment version number
    new_version_number := COALESCE(OLD.version_number, 1) + 1;
    NEW.version_number := new_version_number;

    -- Insert version record
    INSERT INTO public.chord_versions (
      master_chord_id,
      version_number,
      changes_diff,
      created_by
    ) VALUES (
      NEW.id,
      new_version_number,
      changes_data,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;

--populate chord
SELECT public.populate_chord_review_queue();
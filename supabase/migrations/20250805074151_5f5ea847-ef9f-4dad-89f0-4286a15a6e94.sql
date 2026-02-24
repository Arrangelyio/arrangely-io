-- Update songs that have chord grid data structure to have the correct theme
UPDATE songs 
SET theme = 'chord_grid' 
WHERE id IN (
  SELECT DISTINCT s.id 
  FROM songs s
  JOIN song_sections ss ON s.id = ss.song_id
  WHERE ss.chords IS NOT NULL 
  AND ss.chords LIKE '{"bars":%'
  AND ss.chords LIKE '%"melody":%'
);
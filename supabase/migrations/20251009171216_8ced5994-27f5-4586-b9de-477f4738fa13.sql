-- Insert lesson modules and content for all lessons (without is_production)

-- Guitar Basics: Your First Chords
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Getting Started with Guitar', 'Learn the fundamentals of holding and playing the guitar', 0),
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Your First Three Chords', 'Master the essential chords every guitarist needs', 1),
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Strumming Patterns and Rhythm', 'Develop your rhythm and timing skills', 2),
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Playing Your First Song', 'Put it all together and play complete songs', 3);

-- Jazz Piano Foundations
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Jazz Theory Basics', 'Understanding jazz harmony and chord structures', 0),
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Voicings and Inversions', 'Master essential jazz piano voicings', 1),
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Jazz Improvisation', 'Learn to improvise over jazz progressions', 2),
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Classic Jazz Standards', 'Play famous jazz pieces', 3);

-- Music Theory Essentials
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Reading Music Notation', 'Learn to read sheet music from scratch', 0),
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Scales and Intervals', 'Master major and minor scales', 1),
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Chord Construction', 'Build chords from theory principles', 2),
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Harmony and Progressions', 'Create beautiful chord progressions', 3);

-- Modern Music Production with DAWs
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('4491e347-499a-4cea-a83a-729feb6357e0', 'DAW Setup and Interface', 'Get started with your digital audio workstation', 0),
('4491e347-499a-4cea-a83a-729feb6357e0', 'Recording and Editing', 'Learn professional recording techniques', 1),
('4491e347-499a-4cea-a83a-729feb6357e0', 'Mixing Fundamentals', 'Balance and polish your tracks', 2),
('4491e347-499a-4cea-a83a-729feb6357e0', 'Mastering Your Music', 'Final touches for professional sound', 3);

-- Worship Leading Masterclass
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Worship Leading Essentials', 'Core principles of effective worship leading', 0),
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Building Your Setlist', 'Create engaging worship experiences', 1),
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Leading the Team', 'Communication and team dynamics', 2),
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Practical Applications', 'Real-world worship leading scenarios', 3);

-- Songwriting: From Idea to Hit
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Finding Your Inspiration', 'Develop your creative songwriting process', 0),
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Melody and Lyrics', 'Craft memorable melodies and meaningful lyrics', 1),
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Song Structure and Arrangement', 'Build effective song structures', 2),
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Finishing and Refining', 'Polish your songs to perfection', 3);

-- Add video content using simpler INSERT statements
-- Guitar Basics videos
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Introduction to Guitar Anatomy', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 15, true, 0
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Proper Posture and Hand Position', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Tuning Your Guitar', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 12, false, 2
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 0;

-- Jazz Piano videos
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Introduction to Jazz Harmony', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, true, 0
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Extended Chords Explained', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 28, false, 1
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Shell Voicings', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 24, true, 0
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 1;

-- Music Theory videos
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'The Musical Staff', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, true, 0
FROM lesson_modules m WHERE m.lesson_id = '7c431121-de7e-4742-ac60-46b0e414ad5a' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Note Names and Values', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = '7c431121-de7e-4742-ac60-46b0e414ad5a' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Major Scales Construction', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, true, 0
FROM lesson_modules m WHERE m.lesson_id = '7c431121-de7e-4742-ac60-46b0e414ad5a' AND m.order_index = 1;

-- Music Production videos
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Choosing Your DAW', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 20, true, 0
FROM lesson_modules m WHERE m.lesson_id = '4491e347-499a-4cea-a83a-729feb6357e0' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Interface Navigation', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 24, false, 1
FROM lesson_modules m WHERE m.lesson_id = '4491e347-499a-4cea-a83a-729feb6357e0' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Recording Audio Tracks', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 28, true, 0
FROM lesson_modules m WHERE m.lesson_id = '4491e347-499a-4cea-a83a-729feb6357e0' AND m.order_index = 1;

-- Worship Leading videos
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Heart of a Worship Leader', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, true, 0
FROM lesson_modules m WHERE m.lesson_id = 'd9385d21-c424-4a4e-8b10-018cd27c2164' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Spiritual Preparation', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'd9385d21-c424-4a4e-8b10-018cd27c2164' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Song Selection Strategy', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 26, true, 0
FROM lesson_modules m WHERE m.lesson_id = 'd9385d21-c424-4a4e-8b10-018cd27c2164' AND m.order_index = 1;

-- Songwriting videos
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Where Ideas Come From', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 24, true, 0
FROM lesson_modules m WHERE m.lesson_id = '851f9ac2-ecf3-48fc-8520-f80048537319' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Developing Your Creative Routine', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = '851f9ac2-ecf3-48fc-8520-f80048537319' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Writing Memorable Melodies', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 28, true, 0
FROM lesson_modules m WHERE m.lesson_id = '851f9ac2-ecf3-48fc-8520-f80048537319' AND m.order_index = 1;
-- Insert lesson modules and content for all lessons (fixed - removed is_production from lesson_modules)

-- Guitar Basics: Your First Chords (e35703f1-44fb-4e4c-a3b7-1c6e07088bd3)
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Getting Started with Guitar', 'Learn the fundamentals of holding and playing the guitar', 0),
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Your First Three Chords', 'Master the essential chords every guitarist needs', 1),
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Strumming Patterns and Rhythm', 'Develop your rhythm and timing skills', 2),
('e35703f1-44fb-4e4c-a3b7-1c6e07088bd3', 'Playing Your First Song', 'Put it all together and play complete songs', 3);

-- Jazz Piano Foundations (298d9b9e-3999-4c09-a1b0-c72a687decac)
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Jazz Theory Basics', 'Understanding jazz harmony and chord structures', 0),
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Voicings and Inversions', 'Master essential jazz piano voicings', 1),
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Jazz Improvisation', 'Learn to improvise over jazz progressions', 2),
('298d9b9e-3999-4c09-a1b0-c72a687decac', 'Classic Jazz Standards', 'Play famous jazz pieces', 3);

-- Music Theory Essentials (7c431121-de7e-4742-ac60-46b0e414ad5a)
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Reading Music Notation', 'Learn to read sheet music from scratch', 0),
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Scales and Intervals', 'Master major and minor scales', 1),
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Chord Construction', 'Build chords from theory principles', 2),
('7c431121-de7e-4742-ac60-46b0e414ad5a', 'Harmony and Progressions', 'Create beautiful chord progressions', 3);

-- Modern Music Production with DAWs (4491e347-499a-4cea-a83a-729feb6357e0)
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('4491e347-499a-4cea-a83a-729feb6357e0', 'DAW Setup and Interface', 'Get started with your digital audio workstation', 0),
('4491e347-499a-4cea-a83a-729feb6357e0', 'Recording and Editing', 'Learn professional recording techniques', 1),
('4491e347-499a-4cea-a83a-729feb6357e0', 'Mixing Fundamentals', 'Balance and polish your tracks', 2),
('4491e347-499a-4cea-a83a-729feb6357e0', 'Mastering Your Music', 'Final touches for professional sound', 3);

-- Worship Leading Masterclass (d9385d21-c424-4a4e-8b10-018cd27c2164)
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Worship Leading Essentials', 'Core principles of effective worship leading', 0),
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Building Your Setlist', 'Create engaging worship experiences', 1),
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Leading the Team', 'Communication and team dynamics', 2),
('d9385d21-c424-4a4e-8b10-018cd27c2164', 'Practical Applications', 'Real-world worship leading scenarios', 3);

-- Songwriting: From Idea to Hit (851f9ac2-ecf3-48fc-8520-f80048537319)
INSERT INTO lesson_modules (lesson_id, title, description, order_index) VALUES
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Finding Your Inspiration', 'Develop your creative songwriting process', 0),
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Melody and Lyrics', 'Craft memorable melodies and meaningful lyrics', 1),
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Song Structure and Arrangement', 'Build effective song structures', 2),
('851f9ac2-ecf3-48fc-8520-f80048537319', 'Finishing and Refining', 'Polish your songs to perfection', 3);

-- Now add video content for each module (sample data - 3 videos per first module as example)
-- Guitar Basics modules
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Introduction to Guitar Anatomy', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 15, true, 0
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Proper Posture and Hand Position', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Tuning Your Guitar', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 12, false, 2
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'The G Major Chord', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 20, true, 0
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'The C Major Chord', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'The D Major Chord', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, false, 2
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Chord Transitions Practice', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, false, 3
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Basic Down Strums', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 16, false, 0
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 2;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Down-Up Strumming Pattern', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 2;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Rhythm Exercises', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 20, false, 2
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 2;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Learning "Knockin on Heavens Door"', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 30, false, 0
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 3;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Playing Along with Backing Track', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'e35703f1-44fb-4e4c-a3b7-1c6e07088bd3' AND m.order_index = 3;

-- Jazz Piano modules
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Introduction to Jazz Harmony', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, true, 0
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Extended Chords Explained', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 28, false, 1
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'The ii-V-I Progression', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 26, false, 2
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Shell Voicings', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 24, true, 0
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Rootless Voicings', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 27, false, 1
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Drop 2 Voicings', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 29, false, 2
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 1;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Jazz Scales for Improvisation', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 32, false, 0
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 2;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Creating Melodic Lines', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 30, false, 1
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 2;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Practicing with Play-Along Tracks', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 28, false, 2
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 2;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Autumn Leaves Tutorial', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 35, false, 0
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 3;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Blue Bossa Walkthrough', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 33, false, 1
FROM lesson_modules m WHERE m.lesson_id = '298d9b9e-3999-4c09-a1b0-c72a687decac' AND m.order_index = 3;

-- Continue with other lessons (Music Theory, Production, Worship, Songwriting)...
-- Adding representative content for remaining lessons

-- Music Theory Essentials
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'The Musical Staff', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 18, true, 0
FROM lesson_modules m WHERE m.lesson_id = '7c431121-de7e-4742-ac60-46b0e414ad5a' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Note Names and Values', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = '7c431121-de7e-4742-ac60-46b0e414ad5a' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Time Signatures Explained', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 20, false, 2
FROM lesson_modules m WHERE m.lesson_id = '7c431121-de7e-4742-ac60-46b0e414ad5a' AND m.order_index = 0;

-- Music Production
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Choosing Your DAW', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 20, true, 0
FROM lesson_modules m WHERE m.lesson_id = '4491e347-499a-4cea-a83a-729feb6357e0' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Interface Navigation', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 24, false, 1
FROM lesson_modules m WHERE m.lesson_id = '4491e347-499a-4cea-a83a-729feb6357e0' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Audio Settings and Optimization', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 2
FROM lesson_modules m WHERE m.lesson_id = '4491e347-499a-4cea-a83a-729feb6357e0' AND m.order_index = 0;

-- Worship Leading
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Heart of a Worship Leader', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 25, true, 0
FROM lesson_modules m WHERE m.lesson_id = 'd9385d21-c424-4a4e-8b10-018cd27c2164' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Spiritual Preparation', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = 'd9385d21-c424-4a4e-8b10-018cd27c2164' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Vocal Techniques for Leaders', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 28, false, 2
FROM lesson_modules m WHERE m.lesson_id = 'd9385d21-c424-4a4e-8b10-018cd27c2164' AND m.order_index = 0;

-- Songwriting
INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Where Ideas Come From', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 24, true, 0
FROM lesson_modules m WHERE m.lesson_id = '851f9ac2-ecf3-48fc-8520-f80048537319' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Developing Your Creative Routine', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 22, false, 1
FROM lesson_modules m WHERE m.lesson_id = '851f9ac2-ecf3-48fc-8520-f80048537319' AND m.order_index = 0;

INSERT INTO lesson_content (module_id, title, content_type, video_url, duration_minutes, is_preview, order_index)
SELECT m.id, 'Overcoming Writers Block', 'video', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 20, false, 2
FROM lesson_modules m WHERE m.lesson_id = '851f9ac2-ecf3-48fc-8520-f80048537319' AND m.order_index = 0;
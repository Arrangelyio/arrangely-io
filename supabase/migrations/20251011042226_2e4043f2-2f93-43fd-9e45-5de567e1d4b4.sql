-- Drop existing tables if any
DROP TABLE IF EXISTS public.user_tier_progress CASCADE;
DROP TABLE IF EXISTS public.tier_assessment_questions CASCADE;

-- Create tier assessment questions table
CREATE TABLE public.tier_assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  tier_level INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  media_url TEXT,
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user tier progress table
CREATE TABLE public.user_tier_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL,
  current_tier INTEGER NOT NULL DEFAULT 1,
  highest_tier_reached INTEGER NOT NULL DEFAULT 1,
  total_score INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_production BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, instrument, category, sub_category, current_tier, is_production)
);

-- Enable RLS
ALTER TABLE public.tier_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tier_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Questions are publicly viewable" ON public.tier_assessment_questions FOR SELECT USING (is_production = true);
CREATE POLICY "Only admins can manage questions" ON public.tier_assessment_questions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Users can view their own progress" ON public.user_tier_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own progress" ON public.user_tier_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.user_tier_progress FOR UPDATE USING (auth.uid() = user_id);

-- Insert questions for all 8 instruments (piano, guitar, vocals, drums, bass, violin, saxophone, trumpet)
-- Each with basic, intermediate, advanced categories and music-theory, technique sub-categories
INSERT INTO public.tier_assessment_questions (instrument, category, sub_category, tier_level, question_text, options, order_index) VALUES
('piano', 'basic', 'music-theory', 1, 'How many keys does a standard piano have?', '[{"id":"a","text":"76","isCorrect":false},{"id":"b","text":"88","isCorrect":true},{"id":"c","text":"61","isCorrect":false},{"id":"d","text":"98","isCorrect":false}]', 1),
('piano', 'basic', 'music-theory', 1, 'What does a sharp symbol do to a note?', '[{"id":"a","text":"Lowers it by half step","isCorrect":false},{"id":"b","text":"Raises it by half step","isCorrect":true},{"id":"c","text":"Makes it louder","isCorrect":false},{"id":"d","text":"Doubles its length","isCorrect":false}]', 2),
('piano', 'basic', 'music-theory', 1, 'Which notes make up a C major chord?', '[{"id":"a","text":"C - E - G","isCorrect":true},{"id":"b","text":"C - D - E","isCorrect":false},{"id":"c","text":"C - F - A","isCorrect":false},{"id":"d","text":"C - E - A","isCorrect":false}]', 3),
('piano', 'basic', 'technique', 1, 'What is the correct hand position for piano playing?', '[{"id":"a","text":"Flat fingers on keys","isCorrect":false},{"id":"b","text":"Curved fingers, relaxed wrists","isCorrect":true},{"id":"c","text":"Stiff fingers, locked wrists","isCorrect":false},{"id":"d","text":"Pointed fingers, high wrists","isCorrect":false}]', 1),
('piano', 'basic', 'technique', 1, 'What finger number is the thumb?', '[{"id":"a","text":"1","isCorrect":true},{"id":"b","text":"2","isCorrect":false},{"id":"c","text":"5","isCorrect":false},{"id":"d","text":"0","isCorrect":false}]', 2),
('piano', 'intermediate', 'music-theory', 2, 'What is a dominant 7th chord?', '[{"id":"a","text":"Major triad with minor 7th","isCorrect":true},{"id":"b","text":"Minor triad with major 7th","isCorrect":false},{"id":"c","text":"Major triad with major 7th","isCorrect":false},{"id":"d","text":"Diminished triad with minor 7th","isCorrect":false}]', 1),
('piano', 'intermediate', 'technique', 2, 'What is the proper pedaling technique for sustain?', '[{"id":"a","text":"Press before playing","isCorrect":false},{"id":"b","text":"Press after playing, lift and press again for changes","isCorrect":true},{"id":"c","text":"Hold down constantly","isCorrect":false},{"id":"d","text":"Never use pedal","isCorrect":false}]', 1),
('piano', 'advanced', 'music-theory', 3, 'What defines a Neapolitan 6th chord?', '[{"id":"a","text":"Lowered II chord in first inversion","isCorrect":true},{"id":"b","text":"Raised VI chord","isCorrect":false},{"id":"c","text":"Augmented II chord","isCorrect":false},{"id":"d","text":"Diminished VI chord","isCorrect":false}]', 1),
('piano', 'advanced', 'technique', 3, 'What is the Chopin technique for octave passages?', '[{"id":"a","text":"Using only fingers","isCorrect":false},{"id":"b","text":"Rotating wrist motion with relaxed fingers","isCorrect":true},{"id":"c","text":"Stiff arm movement","isCorrect":false},{"id":"d","text":"Elbow-only motion","isCorrect":false}]', 1),
('guitar', 'basic', 'music-theory', 1, 'How many strings does a standard guitar have?', '[{"id":"a","text":"4","isCorrect":false},{"id":"b","text":"6","isCorrect":true},{"id":"c","text":"8","isCorrect":false},{"id":"d","text":"12","isCorrect":false}]', 1),
('guitar', 'basic', 'music-theory', 1, 'What are the notes of the open strings from lowest to highest?', '[{"id":"a","text":"E A D G B E","isCorrect":true},{"id":"b","text":"E B G D A E","isCorrect":false},{"id":"c","text":"A D G C E A","isCorrect":false},{"id":"d","text":"G D A E B E","isCorrect":false}]', 2),
('guitar', 'basic', 'music-theory', 1, 'What is a capo used for?', '[{"id":"a","text":"To tune the guitar","isCorrect":false},{"id":"b","text":"To change the key without changing fingerings","isCorrect":true},{"id":"c","text":"To amplify sound","isCorrect":false},{"id":"d","text":"To protect the fretboard","isCorrect":false}]', 3),
('guitar', 'basic', 'technique', 1, 'What is the proper thumb position on the back of the neck?', '[{"id":"a","text":"At the top of the neck","isCorrect":false},{"id":"b","text":"Behind the middle finger, roughly centered","isCorrect":true},{"id":"c","text":"Wrapped over the top","isCorrect":false},{"id":"d","text":"At the bottom of the neck","isCorrect":false}]', 1),
('guitar', 'basic', 'technique', 1, 'What is the technique of playing one string at a time called?', '[{"id":"a","text":"Strumming","isCorrect":false},{"id":"b","text":"Picking","isCorrect":true},{"id":"c","text":"Plucking","isCorrect":false},{"id":"d","text":"Hammering","isCorrect":false}]', 2),
('guitar', 'intermediate', 'music-theory', 2, 'What is a barre chord?', '[{"id":"a","text":"Chord using one finger across multiple strings","isCorrect":true},{"id":"b","text":"Chord with open strings only","isCorrect":false},{"id":"c","text":"Chord played one note at a time","isCorrect":false},{"id":"d","text":"Chord without using thumb","isCorrect":false}]', 1),
('guitar', 'intermediate', 'technique', 2, 'What is alternate picking?', '[{"id":"a","text":"Down strokes only","isCorrect":false},{"id":"b","text":"Alternating down and up strokes","isCorrect":true},{"id":"c","text":"Random picking pattern","isCorrect":false},{"id":"d","text":"Using two picks","isCorrect":false}]', 1),
('guitar', 'advanced', 'music-theory', 3, 'What defines modal interchange in guitar playing?', '[{"id":"a","text":"Borrowing chords from parallel modes","isCorrect":true},{"id":"b","text":"Playing in one mode only","isCorrect":false},{"id":"c","text":"Changing tuning mid-song","isCorrect":false},{"id":"d","text":"Using only major scales","isCorrect":false}]', 1),
('guitar', 'advanced', 'technique', 3, 'What is sweep picking?', '[{"id":"a","text":"Cleaning the guitar","isCorrect":false},{"id":"b","text":"Fluid motion across strings in one direction per string","isCorrect":true},{"id":"c","text":"Very fast alternate picking","isCorrect":false},{"id":"d","text":"Using a brush instead of pick","isCorrect":false}]', 1),
('vocals', 'basic', 'music-theory', 1, 'What is your vocal range?', '[{"id":"a","text":"The notes you can sing from lowest to highest","isCorrect":true},{"id":"b","text":"How loud you can sing","isCorrect":false},{"id":"c","text":"How long you can hold a note","isCorrect":false},{"id":"d","text":"The number of songs you know","isCorrect":false}]', 1),
('vocals', 'basic', 'music-theory', 1, 'What does pitch refer to in singing?', '[{"id":"a","text":"Volume of the voice","isCorrect":false},{"id":"b","text":"How high or low a note is","isCorrect":true},{"id":"c","text":"Speed of singing","isCorrect":false},{"id":"d","text":"Tone quality","isCorrect":false}]', 2),
('vocals', 'basic', 'technique', 1, 'What is the diaphragm used for in singing?', '[{"id":"a","text":"Controlling pitch","isCorrect":false},{"id":"b","text":"Breathing support and control","isCorrect":true},{"id":"c","text":"Creating vibrato","isCorrect":false},{"id":"d","text":"Increasing volume only","isCorrect":false}]', 1),
('vocals', 'basic', 'technique', 1, 'What is proper posture for singing?', '[{"id":"a","text":"Slouched and relaxed","isCorrect":false},{"id":"b","text":"Standing straight with relaxed shoulders","isCorrect":true},{"id":"c","text":"Leaning forward","isCorrect":false},{"id":"d","text":"Tilting head back","isCorrect":false}]', 2),
('vocals', 'intermediate', 'music-theory', 2, 'What is a melisma in singing?', '[{"id":"a","text":"Singing multiple notes on one syllable","isCorrect":true},{"id":"b","text":"Singing one note per syllable","isCorrect":false},{"id":"c","text":"Singing without words","isCorrect":false},{"id":"d","text":"Humming technique","isCorrect":false}]', 1),
('vocals', 'intermediate', 'technique', 2, 'What is mixed voice?', '[{"id":"a","text":"Singing with another person","isCorrect":false},{"id":"b","text":"Blending chest and head voice registers","isCorrect":true},{"id":"c","text":"Singing different songs simultaneously","isCorrect":false},{"id":"d","text":"Using microphone effects","isCorrect":false}]', 1),
('vocals', 'advanced', 'music-theory', 3, 'What is the passaggio in vocal technique?', '[{"id":"a","text":"The transition zone between vocal registers","isCorrect":true},{"id":"b","text":"A type of ornament","isCorrect":false},{"id":"c","text":"The highest note you can sing","isCorrect":false},{"id":"d","text":"A breathing technique","isCorrect":false}]', 1),
('vocals', 'advanced', 'technique', 3, 'What is belting in singing?', '[{"id":"a","text":"Shouting loudly","isCorrect":false},{"id":"b","text":"Carrying chest voice into higher range with power","isCorrect":true},{"id":"c","text":"Singing very softly","isCorrect":false},{"id":"d","text":"Using falsetto only","isCorrect":false}]', 1),
('drums', 'basic', 'music-theory', 1, 'What are the basic components of a drum kit?', '[{"id":"a","text":"Kick, snare, hi-hat, toms, cymbals","isCorrect":true},{"id":"b","text":"Only kick and snare","isCorrect":false},{"id":"c","text":"Just cymbals","isCorrect":false},{"id":"d","text":"Toms only","isCorrect":false}]', 1),
('drums', 'basic', 'music-theory', 1, 'What does 4/4 time mean?', '[{"id":"a","text":"4 beats per measure, quarter note gets the beat","isCorrect":true},{"id":"b","text":"4 measures per song","isCorrect":false},{"id":"c","text":"Play 4 times faster","isCorrect":false},{"id":"d","text":"4 drums in the kit","isCorrect":false}]', 2),
('drums', 'basic', 'technique', 1, 'How should you hold drum sticks?', '[{"id":"a","text":"Tight grip at the end","isCorrect":false},{"id":"b","text":"Relaxed grip at the balance point","isCorrect":true},{"id":"c","text":"In the middle only","isCorrect":false},{"id":"d","text":"With both hands the same way","isCorrect":false}]', 1),
('drums', 'basic', 'technique', 1, 'What is a basic rock beat pattern?', '[{"id":"a","text":"Kick on 1&3, snare on 2&4, hi-hat on all beats","isCorrect":true},{"id":"b","text":"All instruments hit together","isCorrect":false},{"id":"c","text":"Random hitting","isCorrect":false},{"id":"d","text":"Only kick drum","isCorrect":false}]', 2),
('drums', 'intermediate', 'music-theory', 2, 'What is syncopation in drumming?', '[{"id":"a","text":"Playing on strong beats only","isCorrect":false},{"id":"b","text":"Emphasizing off-beats or weak beats","isCorrect":true},{"id":"c","text":"Playing very fast","isCorrect":false},{"id":"d","text":"Using only cymbals","isCorrect":false}]', 1),
('drums', 'intermediate', 'technique', 2, 'What is a paradiddle?', '[{"id":"a","text":"A cymbal technique","isCorrect":false},{"id":"b","text":"A sticking pattern: RLRR LRLL","isCorrect":true},{"id":"c","text":"A type of drum","isCorrect":false},{"id":"d","text":"A foot technique","isCorrect":false}]', 1),
('drums', 'advanced', 'music-theory', 3, 'What is polyrhythm in drumming?', '[{"id":"a","text":"Playing very loud","isCorrect":false},{"id":"b","text":"Playing multiple contrasting rhythms simultaneously","isCorrect":true},{"id":"c","text":"Using multiple drum kits","isCorrect":false},{"id":"d","text":"Playing only one rhythm","isCorrect":false}]', 1),
('drums', 'advanced', 'technique', 3, 'What is a Moeller technique?', '[{"id":"a","text":"A type of cymbal crash","isCorrect":false},{"id":"b","text":"A whipping motion using wrist and forearm rotation","isCorrect":true},{"id":"c","text":"A bass drum technique","isCorrect":false},{"id":"d","text":"A tuning method","isCorrect":false}]', 1),
('bass', 'basic', 'music-theory', 1, 'How many strings does a standard bass guitar have?', '[{"id":"a","text":"4","isCorrect":true},{"id":"b","text":"5","isCorrect":false},{"id":"c","text":"6","isCorrect":false},{"id":"d","text":"8","isCorrect":false}]', 1),
('bass', 'basic', 'music-theory', 1, 'What is the primary role of the bass in a band?', '[{"id":"a","text":"Playing melody","isCorrect":false},{"id":"b","text":"Providing rhythm and harmonic foundation","isCorrect":true},{"id":"c","text":"Playing solos","isCorrect":false},{"id":"d","text":"Setting the tempo only","isCorrect":false}]', 2),
('bass', 'basic', 'technique', 1, 'What is the plucking technique in bass playing?', '[{"id":"a","text":"Using fingers to pull strings","isCorrect":true},{"id":"b","text":"Using a bow","isCorrect":false},{"id":"c","text":"Hitting strings with stick","isCorrect":false},{"id":"d","text":"Sliding fingers only","isCorrect":false}]', 1),
('bass', 'intermediate', 'music-theory', 2, 'What is a walking bass line?', '[{"id":"a","text":"Playing while walking","isCorrect":false},{"id":"b","text":"A bass line that moves stepwise through chord changes","isCorrect":true},{"id":"c","text":"Very slow bass playing","isCorrect":false},{"id":"d","text":"Using only open strings","isCorrect":false}]', 1),
('bass', 'intermediate', 'technique', 2, 'What is slap bass technique?', '[{"id":"a","text":"Hitting the bass body","isCorrect":false},{"id":"b","text":"Using thumb to strike strings percussively","isCorrect":true},{"id":"c","text":"Tapping on fretboard","isCorrect":false},{"id":"d","text":"Using a pick aggressively","isCorrect":false}]', 1),
('bass', 'advanced', 'music-theory', 3, 'What is the concept of pocket in bass playing?', '[{"id":"a","text":"Where you store picks","isCorrect":false},{"id":"b","text":"The rhythmic feel and groove between bass and drums","isCorrect":true},{"id":"c","text":"A specific scale pattern","isCorrect":false},{"id":"d","text":"Playing very quietly","isCorrect":false}]', 1),
('bass', 'advanced', 'technique', 3, 'What is double thumbing technique?', '[{"id":"a","text":"Using two picks","isCorrect":false},{"id":"b","text":"Using thumb for both up and down strokes","isCorrect":true},{"id":"c","text":"Playing with two hands on neck","isCorrect":false},{"id":"d","text":"Tapping with thumbs","isCorrect":false}]', 1),
('violin', 'basic', 'music-theory', 1, 'How many strings does a violin have?', '[{"id":"a","text":"4","isCorrect":true},{"id":"b","text":"5","isCorrect":false},{"id":"c","text":"6","isCorrect":false},{"id":"d","text":"3","isCorrect":false}]', 1),
('violin', 'basic', 'music-theory', 1, 'What are the violin strings tuned to?', '[{"id":"a","text":"G D A E","isCorrect":true},{"id":"b","text":"E A D G","isCorrect":false},{"id":"c","text":"C G D A","isCorrect":false},{"id":"d","text":"A E B F#","isCorrect":false}]', 2),
('violin', 'basic', 'technique', 1, 'What is the bow made of traditionally?', '[{"id":"a","text":"Plastic","isCorrect":false},{"id":"b","text":"Wood and horsehair","isCorrect":true},{"id":"c","text":"Metal wires","isCorrect":false},{"id":"d","text":"Rubber","isCorrect":false}]', 1),
('violin', 'intermediate', 'music-theory', 2, 'What is vibrato on violin?', '[{"id":"a","text":"Shaking the bow","isCorrect":false},{"id":"b","text":"Oscillating pitch by rocking finger on string","isCorrect":true},{"id":"c","text":"Playing very fast notes","isCorrect":false},{"id":"d","text":"Using two bows","isCorrect":false}]', 1),
('violin', 'intermediate', 'technique', 2, 'What is spiccato bowing?', '[{"id":"a","text":"Bouncing the bow off the string","isCorrect":true},{"id":"b","text":"Dragging the bow slowly","isCorrect":false},{"id":"c","text":"Using bow backwards","isCorrect":false},{"id":"d","text":"Playing without bow","isCorrect":false}]', 1),
('violin', 'advanced', 'music-theory', 3, 'What are harmonics on violin?', '[{"id":"a","text":"Very loud notes","isCorrect":false},{"id":"b","text":"Overtones produced by lightly touching string at node points","isCorrect":true},{"id":"c","text":"Playing two strings simultaneously","isCorrect":false},{"id":"d","text":"Using mute on bridge","isCorrect":false}]', 1),
('violin', 'advanced', 'technique', 3, 'What is ricochet bowing?', '[{"id":"a","text":"Throwing the bow","isCorrect":false},{"id":"b","text":"Allowing bow to bounce rapidly on one impulse","isCorrect":true},{"id":"c","text":"Playing backwards","isCorrect":false},{"id":"d","text":"Using two bows alternately","isCorrect":false}]', 1),
('saxophone', 'basic', 'music-theory', 1, 'What family of instruments does the saxophone belong to?', '[{"id":"a","text":"Brass","isCorrect":false},{"id":"b","text":"Woodwind","isCorrect":true},{"id":"c","text":"Percussion","isCorrect":false},{"id":"d","text":"String","isCorrect":false}]', 1),
('saxophone', 'basic', 'music-theory', 1, 'What is the most common type of saxophone for beginners?', '[{"id":"a","text":"Soprano","isCorrect":false},{"id":"b","text":"Alto","isCorrect":true},{"id":"c","text":"Tenor","isCorrect":false},{"id":"d","text":"Baritone","isCorrect":false}]', 2),
('saxophone', 'basic', 'technique', 1, 'What is the mouthpiece reed attached to?', '[{"id":"a","text":"The bell","isCorrect":false},{"id":"b","text":"The mouthpiece with a ligature","isCorrect":true},{"id":"c","text":"The neck","isCorrect":false},{"id":"d","text":"The keys","isCorrect":false}]', 1),
('saxophone', 'intermediate', 'music-theory', 2, 'What is altissimo register on saxophone?', '[{"id":"a","text":"The lowest notes","isCorrect":false},{"id":"b","text":"Notes above the normal range using overtones","isCorrect":true},{"id":"c","text":"Medium range notes","isCorrect":false},{"id":"d","text":"Only available on alto sax","isCorrect":false}]', 1),
('saxophone', 'intermediate', 'technique', 2, 'What is tongue slapping technique?', '[{"id":"a","text":"Slapping the mouthpiece","isCorrect":false},{"id":"b","text":"Creating percussive sound by slapping tongue on reed","isCorrect":true},{"id":"c","text":"Playing very staccato","isCorrect":false},{"id":"d","text":"Using double reed","isCorrect":false}]', 1),
('saxophone', 'advanced', 'music-theory', 3, 'What is circular breathing?', '[{"id":"a","text":"Breathing in circles","isCorrect":false},{"id":"b","text":"Maintaining continuous sound by breathing through nose while pushing air from cheeks","isCorrect":true},{"id":"c","text":"Taking very deep breaths","isCorrect":false},{"id":"d","text":"Breathing technique for cardio","isCorrect":false}]', 1),
('saxophone', 'advanced', 'technique', 3, 'What is growling on saxophone?', '[{"id":"a","text":"Making the instrument sound angry","isCorrect":false},{"id":"b","text":"Humming or singing while playing to create rough texture","isCorrect":true},{"id":"c","text":"Playing very low notes","isCorrect":false},{"id":"d","text":"Using damaged reed","isCorrect":false}]', 1),
('trumpet', 'basic', 'music-theory', 1, 'How many valves does a standard trumpet have?', '[{"id":"a","text":"2","isCorrect":false},{"id":"b","text":"3","isCorrect":true},{"id":"c","text":"4","isCorrect":false},{"id":"d","text":"5","isCorrect":false}]', 1),
('trumpet', 'basic', 'music-theory', 1, 'What is the trumpet made of?', '[{"id":"a","text":"Wood","isCorrect":false},{"id":"b","text":"Brass","isCorrect":true},{"id":"c","text":"Plastic","isCorrect":false},{"id":"d","text":"Silver only","isCorrect":false}]', 2),
('trumpet', 'basic', 'technique', 1, 'What is the embouchure in trumpet playing?', '[{"id":"a","text":"The finger position","isCorrect":false},{"id":"b","text":"The way lips are positioned on the mouthpiece","isCorrect":true},{"id":"c","text":"The breathing technique","isCorrect":false},{"id":"d","text":"The standing posture","isCorrect":false}]', 1),
('trumpet', 'intermediate', 'music-theory', 2, 'What is a mute used for on trumpet?', '[{"id":"a","text":"Making the trumpet quieter only","isCorrect":false},{"id":"b","text":"Changing tone color and volume","isCorrect":true},{"id":"c","text":"Cleaning the bell","isCorrect":false},{"id":"d","text":"Protecting the instrument","isCorrect":false}]', 1),
('trumpet', 'intermediate', 'technique', 2, 'What is lip slur on trumpet?', '[{"id":"a","text":"Sloppy playing","isCorrect":false},{"id":"b","text":"Changing pitch using embouchure without valves","isCorrect":true},{"id":"c","text":"Playing while drinking","isCorrect":false},{"id":"d","text":"Rapid valve technique","isCorrect":false}]', 1),
('trumpet', 'advanced', 'music-theory', 3, 'What is double tonguing?', '[{"id":"a","text":"Playing two notes at once","isCorrect":false},{"id":"b","text":"Rapid articulation using syllables","isCorrect":true},{"id":"c","text":"Speaking while playing","isCorrect":false},{"id":"d","text":"Using two mouthpieces","isCorrect":false}]', 1),
('trumpet', 'advanced', 'technique', 3, 'What is pedal tone on trumpet?', '[{"id":"a","text":"Playing with foot pedals","isCorrect":false},{"id":"b","text":"Notes below the normal range","isCorrect":true},{"id":"c","text":"Playing standing on one foot","isCorrect":false},{"id":"d","text":"Very high notes","isCorrect":false}]', 1);

-- Create indexes
CREATE INDEX idx_tier_questions_instrument ON public.tier_assessment_questions(instrument, category, tier_level);
CREATE INDEX idx_user_progress_user ON public.user_tier_progress(user_id, instrument, category);
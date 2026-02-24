-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Chat Session',
  is_escalated BOOLEAN NOT NULL DEFAULT false,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'user' CHECK (message_type IN ('user', 'bot', 'admin')),
  is_predefined BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Create predefined responses table
CREATE TABLE public.predefined_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_keywords TEXT[] NOT NULL,
  response_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predefined_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = admin_id);

CREATE POLICY "Users can create their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = admin_id);

CREATE POLICY "Admins can view all conversations" 
ON public.conversations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR admin_id = auth.uid())
  )
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND (user_id = auth.uid() OR admin_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all messages" 
ON public.messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for predefined responses
CREATE POLICY "Predefined responses are viewable by all authenticated users" 
ON public.predefined_responses 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage predefined responses" 
ON public.predefined_responses 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Insert predefined responses about Arrangely features
INSERT INTO public.predefined_responses (trigger_keywords, response_text, category, priority) VALUES
(ARRAY['hello', 'hi', 'hey', 'start'], 'Hello! Welcome to Arrangely support. I''m here to help you with creating song arrangements, managing your library, and using our features. How can I assist you today?', 'greeting', 1),
(ARRAY['arrangement', 'create', 'new', 'song'], 'To create a new arrangement in Arrangely: 1) Go to your Library, 2) Click "New Arrangement", 3) Add song details (title, artist, key), 4) Add sections like verse, chorus, bridge, 5) Input chords and lyrics for each section. You can transpose, export to PDF, and collaborate with others!', 'arrangements', 1),
(ARRAY['transpose', 'key', 'change'], 'Arrangely makes transposing easy! Open any arrangement and click the "Transpose" button. You can change to any key instantly, and all chords will automatically update. This is perfect for matching different singers or instruments!', 'transpose', 1),
(ARRAY['collaborate', 'share', 'team'], 'Arrangely supports real-time collaboration! You can invite team members to view or edit your arrangements. They''ll see changes instantly, making it perfect for worship teams, bands, and music groups working together.', 'collaboration', 1),
(ARRAY['export', 'pdf', 'print'], 'You can export your arrangements as professional PDFs! Click the export button in any arrangement to generate a clean, printable chord chart. Great for sharing with musicians or using on stage.', 'export', 1),
(ARRAY['youtube', 'import', 'analyze'], 'Arrangely can analyze YouTube videos to help create arrangements! Paste a YouTube URL and our AI will detect chords, suggest sections, and even extract lyrics. It''s a great starting point for creating arrangements.', 'youtube', 1),
(ARRAY['library', 'organize', 'folder'], 'Organize your arrangements with folders and tags! Create folders for different occasions (Sunday service, special events), add tags for easy searching, and mark favorites for quick access.', 'library', 1),
(ARRAY['setlist', 'planning', 'performance'], 'Use Arrangely''s setlist planner to organize your performances! Create setlists, arrange song order, add notes, and even use our live preview mode for seamless transitions during performances.', 'setlist', 1),
(ARRAY['pricing', 'subscription', 'plan'], 'Arrangely offers flexible pricing plans. Start with our free tier to try basic features, or upgrade to Premium for unlimited arrangements, advanced collaboration, PDF exports, and YouTube analysis. Check our pricing page for current rates!', 'pricing', 1),
(ARRAY['help', 'support', 'problem'], 'I''m here to help! You can ask me about creating arrangements, using features, collaboration, or any other questions about Arrangely. If you need more detailed assistance, you can escalate this chat to our admin team.', 'support', 1),
(ARRAY['chord', 'progression', 'music'], 'Arrangely supports all common chord types! Use standard notation (C, Am, F, G) or jazz chords (Cmaj7, Dm9, etc.). Our chord suggestion feature can help you find progressions that work well together.', 'chords', 1),
(ARRAY['mobile', 'phone', 'tablet'], 'Arrangely works great on mobile devices! The responsive design adapts to phones and tablets, so you can create and view arrangements anywhere. Perfect for on-the-go music preparation.', 'mobile', 1);
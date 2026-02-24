-- RLS Policies for Staging Environment
-- Run this after creating the tables

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Songs policies
CREATE POLICY "Users can create their own songs" 
ON public.songs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own creator_discount_benefits" 
ON public.creator_discount_benefits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own songs" 
ON public.songs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public songs" 
ON public.songs 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view songs they collaborate on" 
ON public.songs 
FOR SELECT 
USING (user_can_access_song(id, auth.uid()));

CREATE POLICY "Allow live preview access for all users" 
ON public.songs 
FOR SELECT 
USING (is_live_preview_context() = true);

CREATE POLICY "Users can update their own songs" 
ON public.songs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Song collaborators with edit permission can update songs" 
ON public.songs 
FOR UPDATE 
USING (user_can_edit_song(id, auth.uid()));

CREATE POLICY "Users can delete their own songs" 
ON public.songs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Song sections policies
CREATE POLICY "Users can create sections for their songs" 
ON public.song_sections 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_sections.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Users can view sections of their songs" 
ON public.song_sections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_sections.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Users can view sections of public songs" 
ON public.song_sections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_sections.song_id AND songs.is_public = true
));

CREATE POLICY "Users can view sections of collaborative songs" 
ON public.song_sections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM (song_collaborators sc JOIN songs s ON sc.song_id = s.id)
  WHERE s.id = sc.song_id AND sc.user_id = auth.uid()
));

CREATE POLICY "Allow live preview access to sections" 
ON public.song_sections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_sections.song_id AND is_live_preview_context() = true
));

CREATE POLICY "Users can update sections of their songs" 
ON public.song_sections 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_sections.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Song collaborators can update sections" 
ON public.song_sections 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM (song_collaborators sc JOIN songs s ON sc.song_id = s.id)
  WHERE s.id = sc.song_id AND sc.user_id = auth.uid() AND sc.permission IN ('edit', 'admin')
));

CREATE POLICY "Users can delete sections of their songs" 
ON public.song_sections 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_sections.song_id AND songs.user_id = auth.uid()
));

-- Arrangements policies
CREATE POLICY "Users can create arrangements for their songs" 
ON public.arrangements 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = arrangements.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Users can view arrangements of their songs" 
ON public.arrangements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = arrangements.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Users can view arrangements of public songs" 
ON public.arrangements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = arrangements.song_id AND songs.is_public = true
));

CREATE POLICY "Users can view arrangements of collaborative songs" 
ON public.arrangements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM (song_collaborators sc JOIN songs s ON sc.song_id = s.id)
  WHERE s.id = sc.song_id AND sc.user_id = auth.uid()
));

CREATE POLICY "Allow live preview access to arrangements" 
ON public.arrangements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = arrangements.song_id AND is_live_preview_context() = true
));

CREATE POLICY "Users can update arrangements of their songs" 
ON public.arrangements 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = arrangements.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Song collaborators can update arrangements" 
ON public.arrangements 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM (song_collaborators sc JOIN songs s ON sc.song_id = s.id)
  WHERE s.id = sc.song_id AND sc.user_id = auth.uid() AND sc.permission IN ('edit', 'admin')
));

CREATE POLICY "Users can delete arrangements of their songs" 
ON public.arrangements 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = arrangements.song_id AND songs.user_id = auth.uid()
));

-- Song collaborators policies
CREATE POLICY "Song owners can manage collaborators" 
ON public.song_collaborators 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.songs 
  WHERE songs.id = song_collaborators.song_id AND songs.user_id = auth.uid()
));

CREATE POLICY "Users can view their collaborations" 
ON public.song_collaborators 
FOR SELECT 
USING (user_id = auth.uid());

-- Setlists policies
CREATE POLICY "Users can create their own setlists" 
ON public.setlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own setlists" 
ON public.setlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own setlists" 
ON public.setlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own setlists" 
ON public.setlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Song folders policies
CREATE POLICY "Users can create their own folders" 
ON public.song_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own folders" 
ON public.song_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.song_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.song_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Song activity policies
CREATE POLICY "Users can create their own activity" 
ON public.song_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity" 
ON public.song_activity 
FOR SELECT 
USING (auth.uid() = user_id);

-- Song likes policies
CREATE POLICY "Users can view their own likes" 
ON public.song_likes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own likes" 
ON public.song_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" 
ON public.song_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- User follows policies
CREATE POLICY "Users can view their own follows" 
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id);

CREATE POLICY "Users can create their own follows" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Subscription plans policies
CREATE POLICY "Subscription plans are publicly viewable" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Subscriptions policies
CREATE POLICY "Users can create their own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Payments policies
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage payments" 
ON public.payments 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Discount codes policies
CREATE POLICY "Active discount codes are publicly viewable" 
ON public.discount_codes 
FOR SELECT 
USING (is_active = true AND valid_until > now());

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" 
ON public.notifications 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Subscription cancellations policies
CREATE POLICY "Users can view their own cancellations" 
ON public.subscription_cancellations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cancellations" 
ON public.subscription_cancellations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Creator applications policies
CREATE POLICY "Users can create their own applications" 
ON public.creator_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications" 
ON public.creator_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" 
ON public.creator_applications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- PDF export usage policies
CREATE POLICY "Users can view their own export history" 
ON public.pdf_export_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can track their own exports" 
ON public.pdf_export_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- YouTube import usage policies
CREATE POLICY "Users can view their own YouTube import history" 
ON public.youtube_import_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can track their own YouTube imports" 
ON public.youtube_import_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Error logs policies
CREATE POLICY "Users can insert their own error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own error logs" 
ON public.error_logs 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can view all error logs" 
ON public.error_logs 
FOR ALL 
USING (current_setting('role') = 'service_role');
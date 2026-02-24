-- Create email-attachments storage bucket for bulk email image uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', true);

-- Create storage policies for email-attachments bucket
CREATE POLICY "Email attachments are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'email-attachments');

CREATE POLICY "Admins can upload email attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'email-attachments' 
  AND public.user_has_permission(auth.uid(), 'admin_access') = true
);

CREATE POLICY "Admins can update email attachments" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'email-attachments' 
  AND public.user_has_permission(auth.uid(), 'admin_access') = true
);

CREATE POLICY "Admins can delete email attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'email-attachments' 
  AND public.user_has_permission(auth.uid(), 'admin_access') = true
);

create or replace function get_unsubscribed_user_ids()
returns table(
  user_id uuid,
  email text
)
language sql
security definer
as $$
  select 
    u.id as user_id, 
    u.email as email
  from auth.users u
  where not exists (
    select 1 
    from public.subscriptions s
    where s.user_id = u.id
      and s.is_production = true
      and (
        (s.status = 'active' and (s.current_period_end is null or s.current_period_end > now()))
        or (s.is_trial = true and s.trial_end > now())
      )
  );
$$;

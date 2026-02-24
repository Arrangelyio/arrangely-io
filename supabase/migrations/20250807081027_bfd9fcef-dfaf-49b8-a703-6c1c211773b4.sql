-- Add user_original_id column to user_library_actions table
ALTER TABLE public.user_library_actions 
ADD COLUMN user_original_id uuid;

-- Enable Row Level Security on user_library_actions if not already enabled
ALTER TABLE public.user_library_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for creators to read their own library actions
CREATE POLICY "Creators can view library actions for their songs" 
ON public.user_library_actions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid()
      AND (
            (profiles.role = 'creator'::user_role 
             AND user_library_actions.user_original_id = auth.uid()
            )
         OR profiles.role = 'admin'::user_role
          )
)
);

-- Allow users to still manage their own library actions (existing functionality)
CREATE POLICY "Users can insert their own library actions" 
ON public.user_library_actions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own library actions" 
ON public.user_library_actions 
FOR DELETE 
USING (auth.uid() = user_id);
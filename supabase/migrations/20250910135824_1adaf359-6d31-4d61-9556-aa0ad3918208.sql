-- Create table for setlist annotations
CREATE TABLE public.setlist_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL,
  song_id UUID NOT NULL,
  user_id UUID NOT NULL,
  annotation_data JSONB NOT NULL, -- Store drawing paths and coordinates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_production BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.setlist_annotations ENABLE ROW LEVEL SECURITY;

-- Create policies for annotations
CREATE POLICY "Users can view annotations for setlists they can access"
ON public.setlist_annotations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_annotations.setlist_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create annotations for their setlists"
ON public.setlist_annotations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.setlists s
    WHERE s.id = setlist_annotations.setlist_id 
    AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own annotations"
ON public.setlist_annotations
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own annotations"
ON public.setlist_annotations
FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime for live broadcasting
ALTER TABLE public.setlist_annotations REPLICA IDENTITY FULL;
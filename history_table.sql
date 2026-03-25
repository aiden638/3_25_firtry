---
description: SQL snippet to create the history table in Supabase.
---

-- Create the history table
CREATE TABLE IF NOT EXISTS public.history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL,
    level TEXT NOT NULL,
    left_angle DOUBLE PRECISION,
    right_angle DOUBLE PRECISION,
    description TEXT,
    image_url TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own history" 
ON public.history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history" 
ON public.history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history" 
ON public.history FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history" 
ON public.history FOR DELETE 
USING (auth.uid() = user_id);

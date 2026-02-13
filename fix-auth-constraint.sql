-- Fix for foreign key constraint issue in messages table
-- This makes author_id nullable to bypass auth.users requirement during testing

-- First, drop the foreign key constraint
ALTER TABLE public.messages DROP CONSTRAINT messages_author_id_fkey;

-- Then make the column nullable
ALTER TABLE public.messages ALTER COLUMN author_id DROP NOT NULL;

-- Re-add the constraint as nullable (optional)
ALTER TABLE public.messages 
ADD CONSTRAINT messages_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Alternative: If you want to keep constraint but allow nulls
-- This will allow messages without valid authors (useful for testing/bOT messages)

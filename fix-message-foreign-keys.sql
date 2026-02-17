-- Fix message foreign key constraints after message_id column deletion
-- This migration removes the foreign key constraints that reference the deleted message_id column

-- STEP 1: Drop foreign key constraints from message_attachments table
ALTER TABLE public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;

-- STEP 2: Drop foreign key constraints from message_embeds table  
ALTER TABLE public.message_embeds DROP CONSTRAINT IF EXISTS message_embeds_message_id_fkey;

-- STEP 3: Drop foreign key constraints from message_reactions table
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;

-- STEP 4: Drop foreign key constraints from message_stickers table
ALTER TABLE public.message_stickers DROP CONSTRAINT IF EXISTS message_stickers_message_id_fkey;

-- STEP 5: Drop foreign key constraints from user_message_reactions table
ALTER TABLE public.user_message_reactions DROP CONSTRAINT IF EXISTS user_message_reactions_message_id_fkey;

-- Note: The message_attachments and message_embeds tables can still work without foreign key constraints
-- They will use their own id as the primary key and reference messages by application logic instead

-- Fix UUID columns to TEXT for message-related tables
-- This resolves "invalid input syntax for type uuid" errors

-- 1. Fix messages table - change message_id to text
ALTER TABLE public.messages 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 2. Fix message_attachments table - change message_id to text
ALTER TABLE public.message_attachments 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 3. Fix message_embeds table - change message_id to text
ALTER TABLE public.message_embeds 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 4. Fix message_reactions table - change message_id to text
ALTER TABLE public.message_reactions 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 5. Fix message_stickers table - change message_id to text
ALTER TABLE public.message_stickers 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 6. Fix user_message_reactions table - change message_reaction_id to text
ALTER TABLE public.user_message_reactions 
ALTER COLUMN message_reaction_id TYPE text USING message_reaction_id::text;

-- 7. Fix channels table - change last_message_id to text
ALTER TABLE public.channels 
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- 8. Fix direct_channels table - change last_message_id to text
ALTER TABLE public.direct_channels 
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- 9. Fix messages table - change message_reference_id to text
ALTER TABLE public.messages 
ALTER COLUMN message_reference_id TYPE text USING message_reference_id::text;

-- 10. Fix messages table - change webhook_id to text
ALTER TABLE public.messages 
ALTER COLUMN webhook_id TYPE text USING webhook_id::text;

-- Optional: If you want to keep some as UUID but allow text for Discord compatibility
-- You can create a hybrid approach with both id (UUID) and message_id (text)

-- Summary of changes:
-- - All message_id foreign keys are now TEXT (compatible with Discord string IDs)
-- - All message reference columns are now TEXT
-- - Foreign key constraints still work but with TEXT instead of UUID

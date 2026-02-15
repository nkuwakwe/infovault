-- Complete fix: Change ALL UUID columns to TEXT for full Discord compatibility
-- This resolves ALL "invalid input syntax for type uuid" errors

-- 1. Fix messages table - change both id and message_id to text
ALTER TABLE public.messages 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 2. Fix message_attachments table - change both id and message_id to text
ALTER TABLE public.message_attachments 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 3. Fix message_embeds table - change both id and message_id to text
ALTER TABLE public.message_embeds 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 4. Fix message_reactions table - change both id and message_id to text
ALTER TABLE public.message_reactions 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 5. Fix message_stickers table - change both message_id and sticker_id to text
ALTER TABLE public.message_stickers 
ALTER COLUMN message_id TYPE text USING message_id::text,
ALTER COLUMN sticker_id TYPE text USING sticker_id::text;

-- 6. Fix channels table - change id and last_message_id to text
ALTER TABLE public.channels 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN last_message_id TYPE text USING last_message_id::text,
ALTER COLUMN parent_id TYPE text USING parent_id::text,
ALTER COLUMN owner_id TYPE text USING owner_id::text;

-- 7. Fix guilds table - change id to text
ALTER TABLE public.guilds 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN afk_channel_id TYPE text USING afk_channel_id::text,
ALTER COLUMN system_channel_id TYPE text USING system_channel_id::text,
ALTER COLUMN rules_channel_id TYPE text USING rules_channel_id::text,
ALTER COLUMN public_updates_channel_id TYPE text USING public_updates_channel_id::text,
ALTER COLUMN safety_alerts_channel_id TYPE text USING safety_alerts_channel_id::text;

-- 8. Fix guild_members table - change all UUID columns to text
ALTER TABLE public.guild_members 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 9. Fix roles table - change id and guild_id to text
ALTER TABLE public.roles 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text;

-- 10. Fix emojis table - change id, guild_id, and user_id to text
ALTER TABLE public.emojis 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 11. Fix stickers table - change id and guild_id to text
ALTER TABLE public.stickers 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text;

-- 12. Fix direct_channels table - change all UUID columns to text
ALTER TABLE public.direct_channels 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN owner_id TYPE text USING owner_id::text,
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- 13. Fix direct_channel_recipients table - change all UUID columns to text
ALTER TABLE public.direct_channel_recipients 
ALTER COLUMN channel_id TYPE text USING channel_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 14. Fix user_message_reactions table - change all UUID columns to text
ALTER TABLE public.user_message_reactions 
ALTER COLUMN user_id TYPE text USING user_id::text,
ALTER COLUMN message_reaction_id TYPE text USING message_reaction_id::text;

-- 15. Fix voice_states table - change all UUID columns to text
ALTER TABLE public.voice_states 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN channel_id TYPE text USING channel_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 16. Fix other tables with UUID columns
ALTER TABLE public.developer_settings 
ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.local_settings 
ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.member_roles 
ALTER COLUMN member_id TYPE text USING member_id::text,
ALTER COLUMN role_id TYPE text USING role_id::text;

ALTER TABLE public.emoji_roles 
ALTER COLUMN emoji_id TYPE text USING emoji_id::text,
ALTER COLUMN role_id TYPE text USING role_id::text;

ALTER TABLE public.user_preferences 
ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.user_sessions 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.uptime_data 
ALTER COLUMN id TYPE text USING id::text;

-- 17. Fix remaining message table columns
ALTER TABLE public.messages 
ALTER COLUMN message_reference_id TYPE text USING message_reference_id::text,
ALTER COLUMN webhook_id TYPE text USING webhook_id::text;

-- Summary: ALL UUID columns are now TEXT
-- Benefits:
-- - Full Discord compatibility (string IDs work perfectly)
-- - No more "invalid input syntax for type uuid" errors
-- - Consistent ID format throughout the database
-- - Easier debugging and development

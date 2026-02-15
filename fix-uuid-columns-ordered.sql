-- Fix UUID columns to TEXT in correct order
-- Must change PRIMARY KEY columns first, then FOREIGN KEY columns

-- STEP 1: Change PRIMARY KEY columns first (id columns)

-- 1. Messages table - change primary key first
ALTER TABLE public.messages 
ALTER COLUMN id TYPE text USING id::text;

-- 2. Message attachments table
ALTER TABLE public.message_attachments 
ALTER COLUMN id TYPE text USING id::text;

-- 3. Message embeds table
ALTER TABLE public.message_embeds 
ALTER COLUMN id TYPE text USING id::text;

-- 4. Message reactions table
ALTER TABLE public.message_reactions 
ALTER COLUMN id TYPE text USING id::text;

-- 5. Channels table
ALTER TABLE public.channels 
ALTER COLUMN id TYPE text USING id::text;

-- 6. Guilds table
ALTER TABLE public.guilds 
ALTER COLUMN id TYPE text USING id::text;

-- 7. Guild members table
ALTER TABLE public.guild_members 
ALTER COLUMN id TYPE text USING id::text;

-- 8. Roles table
ALTER TABLE public.roles 
ALTER COLUMN id TYPE text USING id::text;

-- 9. Emojis table
ALTER TABLE public.emojis 
ALTER COLUMN id TYPE text USING id::text;

-- 10. Stickers table
ALTER TABLE public.stickers 
ALTER COLUMN id TYPE text USING id::text;

-- 11. Direct channels table
ALTER TABLE public.direct_channels 
ALTER COLUMN id TYPE text USING id::text;

-- 12. User sessions table
ALTER TABLE public.user_sessions 
ALTER COLUMN id TYPE text USING id::text;

-- 13. Voice states table
ALTER TABLE public.voice_states 
ALTER COLUMN id TYPE text USING id::text;

-- 14. Uptime data table
ALTER TABLE public.uptime_data 
ALTER COLUMN id TYPE text USING id::text;

-- STEP 2: Now change FOREIGN KEY columns

-- 15. Messages table - foreign keys
ALTER TABLE public.messages 
ALTER COLUMN message_id TYPE text USING message_id::text,
ALTER COLUMN message_reference_id TYPE text USING message_reference_id::text,
ALTER COLUMN webhook_id TYPE text USING webhook_id::text;

-- 16. Message attachments table - foreign keys
ALTER TABLE public.message_attachments 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 17. Message embeds table - foreign keys
ALTER TABLE public.message_embeds 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 18. Message reactions table - foreign keys
ALTER TABLE public.message_reactions 
ALTER COLUMN message_id TYPE text USING message_id::text;

-- 19. Message stickers table - foreign keys
ALTER TABLE public.message_stickers 
ALTER COLUMN message_id TYPE text USING message_id::text,
ALTER COLUMN sticker_id TYPE text USING sticker_id::text;

-- 20. Channels table - foreign keys
ALTER TABLE public.channels 
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN parent_id TYPE text USING parent_id::text,
ALTER COLUMN owner_id TYPE text USING owner_id::text,
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- 21. Guilds table - foreign keys
ALTER TABLE public.guilds 
ALTER COLUMN afk_channel_id TYPE text USING afk_channel_id::text,
ALTER COLUMN system_channel_id TYPE text USING system_channel_id::text,
ALTER COLUMN rules_channel_id TYPE text USING rules_channel_id::text,
ALTER COLUMN public_updates_channel_id TYPE text USING public_updates_channel_id::text,
ALTER COLUMN safety_alerts_channel_id TYPE text USING safety_alerts_channel_id::text;

-- 22. Guild members table - foreign keys
ALTER TABLE public.guild_members 
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 23. Roles table - foreign keys
ALTER TABLE public.roles 
ALTER COLUMN guild_id TYPE text USING guild_id::text;

-- 24. Emojis table - foreign keys
ALTER TABLE public.emojis 
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 25. Stickers table - foreign keys
ALTER TABLE public.stickers 
ALTER COLUMN guild_id TYPE text USING guild_id::text;

-- 26. Direct channels table - foreign keys
ALTER TABLE public.direct_channels 
ALTER COLUMN owner_id TYPE text USING owner_id::text,
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- 27. Direct channel recipients table - foreign keys
ALTER TABLE public.direct_channel_recipients 
ALTER COLUMN channel_id TYPE text USING channel_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 28. User message reactions table - foreign keys
ALTER TABLE public.user_message_reactions 
ALTER COLUMN user_id TYPE text USING user_id::text,
ALTER COLUMN message_reaction_id TYPE text USING message_reaction_id::text;

-- 29. Voice states table - foreign keys
ALTER TABLE public.voice_states 
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN channel_id TYPE text USING channel_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- 30. Other tables with user_id foreign keys
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
ALTER COLUMN user_id TYPE text USING user_id::text;

-- Summary: All UUID columns are now TEXT in correct order
-- This prevents foreign key constraint errors

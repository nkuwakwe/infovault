-- Fix UUID columns to TEXT by dropping constraints first
-- This approach avoids circular dependency issues

-- STEP 1: Drop all foreign key constraints that reference UUID columns

-- Drop message-related foreign key constraints
ALTER TABLE public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;
ALTER TABLE public.message_embeds DROP CONSTRAINT IF EXISTS message_embeds_message_id_fkey;
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;
ALTER TABLE public.message_stickers DROP CONSTRAINT IF EXISTS message_stickers_message_id_fkey;
ALTER TABLE public.message_stickers DROP CONSTRAINT IF EXISTS message_stickers_sticker_id_fkey;
ALTER TABLE public.user_message_reactions DROP CONSTRAINT IF EXISTS user_message_reactions_message_reaction_id_fkey;

-- Drop channel-related foreign key constraints
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_guild_id_fkey;
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_parent_id_fkey;
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_guild_id_fkey;
ALTER TABLE public.voice_states DROP CONSTRAINT IF EXISTS voice_states_channel_id_fkey;
ALTER TABLE public.voice_states DROP CONSTRAINT IF EXISTS voice_states_guild_id_fkey;

-- Drop guild-related foreign key constraints
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_guild_id_fkey;
ALTER TABLE public.guild_members DROP CONSTRAINT IF EXISTS guild_members_guild_id_fkey;
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_guild_id_fkey;
ALTER TABLE public.emojis DROP CONSTRAINT IF EXISTS emojis_guild_id_fkey;
ALTER TABLE public.stickers DROP CONSTRAINT IF EXISTS stickers_guild_id_fkey;

-- Drop user-related foreign key constraints
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_author_id_fkey;
ALTER TABLE public.guild_members DROP CONSTRAINT IF EXISTS guild_members_user_id_fkey;
ALTER TABLE public.emojis DROP CONSTRAINT IF EXISTS emojis_user_id_fkey;
ALTER TABLE public.developer_settings DROP CONSTRAINT IF EXISTS developer_settings_pkey;
ALTER TABLE public.local_settings DROP CONSTRAINT IF EXISTS local_settings_pkey;
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey;
ALTER TABLE public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE public.voice_states DROP CONSTRAINT IF EXISTS voice_states_user_id_fkey;
ALTER TABLE public.direct_channels DROP CONSTRAINT IF EXISTS direct_channels_owner_id_fkey;
ALTER TABLE public.direct_channel_recipients DROP CONSTRAINT IF EXISTS direct_channel_recipients_user_id_fkey;
ALTER TABLE public.user_message_reactions DROP CONSTRAINT IF EXISTS user_message_reactions_user_id_fkey;

-- Drop other foreign key constraints
ALTER TABLE public.member_roles DROP CONSTRAINT IF EXISTS member_roles_member_id_fkey;
ALTER TABLE public.member_roles DROP CONSTRAINT IF EXISTS member_roles_role_id_fkey;
ALTER TABLE public.emoji_roles DROP CONSTRAINT IF EXISTS emoji_roles_emoji_id_fkey;
ALTER TABLE public.emoji_roles DROP CONSTRAINT IF EXISTS emoji_roles_role_id_fkey;

-- STEP 2: Now change ALL UUID columns to TEXT (no constraints to worry about)

-- Messages table
ALTER TABLE public.messages 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text,
ALTER COLUMN message_reference_id TYPE text USING message_reference_id::text,
ALTER COLUMN webhook_id TYPE text USING webhook_id::text;

-- Message attachments table
ALTER TABLE public.message_attachments 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text;

-- Message embeds table
ALTER TABLE public.message_embeds 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text;

-- Message reactions table
ALTER TABLE public.message_reactions 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN message_id TYPE text USING message_id::text,
ALTER COLUMN emoji_id TYPE text USING emoji_id::text;

-- Message stickers table
ALTER TABLE public.message_stickers 
ALTER COLUMN message_id TYPE text USING message_id::text,
ALTER COLUMN sticker_id TYPE text USING sticker_id::text;

-- Channels table
ALTER TABLE public.channels 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN parent_id TYPE text USING parent_id::text,
ALTER COLUMN owner_id TYPE text USING owner_id::text,
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- Guilds table
ALTER TABLE public.guilds 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN afk_channel_id TYPE text USING afk_channel_id::text,
ALTER COLUMN system_channel_id TYPE text USING system_channel_id::text,
ALTER COLUMN rules_channel_id TYPE text USING rules_channel_id::text,
ALTER COLUMN public_updates_channel_id TYPE text USING public_updates_channel_id::text,
ALTER COLUMN safety_alerts_channel_id TYPE text USING safety_alerts_channel_id::text;

-- Guild members table
ALTER TABLE public.guild_members 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- Roles table
ALTER TABLE public.roles 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text;

-- Emojis table
ALTER TABLE public.emojis 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- Stickers table
ALTER TABLE public.stickers 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text;

-- Direct channels table
ALTER TABLE public.direct_channels 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN owner_id TYPE text USING owner_id::text,
ALTER COLUMN last_message_id TYPE text USING last_message_id::text;

-- Direct channel recipients table
ALTER TABLE public.direct_channel_recipients 
ALTER COLUMN channel_id TYPE text USING channel_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- User message reactions table
ALTER TABLE public.user_message_reactions 
ALTER COLUMN user_id TYPE text USING user_id::text,
ALTER COLUMN message_reaction_id TYPE text USING message_reaction_id::text;

-- Voice states table
ALTER TABLE public.voice_states 
ALTER COLUMN id TYPE text USING id::text,
ALTER COLUMN guild_id TYPE text USING guild_id::text,
ALTER COLUMN channel_id TYPE text USING channel_id::text,
ALTER COLUMN user_id TYPE text USING user_id::text;

-- Other tables
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

-- STEP 3: Re-add all foreign key constraints (now with TEXT columns)

-- Re-add message-related constraints
ALTER TABLE public.message_attachments 
ADD CONSTRAINT message_attachments_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id);

ALTER TABLE public.message_embeds 
ADD CONSTRAINT message_embeds_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id);

ALTER TABLE public.message_reactions 
ADD CONSTRAINT message_reactions_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id);

ALTER TABLE public.message_stickers 
ADD CONSTRAINT message_stickers_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.messages(id),
ADD CONSTRAINT message_stickers_sticker_id_fkey 
FOREIGN KEY (sticker_id) REFERENCES public.stickers(id);

ALTER TABLE public.user_message_reactions 
ADD CONSTRAINT user_message_reactions_message_reaction_id_fkey 
FOREIGN KEY (message_reaction_id) REFERENCES public.message_reactions(id);

-- Re-add channel-related constraints
ALTER TABLE public.messages 
ADD CONSTRAINT messages_channel_id_fkey 
FOREIGN KEY (channel_id) REFERENCES public.channels(channel_id),
ADD CONSTRAINT messages_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

ALTER TABLE public.channels 
ADD CONSTRAINT channels_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.channels(id),
ADD CONSTRAINT channels_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

ALTER TABLE public.voice_states 
ADD CONSTRAINT voice_states_channel_id_fkey 
FOREIGN KEY (channel_id) REFERENCES public.channels(id),
ADD CONSTRAINT voice_states_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

-- Re-add guild-related constraints
ALTER TABLE public.guild_members 
ADD CONSTRAINT guild_members_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

ALTER TABLE public.roles 
ADD CONSTRAINT roles_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

ALTER TABLE public.emojis 
ADD CONSTRAINT emojis_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

ALTER TABLE public.stickers 
ADD CONSTRAINT stickers_guild_id_fkey 
FOREIGN KEY (guild_id) REFERENCES public.guilds(guild_id);

-- Re-add user-related constraints
ALTER TABLE public.guild_members 
ADD CONSTRAINT guild_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.guild_members(id);

ALTER TABLE public.emojis 
ADD CONSTRAINT emojis_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.guild_members(id);

ALTER TABLE public.developer_settings 
ADD CONSTRAINT developer_settings_pkey 
PRIMARY KEY (user_id);

ALTER TABLE public.local_settings 
ADD CONSTRAINT local_settings_pkey 
PRIMARY KEY (user_id);

ALTER TABLE public.user_preferences 
ADD CONSTRAINT user_preferences_pkey 
PRIMARY KEY (user_id);

ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.guild_members(id);

ALTER TABLE public.voice_states 
ADD CONSTRAINT voice_states_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.guild_members(id);

ALTER TABLE public.direct_channels 
ADD CONSTRAINT direct_channels_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.guild_members(id);

ALTER TABLE public.direct_channel_recipients 
ADD CONSTRAINT direct_channel_recipients_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.guild_members(id);

ALTER TABLE public.user_message_reactions 
ADD CONSTRAINT user_message_reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.guild_members(id);

-- Re-add other constraints
ALTER TABLE public.member_roles 
ADD CONSTRAINT member_roles_member_id_fkey 
FOREIGN KEY (member_id) REFERENCES public.guild_members(id),
ADD CONSTRAINT member_roles_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE public.emoji_roles 
ADD CONSTRAINT emoji_roles_emoji_id_fkey 
FOREIGN KEY (emoji_id) REFERENCES public.emojis(id),
ADD CONSTRAINT emoji_roles_role_id_fkey 
FOREIGN KEY (role_id) REFERENCES public.roles(id);

-- Summary: All UUID columns converted to TEXT with constraints restored
-- This approach avoids circular dependency issues

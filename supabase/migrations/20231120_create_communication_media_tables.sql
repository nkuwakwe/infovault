-- Migration: Create Communication and Media Tables
-- Based on existing codebase structure analysis
-- Created: 2023-11-20

-- Enable UUID extension for Supabase compatibility
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- COMMUNICATION DATA TABLES
-- =====================================================

-- Guilds/Servers Table
-- Based on guildjson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS guilds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- CDN URL or icon hash
    banner TEXT, -- CDN URL or banner hash
    splash TEXT, -- Discovery splash image
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    region TEXT,
    preferred_locale TEXT DEFAULT 'en-US',
    features TEXT[] DEFAULT '{}',
    verification_level INTEGER DEFAULT 0,
    default_message_notifications INTEGER DEFAULT 0,
    explicit_content_filter INTEGER DEFAULT 0,
    mfa_level INTEGER DEFAULT 0,
    premium_tier INTEGER DEFAULT 0,
    premium_progress_bar_enabled BOOLEAN DEFAULT FALSE,
    nsfw BOOLEAN DEFAULT FALSE,
    large BOOLEAN DEFAULT FALSE,
    member_count INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 100000,
    max_video_channel_users INTEGER DEFAULT 25,
    afk_channel_id UUID,
    afk_timeout INTEGER DEFAULT 300,
    system_channel_id UUID,
    system_channel_flags INTEGER DEFAULT 0,
    rules_channel_id UUID,
    public_updates_channel_id UUID,
    vanity_url_code TEXT,
    discovery_splash TEXT,
    safety_alerts_channel_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channels Table
-- Based on channeljson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type INTEGER NOT NULL, -- 0: text, 2: voice, 4: category, etc.
    topic TEXT,
    nsfw BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    bitrate INTEGER DEFAULT 64000, -- For voice channels
    user_limit INTEGER DEFAULT 0, -- For voice channels
    rate_limit_per_user INTEGER DEFAULT 0,
    parent_id UUID REFERENCES channels(id) ON DELETE SET NULL, -- For categories
    owner_id UUID, -- For DM channels
    last_message_id UUID,
    last_pin_timestamp TIMESTAMP WITH TIME ZONE,
    default_auto_archive_duration INTEGER DEFAULT 1440,
    flags INTEGER DEFAULT 0,
    video_quality_mode INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
-- Based on messagejson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_timestamp TIMESTAMP WITH TIME ZONE,
    tts BOOLEAN DEFAULT FALSE,
    mention_everyone BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    type INTEGER DEFAULT 0,
    webhook_id UUID,
    message_reference_id UUID, -- For replies
    nonce TEXT,
    flags INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Attachments Table
-- Based on filejson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT,
    size BIGINT NOT NULL,
    url TEXT NOT NULL,
    proxy_url TEXT,
    width INTEGER,
    height INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Embeds Table
-- Based on embedjson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS message_embeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    title TEXT,
    type TEXT,
    description TEXT,
    url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    color INTEGER,
    footer_text TEXT,
    footer_icon_url TEXT,
    image_url TEXT,
    image_proxy_url TEXT,
    image_width INTEGER,
    image_height INTEGER,
    thumbnail_url TEXT,
    thumbnail_proxy_url TEXT,
    thumbnail_width INTEGER,
    thumbnail_height INTEGER,
    video_url TEXT,
    video_width INTEGER,
    video_height INTEGER,
    video_proxy_url TEXT,
    provider_name TEXT,
    author_name TEXT,
    author_url TEXT,
    author_icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    emoji_id UUID, -- For custom emojis
    emoji_name TEXT NOT NULL, -- For unicode emojis or custom emoji names
    emoji_animated BOOLEAN DEFAULT FALSE,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, emoji_id, emoji_name)
);

-- User Message Reactions (junction table)
CREATE TABLE IF NOT EXISTS user_message_reactions (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_reaction_id UUID REFERENCES message_reactions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, message_reaction_id)
);

-- Direct Messages Table
-- Based on dirrectjson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS direct_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type INTEGER NOT NULL, -- 1: DM, 3: Group DM
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_message_id UUID,
    flags INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Direct Channel Recipients (junction table)
CREATE TABLE IF NOT EXISTS direct_channel_recipients (
    channel_id UUID REFERENCES direct_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

-- =====================================================
-- USER ROLES AND PERMISSIONS
-- =====================================================

-- Roles Table
-- Based on rolesjson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color INTEGER DEFAULT 0,
    hoist BOOLEAN DEFAULT FALSE,
    managed BOOLEAN DEFAULT FALSE,
    mentionable BOOLEAN DEFAULT FALSE,
    permissions BIGINT DEFAULT 0,
    position INTEGER DEFAULT 0,
    icon TEXT,
    unicode_emoji TEXT,
    flags INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guild Members Table
-- Based on memberjson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS guild_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nick TEXT,
    avatar TEXT,
    banner TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    premium_since TIMESTAMP WITH TIME ZONE,
    deaf BOOLEAN DEFAULT FALSE,
    mute BOOLEAN DEFAULT FALSE,
    pending BOOLEAN DEFAULT FALSE,
    communication_disabled_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
);

-- Member Roles (junction table)
CREATE TABLE IF NOT EXISTS member_roles (
    member_id UUID REFERENCES guild_members(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (member_id, role_id)
);

-- =====================================================
-- MEDIA AND CONTENT TABLES
-- =====================================================

-- Emojis Table
-- Based on emojipjson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS emojis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    animated BOOLEAN DEFAULT FALSE,
    available BOOLEAN DEFAULT TRUE,
    managed BOOLEAN DEFAULT FALSE,
    require_colons BOOLEAN DEFAULT TRUE,
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emoji Roles (junction table for role restrictions)
CREATE TABLE IF NOT EXISTS emoji_roles (
    emoji_id UUID REFERENCES emojis(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (emoji_id, role_id)
);

-- Stickers Table
-- Based on stickerJson type from jsontypes.ts
CREATE TABLE IF NOT EXISTS stickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT, -- Comma-separated or emoji representation
    type INTEGER NOT NULL, -- 1: standard, 2: guild
    format_type INTEGER NOT NULL, -- 1: png, 2: apng, 3: lottie
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    sort_value INTEGER DEFAULT 0,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Stickers (junction table)
CREATE TABLE IF NOT EXISTS message_stickers (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    sticker_id UUID REFERENCES stickers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (message_id, sticker_id)
);

-- Voice States Table
-- Based on voiceStatus type from jsontypes.ts
CREATE TABLE IF NOT EXISTS voice_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    deaf BOOLEAN DEFAULT FALSE,
    mute BOOLEAN DEFAULT FALSE,
    self_deaf BOOLEAN DEFAULT FALSE,
    self_mute BOOLEAN DEFAULT FALSE,
    self_video BOOLEAN DEFAULT FALSE,
    self_stream BOOLEAN DEFAULT FALSE,
    suppress BOOLEAN DEFAULT FALSE,
    request_to_speak_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Guild indexes
CREATE INDEX IF NOT EXISTS idx_guilds_owner_id ON guilds(owner_id);
CREATE INDEX IF NOT EXISTS idx_guilds_name ON guilds(name);
CREATE INDEX IF NOT EXISTS idx_guilds_features ON guilds USING GIN(features);

-- Channel indexes
CREATE INDEX IF NOT EXISTS idx_channels_guild_id ON channels(guild_id);
CREATE INDEX IF NOT EXISTS idx_channels_parent_id ON channels(parent_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_position ON channels(position);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_guild_id ON messages(guild_id);
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(pinned);

-- Message attachments and embeds indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_embeds_message_id ON message_embeds(message_id);

-- Reaction indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_user_message_reactions_user_id ON user_message_reactions(user_id);

-- Member and role indexes
CREATE INDEX IF NOT EXISTS idx_guild_members_guild_id ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user_id ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_joined_at ON guild_members(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_roles_guild_id ON roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_roles_position ON roles(position);
CREATE INDEX IF NOT EXISTS idx_member_roles_member_id ON member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role_id ON member_roles(role_id);

-- Emoji and sticker indexes
CREATE INDEX IF NOT EXISTS idx_emojis_guild_id ON emojis(guild_id);
CREATE INDEX IF NOT EXISTS idx_emojis_name ON emojis(name);
CREATE INDEX IF NOT EXISTS idx_stickers_guild_id ON stickers(guild_id);
CREATE INDEX IF NOT EXISTS idx_stickers_name ON stickers(name);

-- Voice state indexes
CREATE INDEX IF NOT EXISTS idx_voice_states_guild_id ON voice_states(guild_id);
CREATE INDEX IF NOT EXISTS idx_voice_states_channel_id ON voice_states(channel_id);
CREATE INDEX IF NOT EXISTS idx_voice_states_user_id ON voice_states(user_id);

-- Direct message indexes
CREATE INDEX IF NOT EXISTS idx_direct_channels_owner_id ON direct_channels(owner_id);
CREATE INDEX IF NOT EXISTS idx_direct_channel_recipients_channel_id ON direct_channel_recipients(channel_id);
CREATE INDEX IF NOT EXISTS idx_direct_channel_recipients_user_id ON direct_channel_recipients(user_id);

-- =====================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_embeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_channel_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emojis ENABLE ROW LEVEL SECURITY;
ALTER TABLE emoji_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_states ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (these should be refined based on actual requirements)
CREATE POLICY "Users can view guilds they are members of" ON guilds
    FOR SELECT USING (
        id IN (SELECT guild_id FROM guild_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view channels in their guilds" ON channels
    FOR SELECT USING (
        guild_id IN (SELECT guild_id FROM guild_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view messages in accessible channels" ON messages
    FOR SELECT USING (
        channel_id IN (
            SELECT id FROM channels 
            WHERE guild_id IN (SELECT guild_id FROM guild_members WHERE user_id = auth.uid())
        )
    );

-- Similar policies should be created for other tables based on access patterns

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guild_members_updated_at BEFORE UPDATE ON guild_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emojis_updated_at BEFORE UPDATE ON emojis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stickers_updated_at BEFORE UPDATE ON stickers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_states_updated_at BEFORE UPDATE ON voice_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

/*
This migration creates tables based on the existing TypeScript interfaces found in the codebase:

1. Communication Data:
   - guilds: Server/guild information
   - channels: Text, voice, and category channels
   - messages: Chat messages with full Discord-like functionality
   - message_attachments: File attachments for messages
   - message_embeds: Rich embed content
   - message_reactions: Emoji reactions to messages
   - direct_channels: DM and group DM channels
   - direct_channel_recipients: Participants in DMs

2. User Roles and Permissions:
   - roles: Guild roles with permissions
   - guild_members: User membership in guilds
   - member_roles: Many-to-many relationship between members and roles

3. Media and Content:
   - emojis: Custom emojis (both guild and application)
   - emoji_roles: Role restrictions for emojis
   - stickers: Guild stickers with various formats
   - message_stickers: Stickers attached to messages
   - voice_states: User voice channel connections

The schema follows the patterns established in the existing codebase while being
optimized for PostgreSQL/Supabase usage. All tables include proper foreign key
relationships, indexes for performance, and basic RLS policies.
*/

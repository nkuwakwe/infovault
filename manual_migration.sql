-- Manual Migration: Add Discord channel_id column to channels table
-- Run this manually in Supabase SQL editor
-- Created: 2025-02-10

-- Add channel_id column to store Discord channel IDs as text
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_id TEXT;

-- Create index for better performance when querying by Discord channel ID
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);

-- Add unique constraint to ensure Discord channel IDs are unique
ALTER TABLE channels ADD CONSTRAINT unique_channel_id UNIQUE (channel_id);

-- Update RLS policy for channel_id
DROP POLICY IF EXISTS "Users can view channels in their guilds" ON channels;
CREATE POLICY "Users can view channels in their guilds" ON channels
    FOR SELECT USING (
        guild_id IN (SELECT guild_id FROM guild_members WHERE user_id = auth.uid())
    );

-- Add specific policy for Discord channel ID lookups
CREATE POLICY "Users can view channels by Discord channel ID" ON channels
    FOR SELECT USING (
        guild_id IN (SELECT guild_id FROM guild_members WHERE user_id = auth.uid())
    );

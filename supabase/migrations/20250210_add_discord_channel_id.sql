-- Migration: Add channel_id column to channels table
-- This will be used to uniquely identify channels by their Discord ID
-- Created: 2025-02-10

-- Add channel_id column to store Discord channel IDs as text
ALTER TABLE channels ADD COLUMN IF NOT EXISTS channel_id TEXT;

-- Create index for better performance when querying by Discord channel ID
CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id);

-- Add unique constraint to ensure Discord channel IDs are unique
ALTER TABLE channels ADD CONSTRAINT unique_channel_id UNIQUE (channel_id);

-- RLS policy for channel_id
CREATE POLICY "Users can view channels by Discord channel ID" ON channels
    FOR SELECT USING (
        channel_id IN (
            SELECT c.channel_id 
            FROM channels c 
            JOIN guild_members gm ON c.guild_id = gm.guild_id 
            WHERE gm.user_id = auth.uid()
        )
    );

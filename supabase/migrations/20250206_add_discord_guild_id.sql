-- Migration: Add discord_guild_id column to guilds table
-- This will be used to uniquely identify guilds by their Discord ID
-- Created: 2025-02-06

-- Add discord_guild_id column to store Discord guild IDs as text
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS discord_guild_id TEXT;

-- Create index for better performance when querying by Discord guild ID
CREATE INDEX IF NOT EXISTS idx_guilds_discord_guild_id ON guilds(discord_guild_id);

-- Add unique constraint to ensure Discord guild IDs are unique
ALTER TABLE guilds ADD CONSTRAINT unique_discord_guild_id UNIQUE (discord_guild_id);

-- RLS policy for discord_guild_id
CREATE POLICY "Users can view guilds by Discord guild ID" ON guilds
    FOR SELECT USING (
        discord_guild_id IN (
            SELECT g.discord_guild_id 
            FROM guilds g 
            JOIN guild_members gm ON g.id = gm.guild_id 
            WHERE gm.user_id = auth.uid()
        )
    );

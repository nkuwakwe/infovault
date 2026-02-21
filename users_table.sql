-- Create a proper users table with consistent user properties
-- This table will store user information that is consistent across all guilds
-- Primary key uses text type to match Discord SnowFlake IDs
-- Foreign key references auth.users table for authentication

CREATE TABLE public.users (
    id text NOT NULL,                    -- Discord user ID (SnowFlake)
    name text NOT NULL,                   -- Display name
    username text NOT NULL,                 -- Unique username
    pfp text,                             -- Profile picture URL
    banner text,                            -- Profile banner URL
    bio text,                               -- User biography/description
    user_id uuid NOT NULL,                  -- Foreign key to auth.users table
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_user_id ON public.users(user_id);

-- Update guild_members table to reference the new users table
-- This ensures user properties are consistent across all guilds
ALTER TABLE public.guild_members 
DROP CONSTRAINT guild_members_user_id_fkey;

ALTER TABLE public.guild_members 
ADD CONSTRAINT guild_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id);

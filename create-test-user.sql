-- Alternative approach: Create a proper user via Supabase Auth
-- This creates a user that will be automatically added to auth.users

-- Step 1: Insert into auth.users with proper structure
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    'test@example.com',
    NOW(),
    NOW()
);

-- Step 2: Create a user session (optional, for testing)
INSERT INTO auth.sessions (
    id,
    user_id,
    session_token,
    instance_name,
    expires_at,
    created_at,
    last_accessed
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test-session-token-' || gen_random_uuid(),
    'test-instance',
    NOW() + INTERVAL '1 day',
    NOW(),
    NOW()
);

-- Step 3: Create user preferences (for complete user setup)
INSERT INTO public.user_preferences (
    user_id,
    locale,
    theme,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'en',
    'dark',
    NOW(),
    NOW()
);

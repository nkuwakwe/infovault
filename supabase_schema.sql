-- Supabase Database Schema for Infovault
-- This schema matches the existing localStorage structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User instances table
CREATE TABLE IF NOT EXISTS user_instances (
    user_id UUID NOT NULL,
    instance_name TEXT NOT NULL,
    server_urls JSONB NOT NULL,
    token TEXT NOT NULL,
    email TEXT NOT NULL,
    pfpsrc TEXT,
    localuser_store JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, instance_name)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY,
    locale TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark',
    accent_color TEXT,
    animate_gifs TEXT DEFAULT 'true',
    animate_icons TEXT DEFAULT 'true',
    volume INTEGER DEFAULT 50,
    notisound TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer settings table
CREATE TABLE IF NOT EXISTS developer_settings (
    user_id UUID PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Local settings table
CREATE TABLE IF NOT EXISTS local_settings (
    user_id UUID PRIMARY KEY,
    service_worker_mode TEXT DEFAULT 'disabled',
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uptime data table for instance monitoring
CREATE TABLE IF NOT EXISTS uptime_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    instance_name TEXT NOT NULL,
    online BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_instances_user_id ON user_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_instances_instance_name ON user_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_uptime_data_instance_name ON uptime_data(instance_name);
CREATE INDEX IF NOT EXISTS idx_uptime_data_timestamp ON uptime_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_instances_updated_at BEFORE UPDATE ON user_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_developer_settings_updated_at BEFORE UPDATE ON developer_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_local_settings_updated_at BEFORE UPDATE ON local_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can view own user_instances" ON user_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_instances" ON user_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_instances" ON user_instances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own user_instances" ON user_instances FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own user_preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own developer_settings" ON developer_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own developer_settings" ON developer_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own developer_settings" ON developer_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own local_settings" ON local_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own local_settings" ON local_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own local_settings" ON local_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON user_sessions FOR DELETE USING (auth.uid() = user_id);

-- Uptime data is public (read-only for monitoring)
CREATE POLICY "Everyone can view uptime data" ON uptime_data FOR SELECT USING (true);
CREATE POLICY "Service role can insert uptime data" ON uptime_data FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Fixed Row Level Security Policies for DM Tables
-- Run these in your Supabase SQL Editor

-- Enable RLS on DM tables if not already enabled
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

-- Policy for dm_conversations: Users can only see conversations they participate in
CREATE POLICY "Users can view conversations they participate in" ON dm_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_participants 
      WHERE dm_participants.conversation_id = dm_conversations.id 
      AND dm_participants.user_id = auth.uid()
    )
  );

-- Policy for dm_conversations: Users can insert conversations (will be handled by participants insert)
CREATE POLICY "Users can insert conversations" ON dm_conversations
  FOR INSERT WITH CHECK (true);

-- Policy for dm_participants: Users can view their own participant records
CREATE POLICY "Users can view their own participants" ON dm_participants
  FOR SELECT USING (user_id = auth.uid());

-- Policy for dm_participants: Users can insert themselves as participants
CREATE POLICY "Users can insert themselves as participants" ON dm_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy for dm_participants: Users can update their own participant records
CREATE POLICY "Users can update their own participants" ON dm_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Policy for dm_participants: Users can delete their own participant records
CREATE POLICY "Users can delete their own participants" ON dm_participants
  FOR DELETE USING (user_id = auth.uid());

-- Policy for dm_messages: Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations" ON dm_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dm_participants 
      WHERE dm_participants.conversation_id = dm_messages.conversation_id 
      AND dm_participants.user_id = auth.uid()
    )
  );

-- Policy for dm_messages: Users can insert messages in conversations they participate in
CREATE POLICY "Users can insert messages in their conversations" ON dm_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dm_participants 
      WHERE dm_participants.conversation_id = dm_messages.conversation_id 
      AND dm_participants.user_id = auth.uid()
    )
  );

-- Policy for dm_messages: Users can update their own messages
CREATE POLICY "Users can update their own messages" ON dm_messages
  FOR UPDATE USING (user_id = auth.uid());

-- Policy for dm_messages: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON dm_messages
  FOR DELETE USING (user_id = auth.uid());

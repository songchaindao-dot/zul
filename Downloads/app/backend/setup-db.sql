-- ============================================================
-- Cattleya — Supabase Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',              -- 'online', 'away', 'offline'
  last_seen TIMESTAMP,
  language_preference TEXT DEFAULT 'en',      -- user's preferred translation target
  is_typing BOOLEAN DEFAULT FALSE,
  typing_in_conversation UUID,
  notification_enabled BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  blocked_users UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP codes for authentication
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,                     -- SHA-256 hash of the OTP
  attempt_id UUID UNIQUE DEFAULT uuid_generate_v4(),  -- used by client to correlate requests
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  expired BOOLEAN DEFAULT FALSE,
  attempts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations (1-to-1 chats)
-- participant_ids always contains exactly 2 user UUIDs, stored sorted for uniqueness
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  last_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT two_participants CHECK (array_length(participant_ids, 1) = 2)
);

-- Unique index ensuring one conversation per pair regardless of order
CREATE UNIQUE INDEX conversations_unique_pair ON conversations
  (LEAST(participant_ids[1], participant_ids[2]), GREATEST(participant_ids[1], participant_ids[2]));

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT,
  message_type TEXT DEFAULT 'text',           -- 'text', 'voice', 'image'
  voice_note_url TEXT,
  voice_transcription TEXT,                   -- auto-transcribed from voice note
  image_url TEXT,
  detected_language TEXT,                     -- auto-detected language code (e.g. 'es')
  is_read BOOLEAN DEFAULT FALSE,
  is_translated BOOLEAN DEFAULT FALSE,
  translated_text TEXT,
  translation_language TEXT,
  reactions TEXT[] DEFAULT ARRAY[]::TEXT[],   -- emoji reactions
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call history
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL,                    -- 'audio' or 'video'
  status TEXT DEFAULT 'completed',            -- 'missed', 'completed', 'cancelled'
  duration INTEGER,                           -- seconds
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contacts / Favorites
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_otp_phone ON otp_codes(phone_number);
CREATE INDEX idx_otp_attempt ON otp_codes(attempt_id);
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participant_ids);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_calls_conversation ON calls(conversation_id);
CREATE INDEX idx_calls_initiator ON calls(initiator_id);
CREATE INDEX idx_contacts_user ON contacts(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read public profiles, only owner can update/delete
CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid()::text = id::text);
CREATE POLICY "users_delete_own" ON users FOR DELETE USING (auth.uid()::text = id::text);

-- OTP codes: service role only (backend manages these via service key)
CREATE POLICY "otp_service_only" ON otp_codes USING (false);

-- Conversations: participants only
CREATE POLICY "conversations_participants_select" ON conversations
  FOR SELECT USING (auth.uid()::uuid = ANY(participant_ids));

CREATE POLICY "conversations_participants_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid()::uuid = ANY(participant_ids));

CREATE POLICY "conversations_participants_update" ON conversations
  FOR UPDATE USING (auth.uid()::uuid = ANY(participant_ids));

-- Messages: participants of the conversation
CREATE POLICY "messages_participants_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid()::uuid = ANY(conversations.participant_ids)
    )
  );

CREATE POLICY "messages_sender_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = sender_id::text AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid()::uuid = ANY(conversations.participant_ids)
    )
  );

CREATE POLICY "messages_sender_update" ON messages
  FOR UPDATE USING (auth.uid()::text = sender_id::text);

CREATE POLICY "messages_sender_delete" ON messages
  FOR DELETE USING (auth.uid()::text = sender_id::text);

-- Calls: participants of the conversation
CREATE POLICY "calls_participants_select" ON calls
  FOR SELECT USING (
    auth.uid()::text = initiator_id::text OR
    auth.uid()::text = recipient_id::text
  );

CREATE POLICY "calls_initiator_insert" ON calls
  FOR INSERT WITH CHECK (auth.uid()::text = initiator_id::text);

-- Contacts: owner only
CREATE POLICY "contacts_owner_select" ON contacts FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "contacts_owner_insert" ON contacts FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "contacts_owner_update" ON contacts FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "contacts_owner_delete" ON contacts FOR DELETE USING (auth.uid()::text = user_id::text);

-- ============================================================
-- Storage buckets
-- Create these in Supabase Dashboard > Storage:
--   1. chat_media  (Private) — voice notes, images
--   2. avatars     (Public)  — profile pictures
-- ============================================================

-- ============================================================
-- Realtime (enable in Supabase Dashboard > Database > Replication)
-- Enable for: messages, conversations, users
-- ============================================================

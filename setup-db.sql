-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline', -- 'online', 'away', 'offline'
  last_seen TIMESTAMP,
  language_preference TEXT DEFAULT 'en', -- User's preferred language for translations
  is_typing BOOLEAN DEFAULT FALSE,
  typing_in_conversation UUID,
  notification_enabled BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  blocked_users UUID[] DEFAULT ARRAY[]::UUID[], -- Array of blocked user IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP codes for authentication
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations (chats between two users)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_one UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant_one, participant_two)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT,
  message_type TEXT DEFAULT 'text', -- 'text', 'voice', 'image', 'video'
  voice_note_url TEXT,
  voice_transcription TEXT, -- Auto-transcribed text from voice note
  image_url TEXT,
  detected_language TEXT, -- Auto-detected language (e.g., 'en', 'es')
  is_read BOOLEAN DEFAULT FALSE,
  is_translated BOOLEAN DEFAULT FALSE,
  translated_text TEXT, -- Auto-translated text
  translation_language TEXT, -- Language it was translated to
  reactions TEXT[] DEFAULT ARRAY[]::TEXT[], -- Emoji reactions: ["👍", "❤️"]
  edited_at TIMESTAMP, -- NULL if not edited
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call history
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL, -- 'audio' or 'video'
  duration INTEGER, -- in seconds
  status TEXT DEFAULT 'completed', -- 'missed', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contacts/Favorites
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_conversations_participants ON conversations(participant_one, participant_two);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_calls_conversation ON calls(conversation_id);

-- Create Storage buckets
-- Go to Supabase Dashboard > Storage and create these buckets:
-- 1. chat_media (for voice notes, images, videos)
-- 2. avatars (for profile pictures)

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can view conversations they're part of
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (
    auth.uid()::text = participant_one::text OR 
    auth.uid()::text = participant_two::text
  );

-- Users can view messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_one::text = auth.uid()::text 
           OR conversations.participant_two::text = auth.uid()::text)
    )
  );

-- Users can insert messages in conversations they're part of
CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid()::text = sender_id::text AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_one::text = auth.uid()::text 
           OR conversations.participant_two::text = auth.uid()::text)
    )
  );

-- Realtime subscriptions
-- Go to Supabase Dashboard > Replication and enable for:
-- - messages table
-- - conversations table
-- - users table

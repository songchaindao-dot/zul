const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============= SECURITY MIDDLEWARE =============

app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL || 'https://cinterlingochat.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(mongoSanitize());

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Strict OTP rate limiter (5 per hour per IP)
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests, please try again later.',
});

app.use('/api/', limiter);
app.use('/api/auth/send-otp', otpLimiter);

// Request logger
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - req.startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// ============= CLIENTS =============

const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });



// ============= ENCRYPTION HELPERS =============

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (text) => {
  const [ivHex, ...rest] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(rest.join(':'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// ============= VALIDATION HELPERS =============

const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validateName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.length < 100;
};

// ============= FILE UPLOAD =============

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ============= JWT =============

const JWT_SECRET = process.env.JWT_SECRET;

// ============= AUTH MIDDLEWARE =============

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No valid token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Reject tokens older than 7 days (belt-and-suspenders with jwt expiry)
    const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
    if (tokenAge > 7 * 24 * 60 * 60) {
      return res.status(401).json({ error: 'Token expired' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============= AUTH ROUTES =============

// POST /api/auth/send-otp
// Generate & store SHA-256 hashed OTP; expose OTP in all environments (no SMS)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Per-phone rate limit (5 attempts per hour, DB-level check)
    const { data: recentOtps } = await supabase
      .from('otp_codes')
      .select('id')
      .eq('phone_number', phoneNumber)
      .gt('created_at', new Date(Date.now() - 3600000).toISOString());

    if (recentOtps && recentOtps.length >= 5) {
      return res.status(429).json({ error: 'Too many OTP requests. Try again in 1 hour.' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Store hashed OTP; expires in 10 minutes
    const { data: otpRecord, error: dbError } = await supabase
      .from('otp_codes')
      .insert([{
        phone_number: phoneNumber,
        otp_code: hashedOtp,
        expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
      }])
      .select('attempt_id')
      .single();

    if (dbError) throw dbError;

    res.json({
      success: true,
      message: 'Verification code generated',
      attemptId: otpRecord.attempt_id,
      expiresIn: 600, // seconds
      otp, // Always expose OTP for all environments
    });
  } catch (error) {
    console.error('send-otp error:', error);
    res.status(500).json({ error: 'Failed to generate OTP. Please try again.' });
  }
});

// POST /api/auth/verify-otp
// Verify OTP by hash + attemptId; prevent replay; create user if new; return JWT
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, name, attemptId } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP required' });
    }
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    if (name && !validateName(name)) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Find a matching, unexpired, unverified OTP
    let query = supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', hashedOtp)
      .eq('verified', false)
      .eq('expired', false)
      .gt('expires_at', new Date().toISOString());

    if (attemptId) {
      query = query.eq('attempt_id', attemptId);
    }

    const { data: otpData } = await query.single();

    if (!otpData) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as verified (one-time use)
    await supabase
      .from('otp_codes')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', otpData.id);

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          phone_number: phoneNumber,
          name: name && validateName(name) ? name.trim() : phoneNumber,
          status: 'online',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Buffer.from(phoneNumber).toString('base64')}`,
          last_seen: new Date().toISOString(),
        }])
        .select('id, phone_number, name, avatar_url, status')
        .single();

      if (createError) throw createError;
      user = newUser;
    } else {
      await supabase
        .from('users')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phone_number,
        iat: Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar_url,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('verify-otp error:', error);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ============= USER ROUTES =============

// GET /api/users/me
app.get('/api/users/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, status, bio, language_preference')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users/:identifier — by UUID or phone number
app.get('/api/users/:identifier', verifyToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const isPhone = identifier.startsWith('+') || /^\d{10,}$/.test(identifier);

    let query = supabase
      .from('users')
      .select('id, name, avatar_url, status, bio, last_seen');

    query = isPhone
      ? query.eq('phone_number', identifier)
      : query.eq('id', identifier);

    const { data: user, error } = await query.single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user); // phone_number intentionally excluded from SELECT
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/profile
app.put('/api/users/profile', verifyToken, async (req, res) => {
  try {
    const { name, bio, avatar_url, status, language_preference } = req.body;

    if (name !== undefined && !validateName(name)) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (bio && bio.length > 500) {
      return res.status(400).json({ error: 'Bio too long (max 500 characters)' });
    }
    if (status && !['online', 'offline', 'away'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatar_url && { avatar_url }),
        ...(status && { status }),
        ...(language_preference && { language_preference }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.userId)
      .select('id, name, avatar_url, status, bio, language_preference')
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/users/account
app.delete('/api/users/account', verifyToken, async (req, res) => {
  try {
    const { confirmationCode } = req.body;

    if (confirmationCode !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ error: 'Invalid confirmation code' });
    }

    await supabase.from('users').delete().eq('id', req.user.userId);
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ============= CONVERSATION ROUTES =============

// POST /api/conversations — get or create a 1-to-1 conversation
app.post('/api/conversations', verifyToken, async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.userId;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID required' });
    }
    if (userId === participantId) {
      return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    // Verify the other user exists
    const { data: otherUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', participantId)
      .single();

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store IDs sorted so [A,B] and [B,A] always produce the same row
    const sortedIds = [userId, participantId].sort();

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert([{ participant_ids: sortedIds }])
      .select()
      .single();

    if (error && error.code === '23505') {
      // Unique violation — conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .filter('participant_ids', 'cs', `{${sortedIds[0]},${sortedIds[1]}}`)
        .single();

      return res.json(existing);
    }

    if (error) throw error;
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/conversations — list conversations for the current user
app.get('/api/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .filter('participant_ids', 'cs', `{${userId}}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Fetch the other participant's info for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.participant_ids.find((id) => id !== userId);
        const { data: other } = await supabase
          .from('users')
          .select('id, name, avatar_url, status')
          .eq('id', otherUserId)
          .single();
        return { ...conv, otherUser: other || null };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ============= MESSAGE ROUTES =============

// POST /api/messages — send a text, voice, or image message
app.post('/api/messages', verifyToken, upload.single('voice_note'), async (req, res) => {
  try {
    const { conversationId, text, messageType } = req.body;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID required' });
    }

    if (!messageType || !['text', 'voice', 'image'].includes(messageType)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    // Verify user is a participant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (!conversation.participant_ids.includes(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (messageType === 'text' && (!text || text.length === 0 || text.length > 5000)) {
      return res.status(400).json({ error: 'Invalid message content' });
    }

    let voiceNoteUrl = null;

    if (messageType === 'voice' && req.file) {
      const fileName = `voice-notes/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
        });

      if (uploadError) {
        return res.status(400).json({ error: 'Failed to upload voice note' });
      }

      const { data } = supabase.storage.from('chat_media').getPublicUrl(fileName);
      voiceNoteUrl = data.publicUrl;
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        sender_id: userId,
        text: text || null,
        message_type: messageType,
        voice_note_url: voiceNoteUrl,
        is_read: false,
      }])
      .select('id, conversation_id, sender_id, text, message_type, voice_note_url, created_at, is_read')
      .single();

    if (error) throw error;

    // Update conversation's updated_at and last_message preview
    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message: messageType === 'text' ? text?.substring(0, 80) : `[${messageType}]`,
      })
      .eq('id', conversationId);

    res.json(message);
  } catch (error) {
    console.error('send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/:conversationId
app.get('/api/messages/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', conversationId)
      .single();

    if (!conversation || !conversation.participant_ids.includes(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, text, message_type, voice_note_url, voice_transcription, detected_language, translated_text, translation_language, reactions, is_read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/messages/:messageId/read
app.put('/api/messages/:messageId/read', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const { data: message } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .single();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only the recipient can mark as read (not the sender)
    if (message.sender_id === userId) {
      return res.status(403).json({ error: 'Cannot mark own message as read' });
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('participant_ids')
      .eq('id', message.conversation_id)
      .single();

    if (!conversation || !conversation.participant_ids.includes(userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data: updated, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// DELETE /api/messages/:messageId — sender only, within 1-hour window
app.delete('/api/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const { data: message } = await supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('id', messageId)
      .single();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    const ageMs = Date.now() - new Date(message.created_at).getTime();
    if (ageMs > 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Message too old to delete (1-hour limit)' });
    }

    await supabase.from('messages').delete().eq('id', messageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ============= TRANSLATION / LANGUAGE ROUTES =============

// POST /api/detect-language
app.post('/api/detect-language', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const prompt = `Detect the language of this text. Return ONLY a JSON object exactly like {"language":"es","name":"Spanish","confidence":0.99}. No markdown, no backticks.\n\nText: ${text}`;
    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text().trim().replace(/```json\n?|\n?```/g, '');

    res.json(JSON.parse(raw));
  } catch (error) {
    console.error('detect-language error:', error);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// POST /api/translate
app.post('/api/translate', verifyToken, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });

    const target = targetLanguage || 'English';
    const prompt = `Detect this text's language and translate it to ${target}. Return ONLY a JSON object exactly like {"detected_language":"es","detected_name":"Spanish","translated":"Hello world","confidence":0.99}. No markdown, no backticks.\n\nText: ${text}`;
    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text().trim().replace(/```json\n?|\n?```/g, '');

    res.json(JSON.parse(raw));
  } catch (error) {
    console.error('translate error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// POST /api/transcribe-voice — transcription handled client-side via Web Speech API.
// This endpoint is kept for backwards compatibility but is no longer the primary path.
app.post('/api/transcribe-voice', verifyToken, async (req, res) => {
  res.json({ message: 'Transcription is now handled by the browser Web Speech API. Use /api/voice/finalize instead.' });
});

// ============= PRESENCE ROUTES =============

// POST /api/presence/typing
app.post('/api/presence/typing', verifyToken, async (req, res) => {
  try {
    const { conversationId, isTyping } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID required' });
    }

    // Update typing status on the user row (simple approach; Redis preferred at scale)
    await supabase
      .from('users')
      .update({
        is_typing: Boolean(isTyping),
        typing_in_conversation: isTyping ? conversationId : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.userId);

    res.json({
      success: true,
      status: isTyping ? 'typing' : 'stopped',
      userId: req.user.userId,
      conversationId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// POST /api/presence/status
app.post('/api/presence/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['online', 'away', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        status,
        last_seen: status === 'offline' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.userId)
      .select('id, status, last_seen')
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// GET /api/presence/typing/:conversationId
app.get('/api/presence/typing/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const { data: typingUsers } = await supabase
      .from('users')
      .select('id, name')
      .eq('is_typing', true)
      .eq('typing_in_conversation', conversationId)
      .neq('id', req.user.userId);

    res.json({
      conversationId,
      typingUsers: typingUsers || [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch typing status' });
  }
});

// GET /api/presence/:userId
app.get('/api/presence/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, status, last_seen')
      .eq('id', userId)
      .single();

    if (error) throw error;

    res.json({
      userId: user.id,
      status: user.status,
      lastSeen: user.last_seen,
      isOnline: user.status === 'online',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presence' });
  }
});

// ============= CALL ROUTES =============

// POST /api/calls/token — Twilio video token
app.post('/api/calls/token', verifyToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) {
      return res.status(400).json({ error: 'Room name required' });
    }

    const { AccessToken } = twilio.jwt;
    const { VideoGrant } = AccessToken;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: req.user.userId }
    );

    token.addGrant(new VideoGrant({ room: roomName }));

    res.json({ token: token.toJwt(), roomName });
  } catch (error) {
    console.error('call token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calls/record
app.post('/api/calls/record', verifyToken, async (req, res) => {
  try {
    const { conversationId, recipientId, callType, duration, status, startedAt, endedAt } = req.body;

    if (!conversationId || !callType) {
      return res.status(400).json({ error: 'conversationId and callType required' });
    }
    if (!['audio', 'video'].includes(callType)) {
      return res.status(400).json({ error: 'callType must be audio or video' });
    }

    const { data: call, error } = await supabase
      .from('calls')
      .insert([{
        conversation_id: conversationId,
        initiator_id: req.user.userId,
        recipient_id: recipientId || null,
        call_type: callType,
        duration: duration || null,
        status: status || 'completed',
        started_at: startedAt || null,
        ended_at: endedAt || null,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(call);
  } catch (error) {
    console.error('call record error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============= HEALTH =============

app.get('/', (req, res) => {
  res.status(200).send('Cattleya API is running 🌸');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', app: 'Cattleya', timestamp: new Date().toISOString() });
});

// ============= ERROR HANDLER =============

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============= START =============

app.listen(PORT, () => {
  console.log(`🌸 Cattleya backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

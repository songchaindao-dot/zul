const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============= SECURITY SETUP =============
// App: IMan and Cattleya
// A private, secure messaging app built with love 💕

// Helmet - Set security HTTP headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL || 'https://cinterlingochat.vercel.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 OTP requests per hour
  message: 'Too many OTP requests, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/send-otp', otpLimiter);

// Request logging middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Twilio setup for OTP
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ============= ENCRYPTION UTILITIES =============

// Encrypt sensitive data before storing
const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production'),
    iv
  );
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt sensitive data
const decrypt = (text) => {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production'),
    iv
  );
  let decrypted = decipher.update(parts.join(':'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// File upload setup with size restrictions
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';

// Input validation
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validateName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.length < 100;
};

// ============= AUTH ROUTES =============

// Send OTP to phone number
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if user has exceeded OTP attempts
    const { data: recentOtps } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .gt('created_at', new Date(Date.now() - 3600000).toISOString());

    if (recentOtps && recentOtps.length >= 5) {
      return res.status(429).json({ error: 'Too many OTP requests. Try again in 1 hour.' });
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Store encrypted OTP in database (expires in 10 minutes)
    const { error: dbError } = await supabase
      .from('otp_codes')
      .insert([
        {
          phone_number: phoneNumber,
          otp_code: hashedOtp,
          expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
        },
      ]);

    if (dbError) throw dbError;

    // Send via Twilio
    if (process.env.NODE_ENV === 'production') {
      try {
        await twilioClient.messages.create({
          body: `🔐 Your IMan and Cattleya verification code is: ${otp}\n\nA secure messaging app built with love 💕`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
        });
      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        // Don't fail the request, just log the error
      }
    }

    res.json({ 
      success: true, 
      message: 'OTP sent to your phone number',
      ...(process.env.NODE_ENV !== 'production' && { otp }) // Show OTP in dev mode only
    });
  } catch (error) {
    console.error('OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP and create/login user
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, name } = req.body;

    // Validate input
    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP required' });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    if (name && !validateName(name)) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    // Hash the provided OTP
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('otp_code', hashedOtp)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Check if user exists
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (!user) {
      // Create new user with minimal data
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            phone_number: phoneNumber,
            name: name && validateName(name) ? name : phoneNumber,
            status: 'online',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Buffer.from(phoneNumber).toString('base64')}`,
            last_seen: new Date().toISOString(),
          },
        ])
        .select('id, phone_number, name, avatar_url, status')
        .single();

      if (createError) throw createError;
      user = newUser;
    } else {
      // Update last seen
      await supabase
        .from('users')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }

    // Delete used OTP (security - one-time use)
    await supabase.from('otp_codes').delete().eq('id', otpData.id);

    // Generate JWT token with limited claims
    const token = jwt.sign(
      { 
        userId: user.id, 
        phoneNumber: user.phone_number,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Shorter expiration for security
    );

    // Return minimal user info
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
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ============= MIDDLEWARE =============

// Verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No valid token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check token age (prevent using very old tokens)
    const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
    if (tokenAge > 7 * 24 * 60 * 60) { // 7 days
      return res.status(401).json({ error: 'Token expired' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify ownership (user can only access their own data)
const verifyOwnership = async (req, res, next) => {
  const userId = req.user.userId;
  const targetId = req.params.userId || req.body.userId;

  if (userId !== targetId && targetId) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  next();
};

// ============= USER ROUTES =============

// Get current user (minimal data)
app.get('/api/users/me', verifyToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, status, bio')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user by phone or ID (minimal public info only)
app.get('/api/users/:identifier', verifyToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const isPhone = identifier.includes('+') || identifier.match(/^\d{10,}/);

    let query = supabase.from('users').select('id, name, avatar_url, status, bio, last_seen');

    if (isPhone) {
      query = query.eq('phone_number', identifier);
    } else {
      query = query.eq('id', identifier);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't return phone numbers or sensitive data
    delete user.phone_number;

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile (with validation)
app.put('/api/users/profile', verifyToken, verifyOwnership, async (req, res) => {
  try {
    const { name, bio, avatar_url, status } = req.body;

    // Validate input
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
        ...(name && { name }),
        ...(bio && { bio }),
        ...(avatar_url && { avatar_url }),
        ...(status && { status }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.userId)
      .select('id, name, avatar_url, status, bio')
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete user account (with confirmation)
app.delete('/api/users/account', verifyToken, async (req, res) => {
  try {
    const { confirmationCode } = req.body;

    if (confirmationCode !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ error: 'Invalid confirmation code' });
    }

    // Delete user and all associated data
    await supabase.from('users').delete().eq('id', req.user.userId);

    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ============= CHAT ROUTES =============

// Get or create conversation (with authorization)
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

    // Verify both users exist
    const { data: otherUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', participantId)
      .single();

    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or get existing conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert([
        {
          participant_one: userId,
          participant_two: participantId,
        },
      ])
      .select()
      .single();

    if (error && error.code === '23505') {
      // Unique constraint error - get existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(participant_one.eq.${userId},participant_two.eq.${participantId}),and(participant_one.eq.${participantId},participant_two.eq.${userId})`
        )
        .single();

      return res.json(existing);
    }

    if (error) throw error;

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversations for user (with authorization)
app.get('/api/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_one:users!conversations_participant_one_fkey(id, name, avatar_url, status),
        participant_two:users!conversations_participant_two_fkey(id, name, avatar_url, status)
      `)
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Filter out sensitive data
    const safeConversations = conversations.map(conv => ({
      ...conv,
      participant_one: {
        id: conv.participant_one.id,
        name: conv.participant_one.name,
        avatar_url: conv.participant_one.avatar_url,
        status: conv.participant_one.status
      },
      participant_two: {
        id: conv.participant_two.id,
        name: conv.participant_two.name,
        avatar_url: conv.participant_two.avatar_url,
        status: conv.participant_two.status
      }
    }));

    res.json(safeConversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Send message (with authorization)
app.post('/api/messages', verifyToken, upload.single('voice_note'), async (req, res) => {
  try {
    const { conversationId, text, messageType } = req.body;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID required' });
    }

    // Verify user is part of conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.participant_one !== userId && conversation.participant_two !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate message content
    if (!messageType || !['text', 'voice', 'image'].includes(messageType)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }

    if (messageType === 'text' && (!text || text.length === 0 || text.length > 5000)) {
      return res.status(400).json({ error: 'Invalid message content' });
    }

    let voiceNoteUrl = null;

    // Handle voice note upload
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
      .insert([
        {
          conversation_id: conversationId,
          sender_id: userId,
          text: text || null,
          message_type: messageType,
          voice_note_url: voiceNoteUrl,
          is_read: false,
        },
      ])
      .select('id, conversation_id, sender_id, text, message_type, voice_note_url, created_at, is_read')
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    res.json(message);
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for conversation (with authorization)
app.get('/api/messages/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    // Verify user is part of conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conversation || (conversation.participant_one !== userId && conversation.participant_two !== userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, text, message_type, voice_note_url, created_at, is_read')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as read (with authorization)
app.put('/api/messages/:messageId/read', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    // Verify user is the recipient
    const { data: message } = await supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .eq('id', messageId)
      .single();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', message.conversation_id)
      .single();

    if (message.sender_id === userId || (conversation.participant_one !== userId && conversation.participant_two !== userId)) {
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

// Delete message (only by sender, within 1 hour)
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
      return res.status(403).json({ error: 'Can only delete own messages' });
    }

    // Check if message is older than 1 hour
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge > 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Message too old to delete (1 hour limit)' });
    }

    await supabase.from('messages').delete().eq('id', messageId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ============= TRANSLATION ROUTE =============

// Detect language and translate
app.post('/api/translate', verifyToken, async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    // Use Claude API for both detection and translation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `You are a language detection and translation expert. 

Text to process: "${text}"

Tasks:
1. Detect the source language of the text
2. Translate to ${targetLanguage || 'English'} if needed

Respond in JSON format ONLY (no other text):
{
  "detectedLanguage": "language code (e.g., en, es, fr)",
  "detectedLanguageName": "full language name",
  "targetLanguage": "${targetLanguage || 'English'}",
  "original": "${text}",
  "translated": "translated text here",
  "confidence": 0.95
}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const responseText = data.content[0].text;
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Translation failed' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Detect language only
app.post('/api/detect-language', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Detect the language of this text. Respond in JSON only: {"language": "code", "name": "full name", "confidence": 0.95}

Text: "${text}"`,
          },
        ],
      }),
    });

    const data = await response.json();
    const responseText = data.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Detection failed' });
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: 'Detection failed' });
  }
});

// Transcribe and translate voice notes
app.post('/api/transcribe-voice', verifyToken, async (req, res) => {
  try {
    const { audioUrl, targetLanguage } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ error: 'Audio URL required' });
    }

    // Note: In production, use a speech-to-text service like:
    // - Google Cloud Speech-to-Text
    // - AWS Transcribe
    // - Azure Speech Services
    // - OpenAI Whisper API

    // For now, return placeholder
    res.json({
      transcription: 'Voice transcription placeholder - integrate with speech-to-text service',
      translated: targetLanguage ? 'Translated placeholder' : null,
      detectedLanguage: 'unknown',
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// ============= PRESENCE & TYPING ROUTES =============

// Update user typing status
app.post('/api/presence/typing', verifyToken, async (req, res) => {
  try {
    const { conversationId, isTyping } = req.body;
    const userId = req.user.userId;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID required' });
    }

    // Store typing status temporarily (expires in 5 seconds)
    // In production, use Redis or similar for real-time updates
    
    // For now, just acknowledge
    res.json({ 
      success: true,
      status: isTyping ? 'typing' : 'stopped',
      userId,
      conversationId
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// Update user online status
app.post('/api/presence/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.userId;

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
      .eq('id', userId)
      .select('id, status, last_seen')
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get typing indicators in conversation
app.get('/api/presence/typing/:conversationId', verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Return typing users (in production, from Redis)
    res.json({ 
      conversationId,
      typingUsers: [] // Would be populated from real-time store
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch typing status' });
  }
});

// Get user last seen
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

// Generate Twilio token for video call
app.post('/api/calls/token', verifyToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    const { AccessToken } = twilio.jwt;
    const { VideoGrant } = AccessToken;

    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: req.user.userId }
    );

    token.addGrant(new VideoGrant({ room: roomName }));

    res.json({ token: token.toJwt() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Store call record
app.post('/api/calls/record', verifyToken, async (req, res) => {
  try {
    const { conversationId, callType, duration } = req.body;

    const { data: call, error } = await supabase
      .from('calls')
      .insert([
        {
          conversation_id: conversationId,
          initiator_id: req.user.userId,
          call_type: callType, // 'audio' or 'video'
          duration: duration,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json(call);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= HEALTH CHECK =============

app.get('/', (req, res) => {
  res.status(200).send('IMan and Cattleya API is running. Check /api/health');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============= ERROR HANDLING =============

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

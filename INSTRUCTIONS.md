# Cattleya App — Instructions for Claude Code

You are working on a bilingual messaging app called **Cattleya** for couples who don't speak the same language.

## Step 1: Inventory current state

List every file in `C:\Users\7 RECORDS\Downloads\app` and give me their line counts. Note which ones look incomplete (truncated, stub, missing key features).

## Step 2: Repair or write any missing/incomplete files

The app must have these files with full implementations (no stubs):

### `backend/server.js` (~1000+ lines)
Express.js server with these endpoints:
- `POST /api/auth/send-otp` — generate 6-digit OTP, hash with SHA-256, store with attemptId, expires in 10 min, send via Twilio SMS, rate-limited 5/hour
- `POST /api/auth/verify-otp` — verify by hash + attemptId, prevent replay, mark used, create user if new, return JWT (7-day)
- `GET /api/users/me`, `GET /api/users/:id`, `PUT /api/users/profile`, `DELETE /api/users/account`
- `POST /api/conversations`, `GET /api/conversations`
- `POST /api/messages` (text/voice/image), `GET /api/messages/:conversationId`, `PUT /api/messages/:id/read`, `DELETE /api/messages/:id` (1-hour window, sender only)
- `POST /api/detect-language` — call Claude API to detect language
- `POST /api/translate` — call Claude API, return `{detectedLanguage, translated, confidence}`
- `POST /api/transcribe-voice` — placeholder ready for Whisper
- `POST /api/presence/typing`, `POST /api/presence/status`, `GET /api/presence/:userId`
- `POST /api/calls/token` (Twilio video tokens), `POST /api/calls/record`
- `GET /api/health`

Security: Helmet, CORS whitelist, express-rate-limit, express-mongo-sanitize, JWT middleware on all protected routes, AES-256-CBC encryption helpers, ownership checks, never return phone numbers in responses.

Imports: express, cors, dotenv, @supabase/supabase-js, jsonwebtoken, twilio, multer, axios, helmet, express-rate-limit, express-mongo-sanitize, crypto.

### `frontend/ChatApp.jsx` (~800+ lines)
React component with views: `auth`, `about`, `chats`, `chat`, `call`. Dark romantic theme (slate-950, purple-950 backgrounds, pink/purple gradients). Features:
- Phone OTP login flow
- About page with Cattleya orchid logo SVG inline + builder's quote: *"This app was inspired by Cattleya, the beautiful woman who I fell for online but we don't speak the same language. I hope it helps you inter-lingo relationships too."*
- Auto language detection while typing (debounced, 3+ chars) — shows "✍️ Auto-detecting: ES → EN"
- Auto-translation on send when languages differ
- Voice note recording with timer + transcription display
- Animated bouncing 3-dot typing indicator
- Online/offline green/gray dot, "Last seen X min ago"
- Emoji message reactions (toggle on tap)
- Read receipts (✓ sent, ✓✓ read)
- Call view with mute/video/end controls
- Logout, settings menu

Use lucide-react icons. Use fetch() to call backend API. Store JWT in localStorage. No external CSS — use Tailwind utility classes only.

### `frontend/SecureAuth.jsx` (~500+ lines)
Standalone secure auth component:
- Phone input with E.164 validation and live formatting
- 6-box OTP input with auto-focus + countdown timer
- Attempt counter (max 5) with lockout
- Permission consent dialogs for microphone, camera, notifications using browser APIs (`navigator.mediaDevices.getUserMedia`, `Notification.requestPermission`)
- Calls `/api/auth/send-otp` and `/api/auth/verify-otp`
- Beautiful security badges, error states, success states

### `backend/setup-db.sql`
Supabase schema:
- `users` (id, phone_number unique, name, bio, avatar_url, status, last_seen, language_preference, is_typing, typing_in_conversation, notification_enabled, two_factor_enabled, blocked_users uuid[], timestamps)
- `otp_codes` (id, phone_number, otp_code hash, attempt_id unique, expires_at, verified, verified_at, expired, attempts_count, timestamps)
- `conversations` (id, participant_ids uuid[], last_message, timestamps)
- `messages` (id, conversation_id, sender_id, text, message_type, voice_note_url, voice_transcription, image_url, detected_language, is_read, is_translated, translated_text, translation_language, reactions text[], edited_at, timestamps)
- `calls` (id, conversation_id, initiator_id, recipient_id, call_type, status, duration, started_at, ended_at)
- `contacts` (id, user_id, contact_id, is_favorite, timestamps)
- RLS policies on every table
- Indexes on foreign keys and frequently queried fields

### `backend/package.json`
Name: "cattleya-backend". Dependencies for all imports above. `"start": "node server.js"`, `"dev": "nodemon server.js"`.

### `backend/.env.example`
All env vars: SUPABASE_URL, SUPABASE_KEY, JWT_SECRET, ENCRYPTION_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_PHONE_NUMBER, CLAUDE_API_KEY, PORT, NODE_ENV, FRONTEND_URL.

### `docs/cattleya-logo.svg`
Stylized Cattleya orchid: pink-to-purple radial gradient circle background, 5 gold/orange orchid petals radiating from center, pink heart in middle, white sparkles, white outer ring stroke. viewBox 0 0 200 200.

### `README.md` (at repo root)
Project overview, the builder's love story, feature list, setup link to `docs/SETUP_GUIDE.md`, tech stack, screenshots placeholder, license MIT.

### Other docs (in `docs/`)
- `ABOUT_CATTLEYA.md` — origin story + mission
- `SETUP_GUIDE.md` — Supabase + Twilio + Claude API + Vercel deployment steps
- `SECURITY_AUTH_GUIDE.md` — auth flow, 2FA, permissions
- `ADVANCED_FEATURES.md` — language detection, translation, voice, presence
- `SECURITY_PRIVACY_POLICY.md` — privacy commitments
- `SECURITY_CHECKLIST.md` — pre-deployment checklist

## Step 3: Push to GitHub

Repo: `https://github.com/songchaindao-dot/cinterlingochat`

Folder structure:
- `backend/` → server.js, package.json, setup-db.sql, .env.example
- `frontend/` → ChatApp.jsx, SecureAuth.jsx
- `docs/` → all .md files + cattleya-logo.svg
- `/` → README.md, .gitignore (node_modules, .env, dist, build)

Commands to run:


If push fails with auth error, tell me to create a Personal Access Token at https://github.com/settings/tokens with `repo` scope, and use it as the password when prompted.

If `git remote add` fails because origin exists, use `git remote set-url origin <url>` instead.

## Step 4: Verify

After pushing, open https://github.com/songchaindao-dot/cinterlingochat in my browser and confirm all files are visible in the correct folders.

## Step 5: Report

Tell me:
1. Which files were missing/incomplete and got rewritten
2. The git commit hash
3. The repo URL
4. Next step (Supabase project setup)



RECOVER CODE 67NXWZLZU6ZAHDZLVVXYLVTM TWILO
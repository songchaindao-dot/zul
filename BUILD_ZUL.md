# 💕 Zul — Complete Build Instructions

You are building **Zul** — a private bilingual chatroom for two people who don't speak the same language. Named after **Zuleima**.

## The Story

The builder fell for Zuleima online but they don't speak the same language. Zul is the bridge — type, speak, share photos and videos, and the app translates everything in real-time. Built for them, shared with everyone else who loves across languages.

## What Zul Is

A 2-person private chatroom. **NO phone numbers. NO SMS. NO signup forms.** Just one person creates a room → gets a shareable URL with a private code + secret token → sends it to the other person via WhatsApp/text/email → both pick a display name and language on first visit → they're chatting.

Installable as a **PWA** on Android, iPhone, Windows, and Mac. Looks and feels like a native app once installed.

---

## Required Features (ALL must work)

### Messaging
- 💬 **Text messages** with auto-detect language + auto-translate to recipient's language
- ✏️ **Edit text messages** within 15 minutes — pushes update via Realtime, other person sees "edited" badge instantly
- 🗑️ **Delete messages** (soft delete → "this message was deleted")
- 😊 **Emoji reactions** (tap to add/remove, multiple per message)
- ✓✓ **Read receipts** (single check = sent, double check = read)
- 💬 **Typing indicators** (animated dots, with detected language label)
- 🟢 **Online / offline / last seen X min ago**

### Media (CRITICAL — read carefully)
- 🎤 **Voice notes** (microphone button) → record in browser → transcribe via Whisper → translate via Claude → both languages shown under the audio player. **AUTO-TRANSCRIBED.**
- 📷 **Photos** (attach button → "Photo") → upload from device gallery OR open camera → inline preview + caption + download button
- 🎥 **Videos** (attach button → "Video") → upload from device OR record → inline player + caption + download button
- 📎 **Files / Songs** (attach button → "File") → any file type including songs (MP3) → just shows filename + size + play/download. **NEVER transcribed even if it's audio.**
- ⬇️ **Download button** on every media message — saves with original filename to device (works on iOS Files, Android Downloads, desktop downloads folder)
- 🌐 **Captions** on photos/videos auto-translate like text messages

### Voice Notes vs. Audio File Uploads (NON-NEGOTIABLE)

These are two completely separate code paths. Never let them merge:

| Source | UI button | Endpoint | message_type | source | Whisper called? |
|---|---|---|---|---|---|
| Mic button | 🎤 | `/api/voice/finalize` | `'voice'` | `'mic_recording'` | ✅ YES |
| File picker (any audio, including songs) | ➕ → File | `/api/media/finalize` | `'file'` | `'file_upload'` | ❌ NEVER |
| Photo upload | ➕ → Photo | `/api/media/finalize` | `'photo'` | `'file_upload'` | ❌ N/A |
| Video upload | ➕ → Video | `/api/media/finalize` | `'video'` | `'file_upload'` | ❌ N/A |
| Camera capture | ➕ → Camera | `/api/media/finalize` | `'photo'` | `'camera'` | ❌ N/A |

The database has a trigger that REJECTS any attempt to set `transcription_status='pending'` or `'done'` on a `file_upload` row. If you accidentally cross the streams, Postgres will throw an error. Don't fight it — that's the safety net.

### App Behavior
- 📲 **Installable PWA** on Android, iPhone, Windows, Mac (manifest + service worker)
- 🔌 Works offline once installed (cached shell + cached recent messages)
- 🔔 Push notifications when the other person messages you (asks consent first)
- 🎨 Dark romantic theme: slate-950/purple-950 backgrounds, pink/purple gradients, rose-50 text
- 📱 Mobile-first — must work flawlessly on a phone

---

## Tech Stack (use these exact choices)

- **Frontend**: Vite + React + Tailwind CSS
- **Backend**: Vercel serverless functions (Node 18+) in `/api`
- **Database**: Supabase Postgres — already provisioned at `https://pnlpivlsxmdctqhcintb.supabase.co`. **The schema is already applied. DO NOT recreate tables. DO NOT run migrations. Just use them.**
- **Storage**: Supabase Storage. Buckets `voice_notes` and `media` — both already created, both private. Backend uses signed URLs (1-hour expiry).
- **Realtime**: Supabase Realtime (already enabled on `messages`, `members`, `typing_events`)
- **Translation**: Anthropic Claude API (use latest Sonnet model)
- **Voice transcription**: OpenAI Whisper API (`whisper-1`)
- **PWA**: `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- **Icon generation**: `sharp` (in a build script that runs once)

---

## Database Schema (READ-ONLY REFERENCE — do not modify)

The schema is already live. Here's what exists so you know what to query against:

### `rooms`
### `members`
### `messages` (31 columns total)
There's a database trigger named `trg_messages_transcription_rules` that enforces:
- File uploads can NEVER have `transcription_status` set to `pending` or `done`
- Only `source='mic_recording'` AND `message_type='voice'` rows can be transcribed

### `typing_events`
Old events older than 30 seconds should be pruned by a periodic cleanup (handle in `/api/typing.js` or via Supabase scheduled function).

### Realtime publication
Already includes: `messages`, `members`, `typing_events`. Subscribe to these from the client to get live updates.

---

## Project Structure to Create
---

## Authentication Model (No Passwords, No Signup)

This is the entire auth system:

1. On first visit to `/`, user clicks "Create a Room"
2. `POST /api/rooms/create` → server generates `room_code` (6 random chars) + `secret_token` (32 random chars) → inserts row → returns both
3. Frontend redirects to `/r/{room_code}?t={secret_token}`
4. On `/r/{room_code}?t={secret_token}`:
   - Frontend reads `room_code` from path, `t` from query
   - Generates `client_id` UUID and stores in `localStorage` as `zul_client_id` (only if not already there)
   - Calls `POST /api/rooms/join` with `{ room_code, secret_token, client_id, display_name, language, avatar_emoji }`
   - Server validates token matches, that the room has < `max_members` members (or this `client_id` already a member), upserts the member row, returns room state
5. From then on, every API call sends:
   - Header `X-Zul-Client-Id: <client_id>`
   - Query params `?room=<room_code>&t=<secret_token>`
6. Server middleware (`api/_lib/auth.js`) on every endpoint:
   - Loads room by `room_code`
   - Verifies `secret_token` matches (constant-time compare)
   - Loads member where `room_id = room.id AND client_id = X-Zul-Client-Id`
   - Attaches `{ room, member }` to request context
   - Rejects 401 if any check fails

The shared URL is the credential. That's it. (Same security model as Google Docs share links — unguessable URLs.)

---

## API Endpoint Specifications

### `POST /api/rooms/create`
Body: `{ display_name, language, avatar_emoji }`
- Generate `room_code` (6 chars from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — no ambiguous chars)
- Generate `secret_token` (32 chars from `crypto.randomBytes(24).toString('base64url')`)
- Insert into `rooms`
- Generate `client_id` for the creator and insert into `members` with given name/lang/avatar
- Return `{ room_code, secret_token, client_id, member_id, share_url }`

### `POST /api/rooms/join`
Body: `{ room_code, secret_token, client_id, display_name, language, avatar_emoji }`
- Validate room + token
- If member with `client_id` exists: update display_name/language/avatar/status='online'/last_seen=now
- Else if room has space (count(members) < max_members): insert new member
- Else: 403 "Room is full"
- Return `{ room, member, other_members }`

### `POST /api/messages/send`
Body: `{ text }`
Auth: required
- `original_language` = call `detectLanguage(text)`
- Find the OTHER member in the room → `target_lang = other.language`
- If `original_language === target_lang`: skip translation
- Else: `translated_text = translate(text, target_lang)`
- Insert message with `message_type='text'`, `source=null` (text doesn't have source), all fields
- Return inserted row (Realtime broadcasts to other client)

### `PATCH /api/messages/edit`
Body: `{ message_id, new_text }`
- Load message → assert `sender_id === current member.id`
- Assert `created_at > now() - 15 minutes`
- Append current `{at: now, original_text, translated_text}` to `edit_history`
- Re-detect language on `new_text` → re-translate
- UPDATE: `original_text=new_text`, `original_language`, `translated_text`, `translated_language`, `edited_at=now()`, `edit_count=edit_count+1`
- Realtime auto-broadcasts the UPDATE

### `DELETE /api/messages/delete`
Body: `{ message_id }`
- Assert `sender_id === current member.id`
- UPDATE `deleted_at = now()`
- Client renders deleted messages as "🗑️ This message was deleted" placeholder

### `POST /api/messages/react`
Body: `{ message_id, emoji }`
- Build entry: `${member.id}:${emoji}`
- If entry in `reactions[]`: remove it (toggle off)
- Else: append it
- UPDATE the row

### `POST /api/messages/read`
Body: `{ message_ids: [] }`
- For each message_id where `sender_id != current member.id`:
  - If `member.id` not in `read_by[]`: append + set `read_at = now()`

### `POST /api/voice/upload-url`
Body: `{ filename, mime_type }` (mime must start with `audio/`)
- Generate path: `voice_notes/{room_id}/{member_id}/{uuid}.webm`
- Return Supabase signed upload URL (15 min expiry)

### `POST /api/voice/finalize`  ⚠️ CRITICAL — only path that calls Whisper
Body: `{ storage_path, duration_ms }`
- Validate `storage_path` starts with `voice_notes/{room_id}/{member_id}/`
- If `duration_ms > 25 * 60 * 1000`: insert message with `transcription_status='too_long'`, no transcription
- Else:
  1. Insert pending row: `message_type='voice'`, `source='mic_recording'`, `voice_url=storage_path`, `voice_duration_ms`, `transcription_status='pending'`
  2. Download audio from storage (or stream signed URL to OpenAI)
  3. Call Whisper `transcriptions.create({ model: 'whisper-1', file: audio, response_format: 'verbose_json' })` → get `text` + `language`
  4. Translate transcript to other member's language
  5. UPDATE row: `original_text=transcript`, `original_language`, `translated_text`, `translated_language`, `translation_confidence`, `translation_model='claude'`, `transcription_status='done'`
- Realtime broadcasts pending row immediately, then the update with text

### `POST /api/media/upload-url`
Body: `{ filename, mime_type, size_bytes }`
- Reject if size > 50MB
- Generate path: `media/{room_id}/{member_id}/{uuid}{ext}`
- Return signed upload URL (15 min)

### `POST /api/media/finalize`  ⚠️ CRITICAL — NEVER calls Whisper
Body: `{ storage_path, mime_type, size_bytes, filename, width, height, duration_ms?, thumbnail_path?, caption?, source }`
- `source` MUST be one of `'file_upload'` or `'camera'`. Reject anything else.
- Determine `message_type` from mime:
  - `image/*` → `'photo'`
  - `video/*` → `'video'`
  - everything else (including `audio/*`) → `'file'`
- If caption provided and non-empty: detect language + translate
- Insert message row. **Do NOT set transcription_status to anything other than 'none'.** The DB trigger will reject it.
- Realtime broadcasts.

### `POST /api/translate`
Body: `{ text, target_language }`
- Just calls Claude, returns `{ translated, detected_language, confidence }`
- Used for the typing preview ("she'll see this as: ...") if you want it

### `POST /api/detect-language`
Body: `{ text }`
- Returns `{ language: 'es', name: 'Spanish', confidence: 0.99 }`

### `POST /api/typing`
Body: `{ is_typing, detected_language? }`
- INSERT into typing_events
- Realtime broadcasts to other client

### `POST /api/push/subscribe`
Body: `{ subscription }` (PushSubscription from `pushManager.subscribe()`)
- UPDATE the member's `push_subscription` column

---

## Critical Implementation Rules

### Service role key
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Used only inside `/api/_lib/supabase.js`.
- NEVER expose it via `import.meta.env` or any frontend code.
- Frontend uses ONLY `/api/*` endpoints — never talks to Supabase directly except for Realtime subscriptions (which use the anon key, harmless because RLS denies anon reads).

### Realtime from the client
- Use anon key + Supabase JS client just for Realtime subscription
- Subscribe to `messages`, `members`, `typing_events` filtered by `room_id`
- For initial data load: always go through `/api/messages/list` (which uses service role and returns signed URLs)

### Photos
- Composer attach button → "Photo" → `<input type="file" accept="image/*" capture="environment">` (camera on phone, gallery if dismissed)
- Before upload: client generates 400px-wide JPEG thumbnail using canvas, uploads BOTH thumbnail and full image
- Show inline thumbnail in chat → tap → fullscreen viewer with pinch-zoom

### Videos
- Composer attach button → "Video" → `<input type="file" accept="video/*" capture="user">`
- Cap at 50MB. Show progress bar during upload.
- Generate thumbnail client-side: load video → seek to 1s → `canvas.drawImage(video, ...)` → toBlob → upload
- Show poster image in chat → tap to play inline (HTML5 `<video controls>`)

### Voice notes
- Composer mic button → press to start (or hold-to-record on mobile)
- `MediaRecorder` with `mimeType: 'audio/webm;codecs=opus'`
- Show waveform during recording (Web Audio API `AnalyserNode`)
- On send: upload via signed URL → call `/api/voice/finalize` → message appears
- Pending state shows "transcribing..." then updates to show transcript + translation

### Edit messages (MUST be real-time)
- Long-press own message → menu shows "Edit" if within 15 min
- Modal opens with current text → user edits → tap save
- API call → DB updates → Realtime UPDATE event → other client's `useMessages` hook receives event → MessageBubble re-renders with new text + "edited" badge
- Test this end-to-end: open in two browsers, edit on one, see the change INSTANTLY on the other

### Downloads
- `lib/download.js`:
```js
  export async function download(url, filename) {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }
```
- Works on iOS Safari (saves to Files), Android (Downloads folder), desktop (Downloads folder)

### PWA configuration

`vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Zul — Bilingual chat for two',
        short_name: 'Zul',
        description: 'Private bilingual chatroom inspired by Zuleima',
        theme_color: '#ec4899',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/sign\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'media-cache', expiration: { maxAgeSeconds: 3600 } }
          }
        ]
      }
    })
  ]
});
```

`index.html` head needs:
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Zul">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#ec4899">
```

`InstallPrompt.jsx`: capture `beforeinstallprompt` event for Android/desktop. For iOS, show fallback UI: "Tap Share → Add to Home Screen".

### Icon generation

`scripts/generate-icons.js` (run once, then commit the PNGs):
```js
import sharp from 'sharp';
import fs from 'fs';

const svg = fs.readFileSync('src/components/zul-logo.svg');

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 512, name: 'icon-maskable.png' }, // with safe area padding
  { size: 180, name: 'apple-touch-icon.png' },
];

for (const { size, name } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(`public/${name}`);
}
```

---

## Branding

- **Name**: Zul
- **Tagline**: "Two hearts. Two languages. One conversation."
- **Theme**: dark slate-950 + purple-950, pink (`#ec4899`) → purple (`#a855f7`) gradients, rose-50 text
- **Logo**: orchid (Cattleya orchid — keep this nod). Pink/purple gradient circle background, gold/orange petals radiating, pink heart in center, white sparkles. Use the existing logo from `/mnt/skills` if available, otherwise create.

### Landing page copy (English)
> # Zul
>
> **Two hearts. Two languages. One conversation.**
>
> Zul was made for Zuleima — and for everyone who falls in love across languages. Type, speak, share photos and videos. We translate. You connect.
>
> [Create a private chatroom →]

### About page copy
> ## The Story
>
> The builder met Zuleima online. They didn't speak the same language. Translation apps got in the way every time they wanted to say something real.
>
> So he built Zul. A private chatroom for two — where every message, every voice note, every caption automatically translates between your languages. Where you can actually be yourself, in your own words, and still be understood.
>
> Zul is yours now too.
>
> *— With love, the builder*

---

## Environment Variables (`.env.example`)

---

## Tasks — Execute In This Order

1. **Initialize project**:
```bash
   cd "C:\Users\7 RECORDS\Downloads\zul"
   npm create vite@latest . -- --template react
```
   (the `.` means "use the current directory", agree to overwrite if prompted)

2. **Install dependencies**:
```bash
   npm install @supabase/supabase-js @anthropic-ai/sdk openai react-router-dom web-push
   npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa sharp @types/web-push
   npx tailwindcss init -p
```

3. **Configure Tailwind** — update `tailwind.config.js` content paths, add custom colors for the dark romantic theme.

4. **Build `api/_lib/` helpers first** in this order:
   - `supabase.js` (service role client)
   - `auth.js` (validate room + token + client_id)
   - `claude.js` (translate function + detectLanguage function)
   - `whisper.js` (transcribe function)
   - `signed-url.js` (createSignedUrl + createSignedUploadUrl)
   - `languages.js` (constants)

5. **Build API endpoints** in this order:
   - `rooms/create.js`, `rooms/join.js`
   - `messages/send.js`, `messages/list.js`
   - `messages/edit.js`, `messages/delete.js`, `messages/react.js`, `messages/read.js`
   - `voice/upload-url.js`, `voice/finalize.js`
   - `media/upload-url.js`, `media/finalize.js`
   - `translate.js`, `detect-language.js`, `typing.js`
   - `members/update.js`, `members/presence.js`
   - `push/subscribe.js`, `push/send.js`

6. **Build client `lib/`** in this order:
   - `client-id.js`, `languages.js`, `format.js`
   - `api.js` (fetch wrappers), `download.js`, `thumbnail.js`, `audio.js`

7. **Build hooks** in this order:
   - `useRoom.js`, `useMessages.js`, `usePresence.js`, `useTyping.js`
   - `useSignedUrl.js`, `usePushNotifications.js`, `useInstall.js`

8. **Build components** in this order:
   - `ZulLogo.jsx`
   - Message types: `TextMessage`, `VoiceMessage`, `PhotoMessage`, `VideoMessage`, `FileMessage`, `MessageBubble`, `MessageList`
   - Composer: `VoiceRecorder`, `AttachmentMenu`, `Composer`
   - Modals: `EditMessageModal`, `ReactionPicker`
   - Status: `TypingIndicator`, `PresenceDot`
   - Sharing: `ShareRoomLink`, `InstallPrompt`, `About`

9. **Build pages**: `Landing.jsx`, `Setup.jsx`, `Chat.jsx`, `Install.jsx` and wire up routing in `App.jsx`.

10. **Configure Vite + PWA** with `vite.config.js` from above.

11. **Generate icons**: write `scripts/generate-icons.js`, create `src/components/zul-logo.svg`, run the script, commit the PNGs.

12. **Test locally**:
```bash
    vercel dev
```
    Open http://localhost:3000 (or whatever port Vercel CLI shows). Should open landing page.
    
    **Critical end-to-end test**: open the URL in TWO browsers (Chrome + Firefox, or normal + incognito). One creates a room, copies the share URL, pastes into the other. Both pick names and languages. Then test:
    - Send text → other side sees it instantly with translation
    - Edit a text message → other side sees update with "edited" badge
    - Delete a message → other side sees "this message was deleted"
    - Add reaction → other side sees emoji
    - Send voice note → other side sees pending → then transcript + translation
    - Send photo → both can view + download
    - Send video → both can play + download
    - Send a file (try an MP3) → both can play/download → verify it does NOT have a transcript
    - Typing indicator shows on other side
    - Online/offline dot updates when one closes the tab
    - Read receipt updates when message viewed
    
    **Don't proceed to deployment until ALL of these work.**

13. **Initialize git and push to GitHub**:
```bash
    git init
    git remote add origin https://github.com/songchaindao-dot/cinterlingochat.git
    git checkout -b zul
    git add -A
    git commit -m "💕 Zul v1.0: Bilingual PWA chatroom for Zuleima — text, voice, photos, videos, edit, real-time"
    git push -u origin zul
```
    If push fails with auth error: tell user to create a Personal Access Token at https://github.com/settings/tokens with `repo` scope and use it as the password.

14. **Deploy to Vercel**:
```bash
    vercel
```
    Follow prompts. Then add env vars:
```bash
    vercel env add SUPABASE_URL
    vercel env add SUPABASE_ANON_KEY
    vercel env add SUPABASE_SERVICE_ROLE_KEY
    vercel env add ANTHROPIC_API_KEY
    vercel env add OPENAI_API_KEY
    vercel env add VAPID_PUBLIC_KEY
    vercel env add VAPID_PRIVATE_KEY
    vercel env add VAPID_SUBJECT
    vercel env add APP_URL    # set to the Vercel URL after first deploy
    vercel env add NODE_ENV   # production
```
    Then deploy production:
```bash
    vercel --prod
```

15. **When done, report to the user**:
    - ✅ Local dev URL where it's running
    - ✅ Production URL (https://zul-something.vercel.app or whatever)
    - ✅ Step-by-step install instructions for iPhone, Android, Windows, Mac (one paragraph each)
    - ✅ How to share with Zuleima: "Visit your URL → Create Room → Copy share link → Send via WhatsApp"
    - ✅ All env var names actually set
    - ✅ Confirmation that all 13 features in section "Required Features" are working

---

## Hard Rules

- **NEVER recreate Supabase tables.** Schema is already applied. Just query.
- **NEVER expose** `SUPABASE_SERVICE_ROLE_KEY` to the frontend.
- **NEVER call Whisper** from the `/api/media/finalize` endpoint, even for audio files. The DB trigger enforces this — respect it.
- **ALWAYS validate** the 15-minute edit window server-side. Never trust client.
- **ALWAYS translate** text/captions/transcripts when languages differ. Skip translation only when same language or text is empty.
- **ALWAYS use signed URLs** for media — buckets are private.
- **ALWAYS test edit-message real-time** in two browsers before declaring done.
- **Mobile-first.** Test every screen on a phone-sized viewport.

---

## If Something Goes Wrong

- **Whisper rejects file**: check it's < 25MB and < 25 minutes. Set `transcription_status='too_long'` and don't crash.
- **Translation fails**: insert message anyway with `translated_text=null`. UI shows "(translation unavailable)".
- **Realtime disconnects**: reconnect with backoff. On reconnect, refetch latest 50 messages to fill any gap.
- **Upload fails mid-way**: client retries with exponential backoff. Show error toast, allow re-send.
- **Two people both creating rooms**: that's fine, they're separate rooms. Each only joins one room.
- **One person opens room URL on two devices**: works fine — both devices share the same `client_id` if same browser, or separate `client_id` and become "two members" if `max_members > 2`. For Zul keep `max_members=2` so the second device on a different browser would be rejected. (Add explicit handling: same `client_id` re-joining is allowed even if room full.)

---

## When You're Done

Show me a working production URL and confirmation that everything below works in two browsers simultaneously:

- [ ] Create room
- [ ] Share link works (copy URL, open in second browser, join)
- [ ] Both members visible with names/languages/avatars
- [ ] Send text + translation appears
- [ ] Edit text → other side updates instantly
- [ ] Delete text → "deleted" placeholder shows
- [ ] Reaction added/removed
- [ ] Read receipt (✓ → ✓✓)
- [ ] Typing indicator shows + clears
- [ ] Online dot updates when other tab closes
- [ ] Send voice note → transcribes → translates
- [ ] Send photo → preview + caption + download works
- [ ] Send video → plays + caption + download works
- [ ] Send MP3 file → plays + downloads, NO transcription happens
- [ ] PWA install prompt appears on Chrome desktop and Android
- [ ] iOS install instructions visible on Safari iOS

Once all 16 boxes are checked, share the URL with me. We ship. 💕


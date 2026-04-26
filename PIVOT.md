# PIVOT: Switch from paid APIs to free tools

The plan changed. We are NOT using Anthropic Claude or OpenAI Whisper anymore. Use ONLY:
- Google Gemini API (free tier) for translation + language detection
- Web Speech API (browser built-in) for voice transcription
- Supabase + Vercel (already planned)

Make these exact changes before creating the .env file:

## 1. Remove paid SDKs
Run: `npm uninstall @anthropic-ai/sdk openai`

## 2. Install Gemini
Run: `npm install @google/generative-ai`

## 3. Replace api/_lib/claude.js with api/_lib/gemini.js

```js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function translateText(text, targetLanguage) {
  const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text — no quotes, no explanations, no markdown.\n\nText: ${text}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function detectLanguage(text) {
  const prompt = `Detect the language of this text. Return ONLY a JSON object exactly like {"language":"es","name":"Spanish","confidence":0.99}. No markdown, no backticks.\n\nText: ${text}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  try { return JSON.parse(raw); }
  catch { return { language: 'unknown', name: 'Unknown', confidence: 0 }; }
}

export async function translateWithDetection(text, targetLanguage) {
  const prompt = `Detect this text's language and translate it to ${targetLanguage}. Return ONLY a JSON object exactly like {"detected_language":"es","detected_name":"Spanish","translated":"Hello world","confidence":0.99}. No markdown, no backticks.\n\nText: ${text}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  try { return JSON.parse(raw); }
  catch { return { detected_language: 'unknown', detected_name: 'Unknown', translated: text, confidence: 0 }; }
}
```

## 4. Delete api/_lib/whisper.js entirely. We are NOT using Whisper.

## 5. Update api/voice/finalize.js
Do NOT call Whisper. The browser already transcribed the audio. Accept a `transcript` field in the POST body. Just translate it via Gemini and insert the message.

New body shape:

Logic:
- Validate storage_path
- If duration_ms > 25 minutes: insert with transcription_status='too_long'
- Else if no transcript provided: insert with transcription_status='skipped' (audio still plays, no text)
- Else:
  1. Find other member's language
  2. Call gemini.translateText(transcript, otherLang) if languages differ
  3. Insert message: message_type='voice', source='mic_recording', voice_url=storage_path, voice_duration_ms, original_text=transcript, original_language, translated_text, translated_language=otherLang, translation_model='gemini-2.0-flash', transcription_status='done'

## 6. Update src/components/VoiceRecorder.jsx

While `MediaRecorder` records audio, ALSO start `window.SpeechRecognition || window.webkitSpeechRecognition` with `continuous: true, interimResults: true, lang: <my member language>`.

Show live interim transcript while recording for UX feedback.

When user stops recording:
- Stop both MediaRecorder and SpeechRecognition
- Get the final transcript text
- Upload audio blob via /api/voice/upload-url
- Call /api/voice/finalize with `{ storage_path, duration_ms, transcript: finalTranscript, original_language: myLanguage }`

If `SpeechRecognition` is not available (e.g. desktop Firefox):
- Skip the recognition object entirely
- Send finalize with no transcript field
- Show toast: "Voice transcription works best in Chrome or Safari. Audio sent without text."

## 7. Update all imports
Search and replace across api/ and src/:
- Any import from './claude' or '../claude' → change to './gemini' or '../gemini'
- Any import from './whisper' → DELETE that line
- Any reference to ANTHROPIC_API_KEY → change to GEMINI_API_KEY
- Any reference to OPENAI_API_KEY → DELETE

## 8. Update .env.example
Remove ANTHROPIC_API_KEY and OPENAI_API_KEY lines.
Add: `GEMINI_API_KEY=<get from https://aistudio.google.com/app/apikey - free, no credit card>`

## 9. Now create the local .env file
Ask me for these four values one at a time:
1. SUPABASE_ANON_KEY (anon/public key)
2. SUPABASE_SERVICE_ROLE_KEY (service_role secret)
3. GEMINI_API_KEY (starts with AIza)
4. (Optional) skip web push for now — set VAPID values to empty strings

Pre-fill these without asking:
- SUPABASE_URL=https://pnlpivlsxmdctqhcintb.supabase.co
- APP_URL=http://localhost:5173
- NODE_ENV=development

## 10. Generate VAPID keys
Run: `npx web-push generate-vapid-keys`
Add the output to .env as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
Set VAPID_SUBJECT=mailto:zul@local.test

## 11. Start dev server
Run: `vercel dev`
Confirm http://localhost:3000/api/health returns `{"status":"OK"}` (or whatever the health endpoint returns).

## 12. Report back to me
- Confirm all 11 steps above completed
- Show me the dev server URL it's running on
- Confirm /api/health responds
- List any files changed


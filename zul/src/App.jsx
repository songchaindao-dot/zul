import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Check, CheckCheck, ChevronDown, Copy, Download, Globe,
  Link, Mic, Paperclip, Send, X,
} from 'lucide-react';
import heroPhoto from './assets/IMan and Zul.jpg';
import InstallPrompt from './components/InstallPrompt.jsx';
import { useInstall } from './hooks/useInstall.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://pnlpivlsxmdctqhcintb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
];

const EMOJIS = ['💕','🌸','🦋','💜','✨','💫','🌙','🫶','🌹','💎','🔥','🌊','👑','🦅','⭐','😍'];

const LANG_TO_BCP47 = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR',
  ar: 'ar-SA', zh: 'zh-CN', hi: 'hi-IN', sw: 'sw-KE',
  de: 'de-DE', it: 'it-IT',
};

function getClientId() {
  let id = localStorage.getItem('zul_client_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('zul_client_id', id); }
  return id;
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(secs) {
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

function ZulLogo({ size = 72 }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="zul-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </radialGradient>
        <linearGradient id="zul-petal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#zul-bg)" opacity="0.95" />
      <ellipse cx="70" cy="80" rx="18" ry="35" fill="url(#zul-petal)" opacity="0.9" transform="rotate(-45 70 80)" />
      <ellipse cx="130" cy="80" rx="18" ry="35" fill="url(#zul-petal)" opacity="0.9" transform="rotate(45 130 80)" />
      <ellipse cx="100" cy="50" rx="18" ry="35" fill="url(#zul-petal)" opacity="0.95" />
      <ellipse cx="80" cy="125" rx="16" ry="30" fill="url(#zul-petal)" opacity="0.85" transform="rotate(-60 80 125)" />
      <ellipse cx="120" cy="125" rx="16" ry="30" fill="url(#zul-petal)" opacity="0.85" transform="rotate(60 120 125)" />
      <circle cx="100" cy="95" r="22" fill="#f59e0b" opacity="0.95" />
      <circle cx="100" cy="95" r="18" fill="#fbbf24" />
      <path d="M100 105 C95 115,85 115,85 105 C85 100,88 95,95 95 C98 95,100 97,100 97 C100 97,102 95,105 95 C112 95,115 100,115 105 C115 115,105 115,100 105 Z" fill="#ec4899" opacity="0.9" />
      <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="3" opacity="0.25" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex justify-start px-2">
      <div className="rounded-2xl rounded-tl-sm bg-purple-900/60 border border-purple-700/30 px-4 py-3">
        <div className="flex gap-1.5 items-center">
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '120ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: '240ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Sidebar (desktop only) ────────────────────────────────────────────────────
function Sidebar({ partner, myMember, shareLink, roomCode, copied, onCopy, onLeave }) {
  return (
    <aside className="hidden md:flex flex-col w-72 shrink-0 bg-[#12002b] border-r border-white/10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <ZulLogo size={32} />
        <div>
          <span className="text-xl font-black bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            Zul
          </span>
          <p className="text-[10px] text-purple-400 leading-none mt-0.5">Private bilingual chat</p>
        </div>
      </div>

      {/* Me */}
      {myMember && (
        <div className="px-4 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-purple-500 mb-2 font-semibold">You</p>
          <div className="flex items-center gap-3 rounded-2xl bg-violet-900/20 border border-violet-700/20 px-3 py-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-700 flex items-center justify-center text-lg shrink-0">
              {myMember.avatar_emoji || '💕'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{myMember.display_name}</p>
              <p className="text-[11px] text-purple-400">{LANGUAGES.find(l => l.code === myMember.language)?.label || myMember.language}</p>
            </div>
          </div>
        </div>
      )}

      {/* Partner */}
      <div className="px-4 pt-4">
        <p className="text-[10px] uppercase tracking-widest text-purple-500 mb-2 font-semibold">Partner</p>
        {partner ? (
          <div className="flex items-center gap-3 rounded-2xl bg-violet-900/20 border border-violet-700/20 px-3 py-2.5">
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-500 to-violet-700 flex items-center justify-center text-lg">
                {partner.avatar_emoji || '💜'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#12002b] bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{partner.display_name}</p>
              <p className="text-[11px] text-emerald-400">{LANGUAGES.find(l => l.code === partner.language)?.label || partner.language} · online</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-purple-900/20 border border-dashed border-purple-700/30 px-3 py-4 text-center">
            <p className="text-xs text-purple-400">Waiting for partner to join…</p>
          </div>
        )}
      </div>

      {/* Share link */}
      {shareLink && (
        <div className="px-4 pt-5">
          <p className="text-[10px] uppercase tracking-widest text-purple-500 mb-2 font-semibold">Invite link</p>
          <div className="rounded-2xl bg-purple-900/20 border border-purple-700/20 p-3">
            <p className="text-[11px] text-purple-300 truncate mb-2.5 font-mono">{shareLink}</p>
            <button
              onClick={() => onCopy(shareLink)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 text-xs text-violet-200 py-2 transition"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      )}

      {/* Room code */}
      <div className="px-4 pt-4">
        <p className="text-[10px] uppercase tracking-widest text-purple-500 mb-2 font-semibold">Room</p>
        <span className="font-mono text-sm font-bold text-violet-300 bg-violet-900/30 border border-violet-700/20 px-3 py-1.5 rounded-xl inline-block">
          {roomCode}
        </span>
      </div>

      <div className="flex-1" />

      {/* Leave */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={onLeave}
          className="w-full text-xs text-purple-500 hover:text-purple-300 transition py-2"
        >
          ← Leave room
        </button>
      </div>
    </aside>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { isInstallable, install: triggerInstall } = useInstall();
  const [view, setView] = useState('splash');

  const [roomCode, setRoomCode] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [secretToken, setSecretToken] = useState(null);
  const clientId = useRef(getClientId()).current;

  const [myMember, setMyMember] = useState(null);
  const [partner, setPartner] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [translatedOpen, setTranslatedOpen] = useState({});

  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [recTranscript, setRecTranscript] = useState('');
  const mediaRecRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRef = useRef(null);
  const recTimerRef = useRef(null);

  const [setupName, setSetupName] = useState('');
  const [setupLang, setSetupLang] = useState('en');
  const [setupEmoji, setSetupEmoji] = useState('💕');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      const token = params.get('t');

      if (room && token) {
        setRoomCode(room);
        setSecretToken(token);
        const saved = localStorage.getItem(`zul_member_${room}`);
        const savedRoomId = localStorage.getItem(`zul_room_id_${room}`);
        if (saved && savedRoomId) {
          setMyMember(JSON.parse(saved));
          setRoomId(savedRoomId);
          setShareLink(`${window.location.origin}?room=${room}&t=${token}`);
          setView('chat');
        } else {
          setView('setup');
        }
      } else {
        const lastRoom = localStorage.getItem('zul_last_room');
        const lastToken = localStorage.getItem('zul_last_token');
        if (lastRoom && lastToken) {
          const saved = localStorage.getItem(`zul_member_${lastRoom}`);
          const savedRoomId = localStorage.getItem(`zul_room_id_${lastRoom}`);
          if (saved && savedRoomId) {
            setRoomCode(lastRoom);
            setSecretToken(lastToken);
            setMyMember(JSON.parse(saved));
            setRoomId(savedRoomId);
            setShareLink(`${window.location.origin}?room=${lastRoom}&t=${lastToken}`);
            window.history.replaceState({}, '', `?room=${lastRoom}&t=${lastToken}`);
            setView('chat');
            return;
          }
        }
        setView('landing');
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!roomId || view !== 'chat') return;
    loadMessages();
    loadMembers();
    const pollId = setInterval(loadMessages, 2500);

    const channel = supabase
      .channel(`zul-room-${roomId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages((prev) => prev.find((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === payload.new.id ? payload.new : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_events', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.new && payload.new.client_id !== clientId) setPartnerTyping(!!payload.new.is_typing);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${roomId}` }, (payload) => {
        if (payload.new && payload.new.client_id !== clientId) setPartner(payload.new);
      })
      .subscribe();

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [roomId, roomCode, secretToken, view]);

  useEffect(() => {
    if (!error || view !== 'chat') return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error, view]);

  async function loadMessages() {
    if (!roomCode || !secretToken) return;
    try {
      const res = await fetch(`/api/messages/list?room=${encodeURIComponent(roomCode)}&t=${encodeURIComponent(secretToken)}&limit=100`, {
        headers: { 'X-Zul-Client-Id': clientId },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch {
      // Keep UI responsive if network briefly drops.
    }
  }

  async function loadMembers() {
    const { data } = await supabase.from('members').select('*').eq('room_id', roomId);
    if (data) {
      const me = data.find((m) => m.client_id === clientId);
      const them = data.find((m) => m.client_id !== clientId);
      if (me) setMyMember((prev) => ({ ...prev, ...me }));
      if (them) setPartner(them);
    }
  }

  async function createRoom() {
    setLoading(true);
    setError('');
    try {
      const roomData = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
      }).then((r) => r.json());

      const code = roomData.room_code;
      const token = roomData.secret_token;
      const id = roomData.room_id;
      const link = `${window.location.origin}?room=${code}&t=${token}`;

      localStorage.setItem('zul_last_room', code);
      localStorage.setItem('zul_last_token', token);
      localStorage.setItem(`zul_room_id_${code}`, id);
      window.history.pushState({}, '', `?room=${code}&t=${token}`);

      if (setupName.trim()) {
        const joinData = await fetch(`/api/rooms/join?room=${code}&t=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
          body: JSON.stringify({ display_name: setupName.trim(), language: setupLang, emoji_avatar: setupEmoji }),
        }).then((r) => r.json());

        const member = { id: joinData.member?.id, display_name: setupName.trim(), language: setupLang, avatar_emoji: setupEmoji, client_id: clientId, room_id: id };
        setRoomCode(code); setSecretToken(token); setRoomId(id);
        setMyMember(member); setShareLink(link);
        localStorage.setItem(`zul_member_${code}`, JSON.stringify(member));
        setView('chat');
      } else {
        setRoomCode(code); setSecretToken(token); setRoomId(id); setShareLink(link);
        setView('setup');
      }
    } catch {
      setError('Could not create room. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    if (!setupName.trim()) { setError('Enter your display name'); return; }
    setLoading(true); setError('');
    try {
      const data = await fetch(`/api/rooms/join?room=${roomCode}&t=${secretToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        body: JSON.stringify({ display_name: setupName.trim(), language: setupLang, emoji_avatar: setupEmoji }),
      }).then((r) => r.json());

      const id = data.room_id || roomId;
      const link = `${window.location.origin}?room=${roomCode}&t=${secretToken}`;
      const member = { id: data.member?.id, display_name: setupName.trim(), language: setupLang, avatar_emoji: setupEmoji, client_id: clientId, room_id: id };

      setRoomId(id);
      localStorage.setItem(`zul_room_id_${roomCode}`, id);
      localStorage.setItem(`zul_member_${roomCode}`, JSON.stringify(member));
      localStorage.setItem('zul_last_room', roomCode);
      localStorage.setItem('zul_last_token', secretToken);
      setMyMember(member); setShareLink(link);
      setView('chat');
    } catch (e) {
      setError(e.message || 'Could not join. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = messageInput.trim();
    if (!text || !roomId) return;
    const draft = text;
    setError('');
    setMessageInput('');
    stopTyping();
    try {
      const res = await fetch(`/api/messages/send?room=${roomCode}&t=${secretToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        body: JSON.stringify({ text, original_language: myMember?.language || 'en' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Message failed');
      }
      await loadMessages();
    } catch (err) {
      setMessageInput(draft);
      setError(err?.message || 'Message failed');
    }
  }

  function onInput(val) {
    setMessageInput(val);
    if (val.length > 0) startTyping(); else stopTyping();
  }

  async function sendTypingState(isTyping) {
    if (!roomCode || !secretToken) return;
    try {
      await fetch(`/api/typing?room=${encodeURIComponent(roomCode)}&t=${encodeURIComponent(secretToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        body: JSON.stringify({ is_typing: isTyping }),
      });
    } catch {
      // Typing is best-effort; ignore transient failures.
    }
  }

  function startTyping() {
    sendTypingState(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 3000);
  }

  function stopTyping() {
    clearTimeout(typingTimeoutRef.current);
    if (roomId) sendTypingState(false);
  }

  function toggleTranslation(id) {
    setTranslatedOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function leaveRoom() {
    setView('landing');
    window.history.pushState({}, '', '/');
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      mediaRecRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecRef.current.start(100);

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        speechRef.current = new SR();
        speechRef.current.continuous = true;
        speechRef.current.interimResults = false;
        speechRef.current.lang = LANG_TO_BCP47[myMember?.language] || 'en-US';
        let transcript = '';
        speechRef.current.onresult = (ev) => {
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) transcript += ev.results[i][0].transcript + ' ';
          }
          setRecTranscript(transcript.trim());
        };
        speechRef.current.start();
      }
      setRecording(true); setRecSecs(0);
      recTimerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch { setError('Microphone access denied'); }
  }

  async function stopAndSendVoice() {
    clearInterval(recTimerRef.current);
    if (speechRef.current) { try { speechRef.current.stop(); } catch {} }
    const finalTranscript = recTranscript;
    const durationMs = recSecs * 1000;
    setRecording(false); setRecSecs(0); setRecTranscript('');
    if (!mediaRecRef.current) return;

    const blob = await new Promise((resolve) => {
      mediaRecRef.current.onstop = () => resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      mediaRecRef.current.stop();
      mediaRecRef.current.stream?.getTracks().forEach((t) => t.stop());
    });

    const storagePath = `${roomCode}/${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage.from('voice_notes').upload(storagePath, blob, { contentType: 'audio/webm' });
    if (upErr) { setError('Voice upload failed'); return; }
    const { data: { signedUrl } } = await supabase.storage.from('voice_notes').createSignedUrl(storagePath, 604800);

    await fetch(`/api/voice/finalize?room=${roomCode}&t=${secretToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
      body: JSON.stringify({ voice_url: signedUrl, transcript: finalTranscript, duration_ms: durationMs }),
    });
    loadMessages();
  }

  function cancelRecording() {
    clearInterval(recTimerRef.current);
    if (speechRef.current) { try { speechRef.current.stop(); } catch {} }
    if (mediaRecRef.current) { try { mediaRecRef.current.stop(); mediaRecRef.current.stream?.getTracks().forEach((t) => t.stop()); } catch {} }
    setRecording(false); setRecSecs(0); setRecTranscript('');
  }

  async function handleFileAttach(e) {
    const file = e.target.files?.[0];
    if (!file || !roomId) return;
    const ext = file.name.split('.').pop();
    const storagePath = `${roomCode}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('media').upload(storagePath, file, { contentType: file.type });
    if (upErr) { setError('File upload failed'); return; }
    const { data: { signedUrl } } = await supabase.storage.from('media').createSignedUrl(storagePath, 604800);
    await fetch(`/api/messages/send?room=${roomCode}&t=${secretToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
      body: JSON.stringify({ media_url: signedUrl, media_type: file.type, media_name: file.name, source: 'file_upload' }),
    });
    loadMessages();
    e.target.value = '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'splash') {
    return (
      <div className="fixed inset-0 overflow-hidden bg-[#0a0018]">
        <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" style={{ objectPosition: 'center 35%' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0018] via-[#0a0018]/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          <div className="rounded-[2rem] border border-violet-500/30 bg-violet-900/20 p-5 backdrop-blur-xl shadow-2xl shadow-violet-900/50">
            <ZulLogo size={80} />
          </div>
          <h1 className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-pink-300 bg-clip-text text-5xl font-black tracking-tight text-transparent">
            Zul
          </h1>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'landing') {
    // Card styles reused inline
    const cardBg = 'rgba(12,0,36,0.82)';
    const cardBorder = '1.5px solid rgba(139,92,246,0.25)';

    return (
      <>
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#07001a]">

        {/* ── FULL-PAGE PHOTO BACKGROUND ── */}
        <img
          src={heroPhoto}
          alt="IMan and Zuleima"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '50% 8%' }}
        />

        {/* Subtle dark vignette so text is readable — NOT a purple block */}
        <div className="absolute inset-0"
             style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.55) 100%)' }} />

        {/* ── CONTENT LAYER ── */}
        <div className="relative z-10 min-h-[100dvh] flex flex-col md:flex-row md:items-stretch">

          {/* LEFT / TOP — open space (logo lives here) */}
          <div className="flex-1 flex flex-col p-5 md:p-8">
            {/* Logo pill */}
            <div className="self-start flex items-center gap-2 rounded-full px-4 py-2"
                 style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(16px)',
                           WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <ZulLogo size={20} />
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 16,
                             background: 'linear-gradient(90deg,#e9d5ff,#f5d0fe)',
                             WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Zul
              </span>
            </div>
          </div>

          {/* RIGHT / BOTTOM — onboarding card */}
          {/* Mobile: pinned to bottom. Desktop: right column, vertically centered */}
          <div className="shrink-0 w-full md:w-[420px] flex flex-col justify-end md:justify-center p-4 pb-6 md:p-10">
            <div className="rounded-[28px] p-6 md:p-7"
                 style={{ background: cardBg, border: cardBorder,
                           backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
                           boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.1) inset' }}>

              {/* Story — inside the card at top */}
              <div className="mb-6 pb-5"
                   style={{ borderBottom: '1px solid rgba(139,92,246,0.18)' }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                             fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
                  <span style={{ color: '#f0abfc', fontWeight: 700 }}>Zuleima</span> &amp;{' '}
                  <span style={{ color: '#c4b5fd', fontWeight: 700 }}>IMan</span> found each other across
                  the world - her words in one language, his in another. Their hearts spoke fluently.
                </p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400,
                             fontSize: 11.5, lineHeight: 1.6, color: 'rgba(196,181,253,0.55)',
                             marginTop: 7, marginBottom: 0 }}>
                  Every message was a bridge. Zul was built so they could always speak the same language. 💕
                </p>
              </div>

              {/* Heading */}
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 22,
                            color: '#fff', margin: '0 0 3px', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                Start your private chat
              </h2>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
                           fontSize: 13, color: '#a78bfa', margin: '0 0 20px' }}>
                No account needed - just you two.
              </p>

              {error && (
                <div style={{ background: 'rgba(127,29,29,0.45)', border: '1px solid rgba(239,68,68,0.3)',
                               borderRadius: 14, padding: '11px 15px', marginBottom: 14 }}>
                  <p style={{ color: '#fca5a5', fontSize: 13, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</p>
                </div>
              )}

              {/* Name */}
              <div style={{ marginBottom: 11 }}>
                <label style={{ display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif",
                                 fontWeight: 700, fontSize: 10, letterSpacing: '0.13em',
                                 color: '#a78bfa', textTransform: 'uppercase', marginBottom: 7 }}>
                  Your name
                </label>
                <input
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setupName.trim() && createRoom()}
                  placeholder="e.g. IMan or Zuleima"
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 14,
                            border: '1.5px solid rgba(124,58,237,0.32)',
                            background: 'rgba(88,28,135,0.22)', padding: '13px 16px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
                            fontSize: 14, color: '#fff', outline: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(167,139,250,0.75)'; e.target.style.background = 'rgba(88,28,135,0.38)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(124,58,237,0.32)'; e.target.style.background = 'rgba(88,28,135,0.22)'; }}
                />
              </div>

              {/* Language */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif",
                                 fontWeight: 700, fontSize: 10, letterSpacing: '0.13em',
                                 color: '#a78bfa', textTransform: 'uppercase', marginBottom: 7 }}>
                  Your language
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={setupLang}
                    onChange={(e) => setSetupLang(e.target.value)}
                    style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none',
                              borderRadius: 14, border: '1.5px solid rgba(124,58,237,0.32)',
                              background: 'rgba(88,28,135,0.22)', padding: '13px 42px 13px 16px',
                              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
                              fontSize: 14, color: '#fff', outline: 'none', colorScheme: 'dark', cursor: 'pointer' }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code} style={{ background: '#1a0040', color: '#fff' }}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)', color: '#a78bfa', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => { if (!setupName.trim()) { setError('Enter your name first'); return; } createRoom(); }}
                disabled={loading}
                style={{ width: '100%', borderRadius: 16, padding: '15px 24px',
                          fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 15,
                          color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                          background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 55%, #db2777 100%)',
                          boxShadow: '0 6px 28px rgba(109,40,217,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
                          opacity: loading ? 0.6 : 1, letterSpacing: '0.01em', marginBottom: 16 }}
              >
                {loading ? 'Creating room…' : '✦  Create My Private Room'}
              </button>

              {/* Partner hint */}
              <div style={{ borderRadius: 14, padding: '13px 16px',
                             background: 'rgba(88,28,135,0.18)',
                             border: '1px solid rgba(124,58,237,0.2)' }}>
                <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 12.5,
                             color: '#e9d5ff', margin: '0 0 4px' }}>
                  Got a link from your partner?
                </p>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 12,
                             color: '#a78bfa', lineHeight: 1.55, margin: 0 }}>
                  Open their link - you'll land straight in the chat. Messages auto-translate to your language.
                </p>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                           fontSize: 9.5, color: 'rgba(109,40,217,0.45)', textAlign: 'center',
                           letterSpacing: '0.18em', marginTop: 18, marginBottom: 0 }}>
                PRIVATE · ENCRYPTED · FREE
              </p>

              {isInstallable && (
                <button
                  onClick={triggerInstall}
                  style={{ width: '100%', borderRadius: 14, padding: '12px 16px',
                            marginTop: 14, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                            fontSize: 12, color: '#fff', border: '1px solid rgba(167,139,250,0.4)',
                            background: 'rgba(88,28,135,0.35)', cursor: 'pointer',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: 6 }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(88,28,135,0.55)'; e.target.style.borderColor = 'rgba(167,139,250,0.7)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(88,28,135,0.35)'; e.target.style.borderColor = 'rgba(167,139,250,0.4)'; }}
                >
                  <Download size={14} /> Download App to Home Screen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <InstallPrompt />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP (partner joining via link)
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'setup') {
    return (
      <div className="min-h-[100dvh] bg-[#0a0018] flex flex-col">
        <div className="relative h-40 shrink-0 overflow-hidden">
          <img src={heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 to-[#0a0018]" />
          <div className="absolute inset-0 flex items-center justify-center gap-3">
            <ZulLogo size={36} />
            <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-3xl font-black text-transparent">Zul</span>
          </div>
        </div>

        <div className="flex-1 px-5 py-6 max-w-sm mx-auto w-full">
          <h2 className="text-xl font-bold text-white mb-1">You've been invited</h2>
          <p className="text-sm text-purple-400 mb-6">Set up your profile to join the conversation.</p>

          {error && <div className="mb-4 rounded-xl bg-red-900/30 border border-red-500/40 px-4 py-3 text-sm text-red-300">{error}</div>}

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-400">Your avatar</p>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((em) => (
                  <button key={em} onClick={() => setSetupEmoji(em)}
                    className={`text-2xl rounded-xl p-2 transition ${setupEmoji === em ? 'bg-violet-600/40 ring-2 ring-violet-500' : 'bg-violet-900/20 hover:bg-violet-900/40'}`}>
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-purple-400">Your name</label>
              <input value={setupName} onChange={(e) => setSetupName(e.target.value)} placeholder="Your name"
                className="w-full rounded-2xl border border-violet-700/40 bg-violet-900/20 px-4 py-3 text-sm text-white outline-none placeholder:text-purple-600 focus:border-violet-500 transition" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-purple-400">Your language</label>
              <div className="relative">
                <select value={setupLang} onChange={(e) => setSetupLang(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-violet-700/40 bg-violet-900/20 px-4 py-3 pr-10 text-sm text-white outline-none focus:border-violet-500 transition">
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-400" />
              </div>
            </div>
          </div>

          <button onClick={joinRoom} disabled={loading || !setupName.trim()}
            className="mt-7 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 py-4 text-sm font-bold text-white shadow-lg shadow-violet-900/50 transition active:scale-[0.98] disabled:opacity-50">
            {loading ? 'Joining…' : 'Enter Zul →'}
          </button>

          <p className="mt-4 text-center text-xs text-purple-600">Room: <span className="text-violet-400 font-mono font-bold">{roomCode}</span></p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT — Telegram-style desktop layout
  // ═══════════════════════════════════════════════════════════════════════════
  const myIsMe = (msg) => msg.sender_id === myMember?.id;

  return (
    <div className="flex h-[100svh] min-h-[100svh] w-full overflow-hidden bg-[#0a0018] md:h-[100dvh]">

      {/* ── DESKTOP SIDEBAR ── */}
      <Sidebar
        partner={partner}
        myMember={myMember}
        shareLink={shareLink}
        roomCode={roomCode}
        copied={copied}
        onCopy={copyLink}
        onLeave={leaveRoom}
      />

      {/* ── MAIN CHAT COLUMN ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 border-b border-violet-900/50 bg-[#12002b] px-3.5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
          <button onClick={leaveRoom} className="md:hidden text-purple-400 hover:text-white transition">
            <ArrowLeft size={22} />
          </button>

          {partner ? (
            <>
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-700 flex items-center justify-center text-xl">
                  {partner.avatar_emoji || '💜'}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#12002b] bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{partner.display_name}</p>
                <p className="text-sm text-emerald-400">{LANGUAGES.find(l => l.code === partner.language)?.label || partner.language} · online</p>
              </div>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-violet-700 flex items-center justify-center text-purple-500">?</div>
              <div className="flex-1">
                <p className="text-base font-semibold text-white">Waiting for your partner…</p>
                <p className="text-sm text-purple-400">Share your link so they can join</p>
              </div>
            </>
          )}

          <span className="hidden shrink-0 rounded-full border border-purple-800/30 bg-purple-900/30 px-2 py-0.5 font-mono text-[11px] text-purple-400 sm:inline-flex">
            {roomCode}
          </span>
        </header>

        {/* Share link banner (mobile, no partner yet) */}
        {!partner && shareLink && (
          <div className="md:hidden shrink-0 flex items-center gap-2 border-b border-violet-900/30 bg-violet-900/20 px-3.5 py-2.5">
            <Link size={13} className="text-violet-400 shrink-0" />
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-purple-300">{shareLink}</p>
            <button onClick={() => copyLink(shareLink)}
              className="shrink-0 flex items-center gap-1 rounded-lg bg-violet-600/30 px-2.5 py-1 text-xs text-violet-200 transition hover:bg-violet-600/50">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {error && (
          <div className="shrink-0 border-b border-red-500/25 bg-red-500/10 px-3.5 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Messages area */}
        <section
          className="flex-1 overflow-y-auto space-y-2 px-2.5 pb-3 pt-3 sm:px-4 sm:pt-4"
          style={{ backgroundImage: 'radial-gradient(ellipse at top, #1a0040 0%, #0a0018 70%)', backgroundAttachment: 'local' }}
        >
          {messages.length === 0 && !partnerTyping && (
            <div className="flex justify-center py-10">
              <span className="rounded-full border border-violet-800/30 bg-violet-900/20 px-4 py-2 text-xs text-purple-300">
                Auto-translated · Private · Encrypted
              </span>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = myIsMe(msg);
            const showTranslation = translatedOpen[msg.id];
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[84%] rounded-2xl px-3.5 py-2.5 sm:max-w-[72%] md:max-w-[60%] ${
                  isMe
                    ? 'rounded-tr-sm bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white shadow-lg shadow-violet-900/30'
                    : 'rounded-tl-sm bg-[#1e0845]/80 border border-violet-800/30 text-slate-100 backdrop-blur-sm'
                }`}>

                  {/* Voice */}
                  {msg.source === 'mic_recording' && (msg.voice_signed_url || msg.voice_url) && (
                    <div className="mb-1.5">
                      <audio controls src={msg.voice_signed_url || msg.voice_url} className="max-w-[200px] h-8" />
                    </div>
                  )}

                  {/* Media */}
                  {msg.source === 'file_upload' && (msg.media_signed_url || msg.media_url) && (
                    <div className="mb-1.5">
                      {msg.media_mime_type?.startsWith('image/') ? (
                        <img src={msg.media_signed_url || msg.media_url} alt={msg.media_filename} className="max-w-[220px] rounded-xl" />
                      ) : (
                        <a href={msg.media_signed_url || msg.media_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white hover:bg-black/30 transition">
                          <Paperclip size={12} /> {msg.media_filename || 'File'}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text */}
                  {msg.original_text && <p className="text-[15px] leading-relaxed">{msg.original_text}</p>}

                  {/* Voice transcript label */}
                  {msg.source === 'mic_recording' && msg.original_text && !isMe && (
                    <p className="mt-0.5 text-[10px] opacity-50 italic">Transcript</p>
                  )}

                  {/* Translation */}
                  {msg.translated_text && msg.source !== 'file_upload' && (
                    <button onClick={() => toggleTranslation(msg.id)}
                      className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-60 transition hover:opacity-100">
                      <Globe size={10} />
                      {showTranslation ? 'Hide' : 'Translate'}
                    </button>
                  )}

                  {showTranslation && msg.translated_text && (
                    <p className="mt-1.5 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 text-[13px] leading-relaxed italic text-white/80">
                      {msg.translated_text}
                    </p>
                  )}

                  {/* Time + read */}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-50">
                    <span>{fmtTime(msg.created_at)}</span>
                    {isMe && (msg.read_by?.length > 0 ? <CheckCheck size={11} /> : <Check size={11} />)}
                  </div>
                </div>
              </div>
            );
          })}

          {partnerTyping && <TypingDots />}
          <div ref={messagesEndRef} />
        </section>

        {/* Recording bar */}
        {recording && (
          <div className="shrink-0 flex items-center gap-3 border-t border-violet-900/40 bg-[#12002b] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="flex-1 text-sm text-purple-300">
              Recording {fmtDuration(recSecs)}
              {recTranscript && <span className="ml-2 text-xs text-purple-500 italic">"{recTranscript.slice(0, 40)}{recTranscript.length > 40 ? '…' : ''}"</span>}
            </span>
            <button onClick={cancelRecording} className="p-2 text-purple-400 hover:text-red-400 transition"><X size={18} /></button>
            <button onClick={stopAndSendVoice}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white transition active:scale-95">
              <Send size={14} /> Send
            </button>
          </div>
        )}

        {/* Composer */}
        {!recording && (
          <footer className="shrink-0 border-t border-violet-900/40 bg-[#12002b] px-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-3 sm:py-3">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept="*/*" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-purple-400 transition hover:bg-violet-900/30 hover:text-violet-200">
                <Paperclip size={20} />
              </button>
              <input
                value={messageInput}
                onChange={(e) => onInput(e.target.value)}
                placeholder="Write a message…"
                className="h-11 flex-1 rounded-full border border-violet-800/40 bg-violet-900/20 px-4 text-base text-white outline-none placeholder:text-purple-500 focus:border-violet-600 focus:bg-violet-900/30 transition"
              />
              {messageInput.trim() ? (
                <button type="submit"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/40 transition active:scale-95">
                  <Send size={17} />
                </button>
              ) : (
                <button type="button" onClick={startRecording}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-purple-400 transition hover:bg-violet-900/30 hover:text-violet-200">
                  <Mic size={20} />
                </button>
              )}
            </form>
          </footer>
        )}
      </div>
      <InstallPrompt />
    </div>
  );
}

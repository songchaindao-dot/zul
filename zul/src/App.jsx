import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Check, CheckCheck, ChevronDown, Copy, Download, Globe,
  Link, Mic, Paperclip, Send, Smartphone, X,
} from 'lucide-react';
import zulLogo from './assets/zul-logo.png';
import { useInstall } from './hooks/useInstall.js';

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

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

function ZulLogo({ size = 72, className = '' }) {
  return (
    <img
      src={zulLogo}
      alt="Zul"
      width={size}
      height={size}
      className={`object-contain drop-shadow-xl ${className}`}
      style={{ width: size, height: size }}
    />
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

// ── iOS Install Sheet ─────────────────────────────────────────────────────────
function IOSInstallSheet({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-[28px] border border-white/10 bg-[#12002b] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Add Zul to Home Screen</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20">
            <X size={16} />
          </button>
        </div>
        <ol className="space-y-4 text-sm text-purple-200">
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">1</span>
            <span>Tap the <strong className="text-white">Share</strong> button <span className="rounded bg-violet-900/50 px-1.5 py-0.5 font-mono text-xs">⎋</span> at the bottom of Safari</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">2</span>
            <span>Scroll down and tap <strong className="text-white">Add to Home Screen</strong></span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">3</span>
            <span>Tap <strong className="text-white">Add</strong> — Zul will appear on your home screen 💕</span>
          </li>
        </ol>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white transition hover:bg-violet-500"
        >
          Got it
        </button>
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
  const { isInstallable, isIOS, isInstalled, install: triggerInstall } = useInstall();
  const [view, setView] = useState('splash');
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  const [roomCode, setRoomCode] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [secretToken, setSecretToken] = useState(null);
  const clientId = useRef(getClientId()).current;

  const [myMember, setMyMember] = useState(null);
  const [partner, setPartner] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);

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
  const audioCtxRef = useRef(null);
  const myMemberRef = useRef(null);

  // Keep ref in sync so realtime closures always see current member
  useEffect(() => { myMemberRef.current = myMember; }, [myMember]);

  // Initialise AudioContext on first user gesture (required by browsers)
  useEffect(() => {
    const init = () => {
      if (!audioCtxRef.current) {
        try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
      }
    };
    document.addEventListener('click', init, { once: true });
    document.addEventListener('touchend', init, { once: true });
    return () => {
      document.removeEventListener('click', init);
      document.removeEventListener('touchend', init);
    };
  }, []);

  // Auto-request notification permission when running as installed PWA
  useEffect(() => {
    if (view !== 'chat') return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      subscribePush();
      return;
    }
    if (Notification.permission === 'default' && isStandalone) {
      const t = setTimeout(async () => {
        const result = await Notification.requestPermission();
        if (result === 'granted') subscribePush();
      }, 2500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

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
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.new.id)) return prev;
          if (payload.new.sender_id !== myMemberRef.current?.id &&
              (document.hidden || !document.hasFocus())) {
            playNotifSound();
          }
          return [...prev, payload.new];
        });
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

  function playNotifSound() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      [[880, 0], [660, 0.14]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.45);
      });
    } catch {}
  }

  async function subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey || !roomCode || !secretToken) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch(`/api/push/subscribe?room=${encodeURIComponent(roomCode)}&t=${encodeURIComponent(secretToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    } catch {}
  }

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

  async function handleInstall() {
    if (isIOS) { setShowIOSInstall(true); return; }
    if (isInstallable) {
      const outcome = await triggerInstall();
      if (outcome === 'accepted' && 'Notification' in window && Notification.permission === 'default') {
        setTimeout(async () => {
          const result = await Notification.requestPermission();
          if (result === 'granted') subscribePush();
        }, 1500);
      }
    }
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
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-[#07001a]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[100px]" />
        </div>
        <ZulLogo size={120} className="relative z-10" />
        <div className="relative z-10 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LANDING
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'landing') {
    const nameReady = setupName.trim().length >= 2;
    const canCreate = nameReady && !loading;

    return (
      <>
      <div className="relative min-h-dvh overflow-x-hidden bg-[#07001a] flex flex-col items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-700/25 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-fuchsia-800/20 blur-[100px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 mb-5 flex flex-col items-center gap-2 text-center">
          <img src={zulLogo} alt="Zul" className="h-28 w-28 drop-shadow-2xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Auto Translate Messenger</p>
        </div>

        {/* Onboarding card */}
        <div className="relative z-10 w-full max-w-sm rounded-[28px] border border-violet-700/30 bg-[#0d0120]/85 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl">

          <h2 className="mb-1 text-xl font-bold tracking-tight text-white">Create your chat room</h2>
          <p className="mb-5 text-sm text-violet-400">No account needed · Messages auto-translate instantly</p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-900/25 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Your name</label>
            <div className="relative">
              <input
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canCreate && createRoom()}
                placeholder="Enter your name"
                autoFocus
                className="w-full rounded-2xl border bg-violet-950/40 px-4 py-3.5 text-base text-white outline-none placeholder:text-violet-600 transition-colors"
                style={{ borderColor: nameReady ? 'rgba(167,139,250,0.6)' : 'rgba(124,58,237,0.3)' }}
              />
              {nameReady && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400 text-lg">✓</span>
              )}
            </div>
          </div>

          {/* Language — slides in once name is ready */}
          {nameReady && (
            <div className="mb-4 zul-rise">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Your language</label>
              <div className="relative">
                <select
                  value={setupLang}
                  onChange={(e) => setSetupLang(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-violet-700/40 bg-violet-950/40 px-4 py-3.5 pr-10 text-base text-white outline-none transition-colors focus:border-violet-500"
                  style={{ colorScheme: 'dark' }}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400" />
              </div>
            </div>
          )}

          {/* Avatar — slides in with language */}
          {nameReady && (
            <div className="mb-5 zul-rise" style={{ animationDelay: '60ms' }}>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Pick an avatar</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setSetupEmoji(em)}
                    className={`h-10 w-10 rounded-2xl text-xl transition-all ${setupEmoji === em ? 'bg-violet-600/50 ring-2 ring-violet-400 scale-110' : 'bg-violet-900/25 hover:bg-violet-800/40'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => { if (!setupName.trim()) { setError('Enter your name to continue'); return; } createRoom(); }}
            disabled={!canCreate}
            className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all ${canCreate ? 'zul-pulse-cta' : 'opacity-40 cursor-not-allowed'}`}
            style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 55%, #c026d3 100%)', boxShadow: canCreate ? '0 8px 32px rgba(109,40,217,0.5)' : 'none' }}
          >
            {loading ? 'Creating room…' : 'Create Room →'}
          </button>

          {/* Feature pills */}
          <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-violet-500">
            <span>🔒 Private</span>
            <span className="opacity-40">·</span>
            <span>🌍 Translated</span>
            <span className="opacity-40">·</span>
            <span>⚡ Instant</span>
          </div>

          {/* Partner hint */}
          <div className="mt-4 rounded-2xl border border-violet-800/30 bg-violet-950/30 px-4 py-3 text-sm">
            <p className="font-semibold text-violet-200">Have a link from your partner?</p>
            <p className="mt-0.5 text-xs text-violet-500">Open it — you'll join their room directly and chat in your own language.</p>
          </div>

          {/* Install button */}
          {!isInstalled && (isInstallable || isIOS) && (
            <button
              onClick={handleInstall}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-600/40 bg-violet-800/25 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-800/40"
            >
              <Download size={14} /> 📲 Download App
            </button>
          )}
        </div>
      </div>
      {showIOSInstall && <IOSInstallSheet onClose={() => setShowIOSInstall(false)} />}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP (partner joining via link)
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'setup') {
    const nameReady = setupName.trim().length >= 2;
    const canJoin = nameReady && !loading;

    return (
      <div className="relative min-h-dvh overflow-x-hidden bg-[#07001a] flex flex-col items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[100px]" />
        </div>

        {/* Logo + invite message */}
        <div className="relative z-10 mb-5 flex flex-col items-center gap-2 text-center">
          <img src={zulLogo} alt="Zul" className="h-20 w-20 drop-shadow-xl" />
          <h2 className="text-xl font-bold text-white">You've been invited</h2>
          <p className="text-sm text-violet-400">Set up your profile to join the conversation</p>
        </div>

        {/* Form card */}
        <div className="relative z-10 w-full max-w-sm rounded-[28px] border border-violet-700/30 bg-[#0d0120]/85 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl">

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-900/25 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          {/* Name */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Your name</label>
            <div className="relative">
              <input
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canJoin && joinRoom()}
                placeholder="Enter your name"
                autoFocus
                className="w-full rounded-2xl border bg-violet-950/40 px-4 py-3.5 text-base text-white outline-none placeholder:text-violet-600 transition-colors"
                style={{ borderColor: nameReady ? 'rgba(167,139,250,0.6)' : 'rgba(124,58,237,0.3)' }}
              />
              {nameReady && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400 text-lg">✓</span>
              )}
            </div>
          </div>

          {/* Language */}
          {nameReady && (
            <div className="mb-4 zul-rise">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Your language</label>
              <div className="relative">
                <select
                  value={setupLang}
                  onChange={(e) => setSetupLang(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-violet-700/40 bg-violet-950/40 px-4 py-3.5 pr-10 text-base text-white outline-none transition-colors focus:border-violet-500"
                  style={{ colorScheme: 'dark' }}
                >
                  {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400" />
              </div>
            </div>
          )}

          {/* Avatar */}
          {nameReady && (
            <div className="mb-5 zul-rise" style={{ animationDelay: '60ms' }}>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Pick an avatar</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setSetupEmoji(em)}
                    className={`h-10 w-10 rounded-2xl text-xl transition-all ${setupEmoji === em ? 'bg-violet-600/50 ring-2 ring-violet-400 scale-110' : 'bg-violet-900/25 hover:bg-violet-800/40'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={joinRoom}
            disabled={!canJoin}
            className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all ${canJoin ? 'zul-pulse-cta' : 'opacity-40 cursor-not-allowed'}`}
            style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 55%, #c026d3 100%)', boxShadow: canJoin ? '0 8px 32px rgba(109,40,217,0.5)' : 'none' }}
          >
            {loading ? 'Joining…' : 'Join Conversation →'}
          </button>

          <p className="mt-4 text-center text-xs text-violet-600">
            Room <span className="font-mono font-bold text-violet-400">{roomCode}</span>
          </p>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
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
          <button onClick={leaveRoom} className="md:hidden -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-purple-400 transition hover:bg-violet-900/30 hover:text-white">
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

          {!isInstalled && (isInstallable || isIOS) && (
            <button
              onClick={handleInstall}
              title="Download Zul App"
              className="shrink-0 flex h-9 items-center gap-1.5 rounded-full border border-violet-600/40 bg-violet-700/25 px-3 text-xs font-semibold text-violet-200 transition hover:bg-violet-700/45"
            >
              <Smartphone size={13} />
              <span className="hidden sm:inline">Download App</span>
            </button>
          )}
          <span className="hidden shrink-0 rounded-full border border-purple-800/30 bg-purple-900/30 px-2 py-0.5 font-mono text-[11px] text-purple-400 sm:inline-flex">
            {roomCode}
          </span>
        </header>
        {showIOSInstall && <IOSInstallSheet onClose={() => setShowIOSInstall(false)} />}

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
          className="flex-1 overflow-y-auto overscroll-y-contain space-y-2 px-2.5 pb-3 pt-3 sm:px-4 sm:pt-4"
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
            const hasTranslation = Boolean(msg.original_text && msg.translated_text);
            const originalText = msg.original_text || null;
            const translatedText = hasTranslation ? msg.translated_text : null;
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
                  {originalText && (
                    <p className="text-[15px] leading-relaxed">{originalText}</p>
                  )}

                  {/* Voice transcript label */}
                  {msg.source === 'mic_recording' && msg.original_text && !isMe && (
                    <p className="mt-0.5 text-[10px] opacity-50 italic">Transcript</p>
                  )}

                  {/* Translation always visible under original when present */}
                  {translatedText && msg.source !== 'file_upload' && (
                    <p className="mt-1.5 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 text-[13px] leading-relaxed italic text-white/80">
                      <span className="mr-1 text-[10px] uppercase tracking-wide opacity-60">
                        <Globe size={10} className="mb-[1px] mr-1 inline-block" />
                        Translated:
                      </span>
                      {translatedText}
                      {translatedText === originalText && (
                        <span className="ml-1 text-[10px] not-italic opacity-60">(same wording)</span>
                      )}
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
    </div>
  );
}

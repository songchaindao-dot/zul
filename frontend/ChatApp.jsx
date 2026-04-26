import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Phone, Video, Mic, MicOff, Settings, LogOut,
  Search, Heart, Clock, Check, CheckCheck, X, Loader,
  Menu, Globe, ChevronLeft, Plus, User,
} from 'lucide-react';

const API_BASE = import.meta?.env?.VITE_API_URL || '';

// ─── API Helper ───────────────────────────────────────────────────────────────

function apiHeaders() {
  const token = localStorage.getItem('cattleya_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...apiHeaders(), ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Orchid Logo ─────────────────────────────────────────────────────────────

function OrchidLogo({ size = 80 }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <linearGradient id="petal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="url(#bg)" opacity="0.95" />
      <ellipse cx="70"  cy="80"  rx="18" ry="35" fill="url(#petal)" opacity="0.9"  transform="rotate(-45 70 80)" />
      <ellipse cx="130" cy="80"  rx="18" ry="35" fill="url(#petal)" opacity="0.9"  transform="rotate(45 130 80)" />
      <ellipse cx="100" cy="50"  rx="18" ry="35" fill="url(#petal)" opacity="0.95" />
      <ellipse cx="80"  cy="125" rx="16" ry="30" fill="url(#petal)" opacity="0.85" transform="rotate(-60 80 125)" />
      <ellipse cx="120" cy="125" rx="16" ry="30" fill="url(#petal)" opacity="0.85" transform="rotate(60 120 125)" />
      <circle cx="100" cy="95" r="22" fill="#f59e0b" opacity="0.95" />
      <circle cx="100" cy="95" r="18" fill="#fbbf24" />
      <path d="M100 105 C95 115,85 115,85 105 C85 100,88 95,95 95 C98 95,100 97,100 97 C100 97,102 95,105 95 C112 95,115 100,115 105 C115 115,105 115,100 105 Z" fill="#ec4899" opacity="0.9" />
      <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="3" opacity="0.25" />
      <circle cx="72"  cy="68"  r="3" fill="white" opacity="0.6" />
      <circle cx="128" cy="68"  r="2" fill="white" opacity="0.5" />
      <circle cx="155" cy="110" r="2" fill="white" opacity="0.4" />
    </svg>
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${status === 'online' ? 'bg-green-400' : 'bg-slate-500'}`} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Cattleya() {
  // ── View / Auth ────────────────────────────────────────────────────────────
  const [view, setView] = useState('auth');       // auth | about | chats | chat | call
  const [authStep, setAuthStep] = useState('phone'); // phone | otp
  const [user, setUser] = useState(null);

  // ── Auth form ──────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [nameInput, setNameInput] = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [countdown, setCountdown] = useState(600);

  // ── Conversations ──────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);

  // ── Messages ───────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  // ── Language ───────────────────────────────────────────────────────────────
  const [detectedLang, setDetectedLang] = useState(null);
  const [preferredLang] = useState('en');

  // ── Typing / Presence ─────────────────────────────────────────────────────
  const [iTyping, setITyping] = useState(false);
  const [theyTyping, setTheyTyping] = useState(false);

  // ── Voice recording ────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);

  // ── Call ───────────────────────────────────────────────────────────────────
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState(null);
  const [callSecs, setCallSecs] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callVideoOff, setCallVideoOff] = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const messagesEnd = useRef(null);
  const otpRefs = useRef([]);
  const mediaRecRef = useRef(null);
  const audioChunks = useRef([]);
  const recInterval = useRef(null);
  const callInterval = useRef(null);
  const typingTimeout = useRef(null);
  const detectTimeout = useRef(null);
  const presenceInterval = useRef(null);

  // ── Auto-scroll messages ──────────────────────────────────────────────────
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, theyTyping]);

  // ── OTP countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!otpExpiresAt) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor((otpExpiresAt - Date.now()) / 1000));
      setCountdown(left);
      if (left === 0) {
        setError('OTP expired. Request a new one.');
        setAuthStep('phone');
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [otpExpiresAt]);

  // ── Call timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callActive) {
      callInterval.current = setInterval(() => setCallSecs((s) => s + 1), 1000);
    } else {
      clearInterval(callInterval.current);
      setCallSecs(0);
    }
    return () => clearInterval(callInterval.current);
  }, [callActive]);

  // ── Poll conversations & typing when in chat view ─────────────────────────
  useEffect(() => {
    if (!user || view !== 'chats') return;
    loadConversations();
    presenceInterval.current = setInterval(loadConversations, 10000);
    return () => clearInterval(presenceInterval.current);
  }, [user, view]);

  // ── Poll typing indicator when in chat ────────────────────────────────────
  useEffect(() => {
    if (!user || !selectedConv) return;
    loadMessages(selectedConv.id);
    const id = setInterval(() => {
      loadMessages(selectedConv.id);
      pollTyping(selectedConv.id);
    }, 4000);
    return () => clearInterval(id);
  }, [selectedConv]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auth
  // ─────────────────────────────────────────────────────────────────────────

  async function sendOTP() {
    setError('');
    if (!phone.trim()) return setError('Enter your phone number');
    setLoading(true);
    try {
      const data = await api('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone }),
      });
      setAttemptId(data.attemptId);
      setOtpExpiresAt(Date.now() + (data.expiresIn || 600) * 1000);
      setAuthStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP() {
    const code = otpDigits.join('');
    if (code.length !== 6) return setError('Enter all 6 digits');
    setError('');
    setLoading(true);
    try {
      const data = await api('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone, otp: code, name: nameInput, attemptId }),
      });
      localStorage.setItem('cattleya_token', data.token);
      setUser(data.user);
      setView('chats');
    } catch (e) {
      setError(e.message);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleOtpKey(i, e) {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  }

  function handleOtpChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otpDigits];
    next[i] = val;
    setOtpDigits(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function logout() {
    localStorage.removeItem('cattleya_token');
    setUser(null);
    setView('auth');
    setAuthStep('phone');
    setConversations([]);
    setMessages([]);
    setSelectedConv(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Conversations
  // ─────────────────────────────────────────────────────────────────────────

  async function loadConversations() {
    try {
      const data = await api('/api/conversations');
      setConversations(data);
    } catch (e) {
      console.error('load conversations:', e);
    }
  }

  function selectConversation(conv) {
    setSelectedConv(conv);
    setMessages([]);
    setView('chat');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Messages
  // ─────────────────────────────────────────────────────────────────────────

  async function loadMessages(convId) {
    try {
      const data = await api(`/api/messages/${convId}`);
      setMessages(data);
    } catch (e) {
      console.error('load messages:', e);
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConv) return;

    const text = messageInput.trim();
    setMessageInput('');
    stopTypingSignal();

    try {
      const msg = await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConv.id,
          text,
          messageType: 'text',
        }),
      });
      setMessages((prev) => [...prev, msg]);

      // Auto-translate if detected language differs from preference
      if (detectedLang && detectedLang !== preferredLang) {
        try {
          const tr = await api('/api/translate', {
            method: 'POST',
            body: JSON.stringify({ text, targetLanguage: preferredLang }),
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id
                ? { ...m, translated_text: tr.translated, translation_language: preferredLang }
                : m
            )
          );
        } catch (_) {}
      }
    } catch (e) {
      setError('Failed to send message');
    }
  }

  async function deleteMessage(msgId) {
    try {
      await api(`/api/messages/${msgId}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (e) {
      setError(e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Language detection (debounced)
  // ─────────────────────────────────────────────────────────────────────────

  function onMessageInput(val) {
    setMessageInput(val);

    if (val.length > 3) {
      startTypingSignal();
      clearTimeout(detectTimeout.current);
      detectTimeout.current = setTimeout(async () => {
        try {
          const d = await api('/api/detect-language', {
            method: 'POST',
            body: JSON.stringify({ text: val }),
          });
          setDetectedLang(d.language);
        } catch (_) {}
      }, 600);
    } else {
      stopTypingSignal();
      setDetectedLang(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Typing indicators
  // ─────────────────────────────────────────────────────────────────────────

  function startTypingSignal() {
    if (!iTyping && selectedConv) {
      setITyping(true);
      api('/api/presence/typing', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedConv.id, isTyping: true }),
      }).catch(() => {});
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTypingSignal, 3000);
  }

  function stopTypingSignal() {
    setITyping(false);
    if (selectedConv) {
      api('/api/presence/typing', {
        method: 'POST',
        body: JSON.stringify({ conversationId: selectedConv.id, isTyping: false }),
      }).catch(() => {});
    }
  }

  async function pollTyping(convId) {
    try {
      const data = await api(`/api/presence/typing/${convId}`);
      setTheyTyping((data.typingUsers || []).length > 0);
    } catch (_) {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Voice recording
  // ─────────────────────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecRef.current.start();
      setRecording(true);
      setRecSecs(0);
      recInterval.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
    } catch (_) {
      setError('Microphone access denied');
    }
  }

  function stopRecording() {
    if (!mediaRecRef.current) return;
    mediaRecRef.current.onstop = async () => {
      const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
      await uploadVoiceNote(blob);
    };
    mediaRecRef.current.stop();
    mediaRecRef.current.stream?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    clearInterval(recInterval.current);
    setRecSecs(0);
  }

  async function uploadVoiceNote(blob) {
    if (!selectedConv) return;
    const form = new FormData();
    form.append('voice_note', blob, 'note.webm');
    form.append('conversationId', selectedConv.id);
    form.append('messageType', 'voice');

    try {
      const token = localStorage.getItem('cattleya_token');
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const msg = await res.json();
      if (res.ok) setMessages((prev) => [...prev, msg]);
    } catch (e) {
      setError('Failed to send voice note');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Calls
  // ─────────────────────────────────────────────────────────────────────────

  async function startCall(type) {
    if (!selectedConv) return;
    setCallType(type);
    setCallActive(true);

    try {
      const roomName = `cattleya-${selectedConv.id}`;
      await api('/api/calls/token', {
        method: 'POST',
        body: JSON.stringify({ roomName }),
      });
    } catch (e) {
      console.error('call token error:', e);
    }
  }

  async function endCall() {
    if (selectedConv) {
      api('/api/calls/record', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConv.id,
          callType,
          duration: callSecs,
          status: 'completed',
          endedAt: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
    setCallActive(false);
    setCallType(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utils
  // ─────────────────────────────────────────────────────────────────────────

  const fmtTime = (secs) =>
    `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  const fmtMsg = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const otherUser = (conv) =>
    conv?.otherUser || { name: 'Unknown', avatar_url: null, status: 'offline' };

  // ─────────────────────────────────────────────────────────────────────────
  // ── AUTH VIEW ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4"><OrchidLogo size={88} /></div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
              Cattleya
            </h1>
            <p className="text-slate-400 text-sm">Language-free love, translated with care 💕</p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {authStep === 'phone' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-pink-300 text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-pink-500/30 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 transition"
                />
              </div>
              <button
                onClick={sendOTP}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader size={18} className="animate-spin" />}
                Send Verification Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-pink-300 text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  placeholder="Your beautiful name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-pink-500/30 rounded-xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 transition"
                />
              </div>

              <div>
                <label className="block text-pink-300 text-sm font-medium mb-2">
                  Verification Code
                  <span className="ml-2 text-slate-400 font-normal">
                    ({Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')} left)
                  </span>
                </label>
                <div className="flex gap-2 justify-between">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(i, e)}
                      className="w-12 h-12 bg-slate-800 border-2 border-slate-700 rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={verifyOTP}
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader size={18} className="animate-spin" />}
                Verify & Enter
              </button>

              <button
                onClick={() => { setAuthStep('phone'); setError(''); setOtpDigits(['', '', '', '', '', '']); }}
                className="w-full py-2 text-slate-400 hover:text-white text-sm transition"
              >
                ← Change number
              </button>
            </div>
          )}

          <button
            onClick={() => setView('about')}
            className="w-full mt-6 py-2 text-pink-400 hover:text-pink-300 text-sm transition hover:bg-pink-500/10 rounded-xl"
          >
            About Cattleya 🌸
          </button>

          <p className="text-center text-slate-600 text-xs mt-8">
            🔒 End-to-end encrypted • 🌐 Auto-translated • 💕 Built with love
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── ABOUT VIEW ────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'about') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setView('auth')}
            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ChevronLeft size={20} /> Back
          </button>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4"><OrchidLogo size={120} /></div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Cattleya
              </h1>
              <p className="text-slate-400 mt-2">Breaking language barriers with love</p>
            </div>

            <div className="bg-slate-800/40 border-l-4 border-pink-500 rounded p-5 italic text-slate-300">
              <p className="mb-2">
                "This app was inspired by Cattleya, the beautiful woman who I fell for online but we don't speak the same language.
                I hope it helps your inter-lingo relationships too."
              </p>
              <p className="text-sm text-slate-500 not-italic">— The Builder, with love 💕</p>
            </div>

            <div className="space-y-3 text-slate-300 text-sm">
              <h2 className="text-lg font-bold text-pink-400">✨ Features</h2>
              <ul className="space-y-2">
                <li>🌐 <strong>Auto Language Detection</strong> — detects your language as you type</li>
                <li>🔄 <strong>Instant Translation</strong> — messages auto-translate before sending</li>
                <li>🎙️ <strong>Voice Notes</strong> — record audio, transcribed and translated</li>
                <li>💬 <strong>Typing Indicators</strong> — animated dots when they're composing</li>
                <li>👤 <strong>Online Status</strong> — green dot + last seen time</li>
                <li>😊 <strong>Message Reactions</strong> — tap any message to react</li>
                <li>✅ <strong>Read Receipts</strong> — ✓ sent, ✓✓ read</li>
                <li>📹 <strong>Video & Audio Calls</strong> — powered by Twilio</li>
                <li>🔒 <strong>End-to-End Encrypted</strong> — AES-256 at rest</li>
              </ul>
            </div>

            <button
              onClick={() => setView('auth')}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-xl transition"
            >
              Start Your Story 💕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── CALL VIEW ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  if (callActive) {
    const them = otherUser(selectedConv);
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-between p-8">
        <div className="w-full flex justify-end">
          <button onClick={endCall} className="p-2 hover:bg-white/10 rounded-full transition">
            <X size={24} className="text-white" />
          </button>
        </div>

        <div className="text-center">
          <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-5xl mb-4 ring-4 ring-pink-500/30 animate-pulse">
            {them.avatar_url ? (
              <img src={them.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : '💜'}
          </div>
          <h2 className="text-3xl font-bold text-white mb-1">{them.name}</h2>
          <p className="text-pink-300">{callType === 'video' ? '📹 Video Call' : '☎️ Audio Call'}</p>
          <p className="text-slate-400 text-2xl font-mono mt-3">{fmtTime(callSecs)}</p>
        </div>

        <div className="flex gap-6 pb-4">
          <button
            onClick={() => setCallMuted(!callMuted)}
            className={`p-4 rounded-full transition ${callMuted ? 'bg-red-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {callMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
          </button>

          <button
            onClick={endCall}
            className="p-5 bg-red-600 hover:bg-red-700 rounded-full transition text-white"
          >
            <Phone size={28} />
          </button>

          <button
            onClick={() => setCallVideoOff(!callVideoOff)}
            className={`p-4 rounded-full transition ${callVideoOff ? 'bg-red-600' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            <Video size={24} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── CHAT VIEW (individual conversation) ───────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  if (view === 'chat' && selectedConv) {
    const them = otherUser(selectedConv);
    return (
      <div className="h-screen bg-slate-950 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { setView('chats'); setSelectedConv(null); setMessages([]); }}
            className="p-2 hover:bg-white/10 rounded-full transition shrink-0"
          >
            <ChevronLeft size={22} className="text-white" />
          </button>

          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-lg shrink-0 relative">
            {them.avatar_url
              ? <img src={them.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              : <User size={18} className="text-white" />}
            <span className="absolute bottom-0 right-0">
              <StatusDot status={them.status} />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{them.name}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <StatusDot status={them.status} />
              {them.status === 'online' ? 'Online' : 'Offline'}
            </p>
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => startCall('audio')}
              className="p-2 hover:bg-white/10 rounded-full transition text-pink-400"
            >
              <Phone size={19} />
            </button>
            <button
              onClick={() => startCall('video')}
              className="p-2 hover:bg-white/10 rounded-full transition text-purple-400"
            >
              <Video size={19} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center pt-20">
              <OrchidLogo size={64} />
              <p className="text-slate-500 mt-4">No messages yet</p>
              <p className="text-slate-600 text-sm">Say something beautiful 💕</p>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                <div className="max-w-xs">
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      isMe
                        ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-sm'
                        : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.message_type === 'voice' ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mic size={16} className="opacity-75" />
                          <div className="flex gap-0.5">
                            {[...Array(12)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-current rounded-full opacity-60"
                                style={{ height: `${8 + Math.sin(i * 1.3) * 8}px` }}
                              />
                            ))}
                          </div>
                        </div>
                        {msg.voice_transcription && (
                          <p className="text-xs opacity-75 italic">📝 {msg.voice_transcription}</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        {msg.translated_text && (
                          <p className="text-xs opacity-70 mt-1.5 pt-1.5 border-t border-current/20 italic flex items-center gap-1">
                            <Globe size={11} /> {msg.translated_text}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.reactions.map((r, i) => (
                          <span key={i} className="text-xs bg-black/20 rounded-full px-1.5 py-0.5">{r}</span>
                        ))}
                      </div>
                    )}

                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs opacity-50">{fmtMsg(msg.created_at)}</span>
                      {isMe && (
                        msg.is_read
                          ? <CheckCheck size={12} className="opacity-70" />
                          : <Check size={12} className="opacity-50" />
                      )}
                    </div>
                  </div>

                  {/* Delete (own messages, hover) */}
                  {isMe && (
                    <div className="hidden group-hover:flex justify-end mt-0.5">
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-xs text-slate-600 hover:text-red-400 transition px-1"
                      >
                        delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {theyTyping && <TypingDots />}
          <div ref={messagesEnd} />
        </div>

        {/* Language detection strip */}
        {detectedLang && messageInput.length > 0 && (
          <div className="px-4 py-1.5 bg-purple-900/30 border-t border-purple-800/40 text-xs text-purple-300 flex items-center gap-2">
            <Globe size={13} />
            <span>Detected: <strong>{detectedLang.toUpperCase()}</strong> → will translate to {preferredLang.toUpperCase()}</span>
          </div>
        )}

        {/* Input area */}
        <div className="bg-slate-900/80 border-t border-slate-800 px-4 pt-3 pb-5 space-y-2">
          {recording && (
            <div className="flex items-center gap-3 bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm font-medium">Recording {fmtTime(recSecs)}</span>
              <button
                onClick={stopRecording}
                className="ml-auto px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition"
              >
                Send
              </button>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2 items-end">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition shrink-0 ${
                recording ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {recording
                ? <MicOff size={18} className="text-white" />
                : <Mic size={18} className="text-pink-400" />}
            </button>

            <input
              type="text"
              value={messageInput}
              onChange={(e) => onMessageInput(e.target.value)}
              placeholder="Message with love..."
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-white placeholder-slate-500 text-sm transition"
            />

            <button
              type="submit"
              disabled={!messageInput.trim()}
              className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-full transition text-white disabled:opacity-40 shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ── CHATS LIST VIEW ───────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OrchidLogo size={36} />
          <div>
            <h1 className="text-xl font-bold text-white">Cattleya</h1>
            <p className="text-slate-500 text-xs">Auto-translating • Secure</p>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-white/10 rounded-full transition"
        >
          <Menu size={22} className="text-white" />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-4 py-2 border border-slate-700">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search conversations…"
            className="bg-transparent outline-none flex-1 text-white placeholder-slate-500 text-sm"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Heart size={48} className="text-pink-500/40 mb-4" />
            <p className="text-slate-400 font-medium">No conversations yet</p>
            <p className="text-slate-600 text-sm mt-1">Find someone to connect with 💕</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const them = otherUser(conv);
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className="w-full px-4 py-4 border-b border-slate-800/60 hover:bg-slate-900/50 transition flex items-center gap-3 text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center shrink-0 relative">
                  {them.avatar_url
                    ? <img src={them.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    : <User size={20} className="text-white" />}
                  <span className="absolute bottom-0 right-0 p-0.5 bg-slate-950 rounded-full">
                    <StatusDot status={them.status} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-pink-300 transition truncate">
                    {them.name}
                  </p>
                  <p className="text-slate-500 text-sm truncate">
                    {conv.last_message || 'No messages yet'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-slate-600 text-xs">
                    {conv.updated_at
                      ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Menu */}
      {menuOpen && (
        <div className="border-t border-slate-800 bg-slate-900/80 p-2 space-y-1">
          <button className="w-full text-left px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition text-sm flex items-center gap-3">
            <Settings size={16} /> Settings
          </button>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-3 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-xl transition text-sm flex items-center gap-3"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

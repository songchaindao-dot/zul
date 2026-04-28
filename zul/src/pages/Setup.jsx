import { useState } from 'react';
import ZulLogo from '../components/ZulLogo.jsx';
import { LANGUAGES } from '../lib/languages.js';
import { api } from '../lib/api.js';
import { getClientId } from '../lib/client-id.js';

const AVATARS = ['💕', '🌸', '🦋', '🌹', '✨', '💫', '🌙', '🫶', '💜', '🌺'];

export default function Setup({ roomCode, secretToken, onJoined }) {
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [avatar, setAvatar] = useState('💬');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const nameReady = displayName.trim().length >= 2;

  const handleJoin = async () => {
    if (!displayName.trim() || joining) return;
    setJoining(true);
    setError('');
    try {
      const client_id = getClientId();
      const data = await api.post('/rooms/join', {
        room_code: roomCode,
        secret_token: secretToken,
        client_id,
        display_name: displayName.trim(),
        language,
        avatar_emoji: avatar,
      });

      const profileKey = `zul_profile_${roomCode}`;
      localStorage.setItem(profileKey, JSON.stringify({
        client_id,
        member_id: data.member.id,
        display_name: displayName.trim(),
        language,
        avatar_emoji: avatar,
        secret_token: secretToken,
        share_url: `${window.location.origin}/r/${roomCode}?t=${secretToken}`,
      }));

      onJoined(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#07001a] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[100px]" />
      </div>

      {/* Logo + invite */}
      <div className="relative z-10 mb-5 flex flex-col items-center gap-2 text-center">
        <ZulLogo size={88} />
        <h2 className="text-xl font-bold text-white">You've been invited</h2>
        <p className="text-sm text-violet-400">Set up your profile to join the conversation</p>
      </div>

      {/* Form */}
      <div className="relative z-10 w-full max-w-sm rounded-[28px] border border-violet-700/30 bg-[#0d0120]/85 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl">

        {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-900/25 px-4 py-3 text-sm text-red-300">{error}</div>}

        {/* Name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Your name</label>
          <div className="relative">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nameReady && handleJoin()}
              placeholder="Enter your name"
              maxLength={30}
              autoFocus
              className="w-full rounded-2xl border bg-violet-950/40 px-4 py-3.5 text-base text-white outline-none placeholder:text-violet-600 transition-colors"
              style={{ borderColor: nameReady ? 'rgba(167,139,250,0.6)' : 'rgba(124,58,237,0.3)' }}
            />
            {nameReady && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-400">✓</span>}
          </div>
        </div>

        {/* Language */}
        {nameReady && (
          <div className="mb-4 zul-rise">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Your language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full rounded-2xl border border-violet-700/40 bg-violet-950/40 px-4 py-3.5 text-base text-white outline-none focus:border-violet-500"
              style={{ colorScheme: 'dark' }}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </select>
          </div>
        )}

        {/* Avatar */}
        {nameReady && (
          <div className="mb-5 zul-rise" style={{ animationDelay: '60ms' }}>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Pick an avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(em => (
                <button
                  key={em}
                  onClick={() => setAvatar(em)}
                  className={`h-10 w-10 rounded-2xl text-xl transition-all ${avatar === em ? 'bg-violet-600/50 ring-2 ring-violet-400 scale-110' : 'bg-violet-900/25 hover:bg-violet-800/40'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!nameReady || joining}
          className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-all ${nameReady && !joining ? 'zul-pulse-cta' : 'opacity-40 cursor-not-allowed'}`}
          style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 55%, #c026d3 100%)', boxShadow: nameReady ? '0 8px 32px rgba(109,40,217,0.5)' : 'none' }}
        >
          {joining ? 'Joining…' : 'Join Conversation →'}
        </button>
      </div>
    </div>
  );
}

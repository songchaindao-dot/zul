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

      // Save profile
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <div className="flex justify-center"><ZulLogo size={56} /></div>
          <h1 className="text-2xl font-bold text-rose-50">Welcome to Zul</h1>
          <p className="text-slate-400 text-sm">You've been invited to a private chatroom. Tell us about yourself.</p>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Your name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              autoFocus
              className="mt-1 w-full bg-slate-800 text-rose-50 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Your language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="mt-1 w-full bg-slate-800 text-rose-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Your avatar</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map(em => (
                <button
                  key={em}
                  onClick={() => setAvatar(em)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all
                    ${avatar === em ? 'bg-pink-600 ring-2 ring-pink-400' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleJoin}
            disabled={!displayName.trim() || joining}
            className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all"
          >
            {joining ? 'Joining…' : 'Enter chatroom →'}
          </button>
        </div>
      </div>
    </div>
  );
}

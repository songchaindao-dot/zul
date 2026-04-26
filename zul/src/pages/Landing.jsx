import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ZulLogo from '../components/ZulLogo.jsx';
import About from '../components/About.jsx';
import { LANGUAGES } from '../lib/languages.js';
import { getClientId } from '../lib/client-id.js';

const AVATARS = ['💕', '🌸', '🦋', '🌹', '✨', '💫', '🌙', '🫶', '💜', '🌺'];

export default function Landing() {
  const navigate = useNavigate();
  const [step, setStep] = useState('home'); // home | setup
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('en');
  const [avatar, setAvatar] = useState('💕');
  const [creating, setCreating] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const handleCreate = async () => {
    if (!displayName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim(), language, avatar_emoji: avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Save profile to localStorage
      const profileKey = `zul_profile_${data.room_code}`;
      localStorage.setItem(profileKey, JSON.stringify({
        client_id: data.client_id,
        member_id: data.member_id,
        display_name: displayName.trim(),
        language,
        avatar_emoji: avatar,
        secret_token: data.secret_token,
        share_url: data.share_url,
      }));
      // Also set client_id globally
      localStorage.setItem('zul_client_id', data.client_id);

      navigate(`/r/${data.room_code}?t=${data.secret_token}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      {showAbout && <About onClose={() => setShowAbout(false)} />}

      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="flex justify-center">
            <ZulLogo size={72} />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Zul
          </h1>
          <p className="text-slate-300 text-lg">Two hearts. Two languages. One conversation.</p>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Zul was made for Zuleima — and for everyone who falls in love across languages.
            Type, speak, share photos and videos. We translate. You connect.
          </p>
        </div>

        {step === 'home' ? (
          <div className="space-y-4">
            <button
              onClick={() => setStep('setup')}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-white font-semibold rounded-2xl text-lg transition-all shadow-lg shadow-pink-900/30"
            >
              Create a private chatroom →
            </button>
            <button
              onClick={() => setShowAbout(true)}
              className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              The story behind Zul
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider">Your name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                maxLength={30}
                className="mt-1 w-full bg-slate-800 text-rose-50 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-pink-500"
                autoFocus
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

            <button
              onClick={handleCreate}
              disabled={!displayName.trim() || creating}
              className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 disabled:opacity-50 text-white font-semibold rounded-2xl transition-all"
            >
              {creating ? 'Creating…' : 'Create room →'}
            </button>
            <button
              onClick={() => setStep('home')}
              className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

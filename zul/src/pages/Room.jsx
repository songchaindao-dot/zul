import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { setRoomCredentials, api } from '../lib/api.js';
import { getClientId } from '../lib/client-id.js';
import Setup from './Setup.jsx';
import Chat from './Chat.jsx';

export default function Room() {
  const { roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const secretToken = searchParams.get('t') || '';

  const [state, setState] = useState('loading'); // loading | setup | chat
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    if (!roomCode || !secretToken) { setState('setup'); return; }
    setRoomCredentials(roomCode, secretToken);

    const profileKey = `zul_profile_${roomCode}`;
    const saved = localStorage.getItem(profileKey);

    if (saved) {
      try {
        const profile = JSON.parse(saved);
        // Rejoin to refresh status
        api.post('/rooms/join', {
          room_code: roomCode,
          secret_token: secretToken,
          client_id: profile.client_id,
          display_name: profile.display_name,
          language: profile.language,
          avatar_emoji: profile.avatar_emoji,
        }).then(data => {
          setRoomData({ ...data, shareUrl: profile.share_url });
          setState('chat');
        }).catch(() => setState('setup'));
      } catch {
        setState('setup');
      }
    } else {
      setState('setup');
    }
  }, [roomCode, secretToken]);

  const handleJoined = (data) => {
    const profileKey = `zul_profile_${roomCode}`;
    const saved = localStorage.getItem(profileKey);
    const profile = saved ? JSON.parse(saved) : {};
    setRoomData({
      ...data,
      shareUrl: profile.share_url || `${window.location.origin}/r/${roomCode}?t=${secretToken}`,
    });
    setState('chat');
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse text-sm">Loading…</div>
      </div>
    );
  }

  if (state === 'setup') {
    return <Setup roomCode={roomCode} secretToken={secretToken} onJoined={handleJoined} />;
  }

  return (
    <Chat
      room={roomData.room}
      member={roomData.member}
      otherMembers={roomData.other_members || []}
      shareUrl={roomData.shareUrl}
    />
  );
}

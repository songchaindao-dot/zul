import { useEffect, useRef } from 'react';
import { api } from '../lib/api.js';
import { getClientId } from '../lib/client-id.js';

export function usePresence(room) {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!room) return;

    const heartbeat = () => api.post('/members/presence', { status: 'online' }).catch(() => {});
    heartbeat();
    intervalRef.current = setInterval(heartbeat, 30000);

    const handleUnload = () => {
      const clientId = getClientId();
      const url = `/api/members/presence?room=${room.room_code}&t=${room.secret_token}&client=${clientId}`;
      const blob = new Blob([JSON.stringify({ status: 'offline' })], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      api.post('/members/presence', { status: 'offline' }).catch(() => {});
    };
  }, [room]);
}

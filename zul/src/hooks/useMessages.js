import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';

export function useMessages(room, supabase) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const loadMessages = useCallback(async () => {
    if (!room) return;
    try {
      const data = await api.get('/messages/list');
      setMessages(data);
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  }, [room]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!room || !supabase) return;

    const channel = supabase
      .channel(`messages:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${room.id}`,
      }, ({ new: msg }) => {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `room_id=eq.${room.id}`,
      }, ({ new: msg }) => {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [room, supabase]);

  return { messages, setMessages, loading, reload: loadMessages };
}

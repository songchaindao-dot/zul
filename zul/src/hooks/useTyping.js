import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.js';

export function useTyping(room, member, supabase) {
  const [otherTyping, setOtherTyping] = useState(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const sendTyping = (isTyping, lang) => {
    api.post('/typing', { is_typing: isTyping, detected_language: lang }).catch(() => {});
  };

  const handleInputChange = (value) => {
    if (value && !isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(false);
    }, 2000);
  };

  const stopTyping = () => {
    clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(false);
    }
  };

  useEffect(() => {
    if (!room || !supabase || !member) return;

    const channel = supabase
      .channel(`typing:${room.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'typing_events',
        filter: `room_id=eq.${room.id}`,
      }, ({ eventType, new: row, old }) => {
        const id = row?.member_id || old?.member_id;
        if (id === member.id) return;
        if (eventType === 'DELETE' || !row?.member_id) setOtherTyping(null);
        else setOtherTyping(row);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [room, supabase, member]);

  useEffect(() => () => clearTimeout(typingTimerRef.current), []);

  return { otherTyping, handleInputChange, stopTyping };
}

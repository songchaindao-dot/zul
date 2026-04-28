import { useState, useRef } from 'react';
import { Camera, Mic, Paperclip, SendHorizontal } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder.jsx';
import AttachmentMenu from './AttachmentMenu.jsx';
import { api } from '../lib/api.js';

export default function Composer({ onTyping, onStopTyping, onMessageSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(null);
  const textareaRef = useRef();

  const handleChange = (e) => {
    setText(e.target.value);
    const input = textareaRef.current;
    if (input) {
      input.style.height = '0px';
      input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
    }
    onTyping?.(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    onStopTyping?.();
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
    try {
      await api.post('/messages/send', { text: msg });
      onMessageSent?.();
    } catch (e) {
      alert(e.message);
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  if (recording) {
    return (
      <div className="relative z-10 border-t border-white/5 bg-[#0c0816]/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <VoiceRecorder
          onDone={() => { setRecording(false); onMessageSent?.(); }}
          onCancel={() => setRecording(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative z-10 border-t border-white/5 bg-[#0c0816]/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      {uploading && (
        <div className="mb-2 px-1 text-xs text-violet-200/70 animate-pulse">
          Uploading {uploading}…
        </div>
      )}
      <div className="flex items-end gap-2">
        <div className="relative flex flex-1 items-end gap-1 rounded-[28px] border border-white/8 bg-[#171225]/95 px-2 py-1.5 shadow-[0_14px_32px_rgba(2,6,23,0.22)]">
          <button
            type="button"
            onClick={() => setShowAttach(v => !v)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/5 hover:text-violet-200"
            aria-label="Open attachment options"
          >
            <Paperclip size={18} />
          </button>
          {showAttach && (
            <AttachmentMenu
              onClose={() => setShowAttach(false)}
              onUploading={(type) => { setUploading(type); setShowAttach(false); }}
              onDone={() => { setUploading(null); onMessageSent?.(); }}
              onError={(msg) => { setUploading(null); alert(msg); }}
            />
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2 text-base leading-6 text-white placeholder:text-slate-500 focus:outline-none max-h-32 overflow-y-auto"
            style={{ height: 40 }}
          />

          <button
            type="button"
            onClick={() => setShowAttach(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/5 hover:text-violet-200"
            aria-label="Open camera and media options"
          >
            <Camera size={18} />
          </button>
        </div>

        {text.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#8b5cf6_0%,#6d28d9_100%)] text-white shadow-[0_16px_30px_rgba(91,33,182,0.38)] transition hover:brightness-110 disabled:opacity-50"
            aria-label="Send message"
          >
            <SendHorizontal size={18} />
          </button>
        ) : (
          <button
            onClick={() => setRecording(true)}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#8b5cf6_0%,#6d28d9_100%)] text-white shadow-[0_16px_30px_rgba(91,33,182,0.38)] transition hover:brightness-110"
            aria-label="Record voice message"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

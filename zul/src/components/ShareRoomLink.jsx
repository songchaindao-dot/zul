import { useState } from 'react';

export default function ShareRoomLink({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4">
        <div>
          <h3 className="text-rose-50 font-semibold text-lg">Share this room</h3>
          <p className="text-slate-400 text-sm mt-1">Send this link to the person you want to chat with. Anyone with this link can join.</p>
        </div>

        <div className="bg-slate-800 rounded-xl px-3 py-2.5 break-all text-xs text-purple-300 font-mono">
          {shareUrl}
        </div>

        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Copy link'}
          </button>
          {navigator.share && (
            <button
              onClick={() => navigator.share({ title: 'Zul — Chat with me', url: shareUrl })}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm transition-colors"
            >
              Share
            </button>
          )}
        </div>

        <button onClick={onClose} className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors py-1">
          Close
        </button>
      </div>
    </div>
  );
}

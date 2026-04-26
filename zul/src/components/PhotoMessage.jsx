import { useState } from 'react';
import { download } from '../lib/download.js';

export default function PhotoMessage({ message, isMine }) {
  const [fullscreen, setFullscreen] = useState(false);
  const thumb = message.thumbnail_signed_url || message.media_signed_url;
  const full = message.media_signed_url;
  const caption = isMine
    ? message.original_text
    : (message.translated_text || message.original_text);

  return (
    <>
      <div className="space-y-1.5">
        <div
          className="relative cursor-pointer rounded-lg overflow-hidden max-w-[240px]"
          onClick={() => setFullscreen(true)}
        >
          {thumb ? (
            <img
              src={thumb}
              alt="photo"
              className="w-full object-cover rounded-lg"
              style={{ maxHeight: 200 }}
            />
          ) : (
            <div className="w-40 h-32 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">📷</div>
          )}
          <div className="absolute inset-0 hover:bg-black/10 transition-colors" />
        </div>
        {caption && <p className="text-xs text-slate-300 max-w-[240px]">{caption}</p>}
        {full && (
          <button
            onClick={() => download(full, message.media_filename || 'photo.jpg')}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            ⬇ Download
          </button>
        )}
      </div>

      {fullscreen && full && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <img src={full} alt="photo" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-pink-300"
            onClick={() => setFullscreen(false)}
          >✕</button>
        </div>
      )}
    </>
  );
}

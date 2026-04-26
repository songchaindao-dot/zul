import { download } from '../lib/download.js';

export default function VideoMessage({ message, isMine }) {
  const url = message.media_signed_url;
  const poster = message.thumbnail_signed_url;
  const caption = isMine
    ? message.original_text
    : (message.translated_text || message.original_text);

  return (
    <div className="space-y-1.5 max-w-[280px]">
      {url ? (
        <video
          controls
          src={url}
          poster={poster}
          className="w-full rounded-lg"
          style={{ maxHeight: 240 }}
          preload="metadata"
        />
      ) : (
        <div className="w-full h-40 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">🎥</div>
      )}
      {caption && <p className="text-xs text-slate-300">{caption}</p>}
      {url && (
        <button
          onClick={() => download(url, message.media_filename || 'video.mp4')}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          ⬇ Download
        </button>
      )}
    </div>
  );
}

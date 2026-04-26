import { formatFileSize } from '../lib/format.js';
import { download } from '../lib/download.js';

const AUDIO_EXTS = ['mp3', 'ogg', 'flac', 'aac', 'wav', 'm4a'];

function getExt(filename) {
  return filename?.split('.').pop()?.toLowerCase() || '';
}

export default function FileMessage({ message }) {
  const url = message.media_signed_url;
  const filename = message.media_filename || 'file';
  const size = formatFileSize(message.media_size_bytes);
  const ext = getExt(filename);
  const isAudio = AUDIO_EXTS.includes(ext) || message.media_mime_type?.startsWith('audio/');

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2 max-w-[260px]">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{isAudio ? '🎵' : '📎'}</span>
        <div className="min-w-0">
          <p className="text-sm text-rose-50 truncate">{filename}</p>
          {size && <p className="text-xs text-slate-400">{size}</p>}
        </div>
      </div>
      {isAudio && url && (
        <audio controls src={url} className="w-full h-8" style={{ colorScheme: 'dark' }} />
      )}
      {url && (
        <button
          onClick={() => download(url, filename)}
          className="text-xs text-purple-400 hover:text-purple-300"
        >
          ⬇ Download
        </button>
      )}
    </div>
  );
}

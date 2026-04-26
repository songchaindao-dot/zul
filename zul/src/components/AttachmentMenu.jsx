import { useRef } from 'react';
import { api } from '../lib/api.js';
import { generateImageThumbnail, generateVideoThumbnail, uploadToSignedUrl } from '../lib/thumbnail.js';

const MAX_SIZE = 50 * 1024 * 1024;

export default function AttachmentMenu({ onClose, onUploading, onDone, onError }) {
  const photoRef = useRef();
  const videoRef = useRef();
  const fileRef = useRef();
  const cameraRef = useRef();

  const handleFile = async (file, type) => {
    onClose();
    if (!file) return;
    if (file.size > MAX_SIZE) { onError('File too large (max 50MB)'); return; }

    try {
      onUploading(type);

      const { upload_url, storage_path } = await api.post('/media/upload-url', {
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });

      await uploadToSignedUrl(upload_url, file, () => {});

      // Thumbnail for images + videos
      let thumbnail_path = null;
      let width = null, height = null;

      if (type === 'photo' || type === 'camera') {
        const thumbBlob = await generateImageThumbnail(file);
        if (thumbBlob) {
          const thumbFile = new File([thumbBlob], 'thumb.jpg', { type: 'image/jpeg' });
          const { upload_url: tUrl, storage_path: tPath } = await api.post('/media/upload-url', {
            filename: 'thumb.jpg', mime_type: 'image/jpeg', size_bytes: thumbBlob.size,
          });
          await uploadToSignedUrl(tUrl, thumbFile);
          thumbnail_path = tPath;
        }
        // Get dimensions
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
        await new Promise(r => { img.onload = r; img.src = objUrl; });
        width = img.naturalWidth; height = img.naturalHeight;
        URL.revokeObjectURL(objUrl);
      }

      if (type === 'video') {
        const thumbBlob = await generateVideoThumbnail(file);
        if (thumbBlob) {
          const thumbFile = new File([thumbBlob], 'thumb.jpg', { type: 'image/jpeg' });
          const { upload_url: tUrl, storage_path: tPath } = await api.post('/media/upload-url', {
            filename: 'thumb.jpg', mime_type: 'image/jpeg', size_bytes: thumbBlob.size,
          });
          await uploadToSignedUrl(tUrl, thumbFile);
          thumbnail_path = tPath;
        }
      }

      const source = type === 'camera' ? 'camera' : 'file_upload';
      await api.post('/media/finalize', {
        storage_path, mime_type: file.type, size_bytes: file.size,
        filename: file.name, width, height, thumbnail_path, source,
      });

      onDone();
    } catch (e) {
      onError(e.message || 'Upload failed');
    }
  };

  const items = [
    {
      label: '📷 Photo', action: () => photoRef.current?.click(),
      input: <input ref={photoRef} type="file" accept="image/*" className="hidden"
        onChange={e => handleFile(e.target.files[0], 'photo')} />,
    },
    {
      label: '📸 Camera', action: () => cameraRef.current?.click(),
      input: <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => handleFile(e.target.files[0], 'camera')} />,
    },
    {
      label: '🎥 Video', action: () => videoRef.current?.click(),
      input: <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={e => handleFile(e.target.files[0], 'video')} />,
    },
    {
      label: '📎 File', action: () => fileRef.current?.click(),
      input: <input ref={fileRef} type="file" className="hidden"
        onChange={e => handleFile(e.target.files[0], 'file')} />,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full mb-2 left-0 z-20 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        {items.map(({ label, action, input }) => (
          <div key={label}>
            {input}
            <button
              onClick={action}
              className="w-full px-5 py-3 text-left text-sm text-rose-50 hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {label}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

import { getClientId } from './client-id.js';

let _roomCode = null;
let _secretToken = null;

function getApiBaseUrl() {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredBase) {
    return configuredBase.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;
    const isLocalPreview = (hostname === 'localhost' || hostname === '127.0.0.1') && port !== '3000';
    if (isLocalPreview) {
      return 'http://127.0.0.1:3000/api';
    }
  }

  return '/api';
}

export function setRoomCredentials(roomCode, secretToken) {
  _roomCode = roomCode;
  _secretToken = secretToken;
}

async function zulFetch(path, options = {}) {
  const clientId = getClientId();
  const params = new URLSearchParams();
  if (_roomCode) params.set('room', _roomCode);
  if (_secretToken) params.set('t', _secretToken);
  const qs = params.toString() ? `?${params}` : '';
  const baseUrl = getApiBaseUrl();

  const res = await fetch(`${baseUrl}${path}${qs}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Zul-Client-Id': clientId,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

export const api = {
  post: (path, body) => zulFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  get: (path) => zulFetch(path, { method: 'GET' }),
  patch: (path, body) => zulFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path, body) => zulFetch(path, { method: 'DELETE', body: JSON.stringify(body) }),
};

import { test, expect } from '@playwright/test';

const BASE = 'https://zul-heart.vercel.app';

test.describe('API health', () => {
  test('POST /api/rooms/create returns a room', async ({ request }) => {
    const clientId = `e2e-${Date.now()}`;
    const resp = await request.post(`${BASE}/api/rooms/create`, {
      headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('room_code');
    expect(body).toHaveProperty('secret_token');
  });

  test('POST /api/messages/send returns 200 for valid message', async ({ request }) => {
    // First create a room and join it
    const clientId = `e2e-msg-${Date.now()}`;
    const createResp = await request.post(`${BASE}/api/rooms/create`, {
      headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
    });
    const room = await createResp.json();

    const joinResp = await request.post(
      `${BASE}/api/rooms/join?room=${room.room_code}&t=${room.secret_token}`,
      {
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        data: { display_name: 'API Tester', language: 'en', emoji_avatar: '💕' },
      },
    );
    expect(joinResp.status()).toBe(200);

    const sendResp = await request.post(
      `${BASE}/api/messages/send?room=${room.room_code}&t=${room.secret_token}`,
      {
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        data: { text: 'E2E test message', original_language: 'en' },
      },
    );
    expect(sendResp.status()).toBe(200);
    const msg = await sendResp.json();
    expect(msg).toHaveProperty('id');
    expect(msg.original_text).toBe('E2E test message');
  });

  test('GET /api/messages/list returns array', async ({ request }) => {
    const clientId = `e2e-list-${Date.now()}`;
    const createResp = await request.post(`${BASE}/api/rooms/create`, {
      headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
    });
    const room = await createResp.json();
    await request.post(
      `${BASE}/api/rooms/join?room=${room.room_code}&t=${room.secret_token}`,
      {
        headers: { 'Content-Type': 'application/json', 'X-Zul-Client-Id': clientId },
        data: { display_name: 'List Tester', language: 'en', emoji_avatar: '✨' },
      },
    );

    const listResp = await request.get(
      `${BASE}/api/messages/list?room=${room.room_code}&t=${room.secret_token}&limit=20`,
      { headers: { 'X-Zul-Client-Id': clientId } },
    );
    expect(listResp.status()).toBe(200);
    const msgs = await listResp.json();
    expect(Array.isArray(msgs)).toBe(true);
  });

  test('invalid room returns 403', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/messages/list?room=BADROOM&t=bad-token`, {
      headers: { 'X-Zul-Client-Id': 'fake-client' },
    });
    expect(resp.status()).toBe(403);
  });
});

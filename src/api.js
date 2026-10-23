const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const tg = window.Telegram?.WebApp;
export const hasTelegram = Boolean(tg?.initData);

async function call(path, { method = 'GET', body } = {}) {
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `tma ${tg?.initData || ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network' } };
  }
}

export const api = {
  me: () => call('/me'),
  adStart: () => call('/ad/start', { method: 'POST' }),
  adClaim: (eventId) => call('/ad/claim', { method: 'POST', body: { eventId } }),
  checkin: () => call('/checkin', { method: 'POST' }),
  spin: () => call('/spin', { method: 'POST' }),
  channelTask: () => call('/task/channel', { method: 'POST' }),
  withdraw: (payload) => call('/withdraw', { method: 'POST', body: payload }),
  withdrawals: () => call('/withdrawals'),
  leaderboard: () => call('/leaderboard'),
  payouts: () => call('/payouts'),
};

// Backend URL: Vercel env (VITE_API_URL) မထည့်ရသေးလျှင် default ကို သုံးမည်
const DEFAULT_API = 'https://coinmm.onrender.com';

function cleanUrl(v) {
  let s = String(v || '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return s.replace(/\/+$/, '');
}

export const API_BASE = cleanUrl(import.meta.env.VITE_API_URL) || DEFAULT_API;

export const tg = window.Telegram?.WebApp;
export const hasTelegram = Boolean(tg?.initData);

async function call(path, { method = 'GET', body, timeoutMs = 45000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `tma ${tg?.initData || ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: { error: 'network', detail: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) },
    };
  } finally {
    clearTimeout(timer);
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

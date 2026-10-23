import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, tg, hasTelegram, API_BASE } from './api.js';

// Adsgram Reward block ID (code ထဲမှာ တိုက်ရိုက်သတ်မှတ်ထားသည် - Vercel env မလို)
const BLOCK_ID = '55583';
const AD_DEBUG = import.meta.env.VITE_ADSGRAM_DEBUG === 'true';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toLocaleString('en-US');

const ERR = {
  daily_limit: 'ယနေ့အတွက် ကြော်ငြာကြည့်ခွင့် ပြည့်သွားပါပြီ။ မနက်ဖြန် ပြန်လာပါ။',
  cooldown: 'ခဏစောင့်ပြီးမှ ထပ်ကြည့်ပါ။',
  already: 'ယနေ့ ယူပြီးသား ဖြစ်ပါသည်။',
  not_member: 'Channel ကို အရင် join ပြီးမှ ပြန်နှိပ်ပါ။',
  below_min: 'အနည်းဆုံး ထုတ်ယူနိုင်သော coin ပမာဏ မပြည့်သေးပါ။',
  insufficient: 'coin လက်ကျန် မလုံလောက်ပါ။',
  pending_exists: 'စောင့်ဆိုင်းနေသော တောင်းဆိုမှု ရှိနေပါသည်။ ပြီးမှ ထပ်တောင်းပါ။',
  bad_account: 'ဖုန်းနံပါတ်ကို မှန်ကန်စွာ ဖြည့်ပါ။',
  bad_method: 'ငွေလွှဲနည်းလမ်း မှန်ကန်မှုမရှိပါ။',
  too_fast: 'ကြော်ငြာကို အပြည့်အဝ ကြည့်ပေးပါ။',
  expired: 'အချိန်ကျော်လွန်သွားပါပြီ။ ထပ်ကြိုးစားပါ။',
  network: 'အင်တာနက် ချိတ်ဆက်မှု မရပါ။ ထပ်ကြိုးစားပါ။',
  banned: 'သင့်အကောင့်ကို ပိတ်ထားပါသည်။',
};
const errText = (d) =>
  d?.error === 'cooldown' && d.waitSec
    ? `ခဏစောင့်ပါ (${d.waitSec} စက္ကန့်) ပြီးမှ ထပ်ကြည့်ပါ။`
    : ERR[d?.error] || 'အမှားတစ်ခု ဖြစ်ပေါ်နေပါသည်။ ထပ်ကြိုးစားပါ။';

const haptic = (type = 'success') => tg?.HapticFeedback?.notificationOccurred?.(type);

export default function App() {
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [fatal, setFatal] = useState('');
  const [diag, setDiag] = useState('');
  const adRef = useRef(null);
  const toastTimer = useRef(null);

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  const boot = useCallback(async () => {
    setFatal('');
    setDiag('');
    if (!hasTelegram) {
      setFatal('ဤ Mini App ကို Telegram bot ထဲမှသာ ဖွင့်ပါ။');
      return;
    }
    // Render Free server အိပ်နေလျှင် နိုးသည်အထိ ထပ်ကြိုးစားမည်
    let r;
    for (let i = 0; i < 6; i++) {
      r = await api.me();
      if (r.ok) break;
      const retry = r.status === 0 || (r.status >= 502 && r.status <= 504);
      if (!retry) break;
      await sleep(4000);
    }
    if (r.ok) {
      setUser(r.data.user);
      setConfig(r.data.config);
    } else if (r.data?.error === 'banned') {
      setFatal(ERR.banned);
    } else {
      setFatal('ချိတ်ဆက်၍ မရပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။');
      setDiag(
        `status=${r.status} error=${r.data?.error || '-'} ${r.data?.reason || r.data?.detail || ''} | ${API_BASE}`
      );
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const getAd = () => {
    if (!adRef.current && window.Adsgram && BLOCK_ID) {
      adRef.current = window.Adsgram.init({ blockId: BLOCK_ID, debug: AD_DEBUG });
    }
    return adRef.current;
  };

  async function watchAd() {
    if (busy) return;
    const ctrl = getAd();
    if (!ctrl) return say('ကြော်ငြာစနစ် မရရှိသေးပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။');

    setBusy('ad');
    try {
      const s = await api.adStart();
      if (!s.ok) return say(errText(s.data));

      try {
        await ctrl.show();
      } catch (e) {
        return say(
          e?.error
            ? 'ကြော်ငြာ ဖွင့်၍မရပါ။ ခဏနေမှ ထပ်ကြိုးစားပါ။'
            : 'ကြော်ငြာကို အဆုံးထိ မကြည့်ခဲ့ပါ (သို့) ယခု ပြသရန် ကြော်ငြာမရှိသေးပါ။'
        );
      }

      // server က Adsgram callback ကို စောင့်ပြီး coin ပေးမည်
      for (let i = 0; i < 8; i++) {
        const c = await api.adClaim(s.data.eventId);
        if (c.status === 202) {
          await sleep(1500);
          continue;
        }
        if (c.ok) {
          setUser(c.data.user);
          haptic();
          say(`🎉 coin +${c.data.reward} ရရှိပါပြီ`);
        } else say(errText(c.data));
        return;
      }
      say('စစ်ဆေးနေဆဲ ဖြစ်ပါသည်။ ခဏနေမှ လက်ကျန်ကို ပြန်ကြည့်ပါ။');
    } finally {
      setBusy('');
    }
  }

  async function simple(kind, fn) {
    if (busy) return;
    setBusy(kind);
    const r = await fn();
    setBusy('');
    if (r.ok) {
      setUser(r.data.user);
      haptic();
      say(`🎉 coin +${r.data.reward} ရရှိပါပြီ`);
    } else {
      haptic('error');
      say(errText(r.data));
    }
  }

  if (fatal)
    return (
      <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div>{fatal}</div>
        {diag && <div style={{ fontSize: 11, opacity: 0.6, wordBreak: 'break-all' }}>{diag}</div>}
        {hasTelegram && fatal !== ERR.banned && (
          <button className="btn" style={{ maxWidth: 220 }} onClick={boot}>
            🔄 ပြန်ကြိုးစားမည်
          </button>
        )}
      </div>
    );
  if (!user || !config) return <div className="center">ခဏစောင့်ပါ…</div>;

  return (
    <div className="app">
      <main>
        {tab === 'home' && (
          <Home user={user} config={config} busy={busy} onWatch={watchAd} setTab={setTab} />
        )}
        {tab === 'tasks' && (
          <Tasks user={user} config={config} busy={busy} simple={simple} />
        )}
        {tab === 'wallet' && (
          <Wallet user={user} config={config} setUser={setUser} say={say} />
        )}
        {tab === 'top' && <Top />}
      </main>

      {toast && <div className="toast">{toast}</div>}

      <nav>
        {[
          ['home', '🏠', 'ပင်မ'],
          ['tasks', '🎁', 'လုပ်ငန်း'],
          ['wallet', '💸', 'ငွေထုတ်'],
          ['top', '🏆', 'ထိပ်တန်း'],
        ].map(([k, icon, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function BalanceCard({ user }) {
  return (
    <div className="card balance">
      <div className="muted">သင့် လက်ကျန်</div>
      <div className="big">🪙 {fmt(user.balance)}</div>
      <div className="muted">≈ {fmt(user.kyat)} ကျပ်</div>
    </div>
  );
}

function PayoutList({ limit }) {
  const [payouts, setPayouts] = useState(null);
  useEffect(() => {
    api.payouts().then((r) => setPayouts(r.ok ? r.data.payouts : []));
  }, []);
  if (payouts === null) return <p className="muted">ခဏစောင့်ပါ…</p>;
  if (payouts.length === 0) return <p className="muted">ငွေထုတ်ပြီးသူ မှတ်တမ်း မကြာမီ ပြသပါမည်။</p>;
  return payouts.slice(0, limit || payouts.length).map((p) => (
    <div className="line" key={p.id}>
      <span>
        {p.name} • {p.method}
        {p.ref ? ` • ${p.ref}` : ''}
      </span>
      <b>{fmt(p.amount)} ကျပ်</b>
    </div>
  ));
}

function Home({ user, config, busy, onWatch, setTab }) {
  const opts = config.rewardOptions.join(' / ');
  return (
    <>
      <BalanceCard user={user} />

      <div className="card">
        <h3>📺 ကြော်ငြာကြည့်၍ coin ရယူပါ</h3>
        <p className="muted">
          ကြော်ငြာတစ်ခု အဆုံးထိ ကြည့်လျှင် coin <b>{opts}</b> ရပါမည်။ ကြော်ငြာကြည့်ရန်မှာ
          မိမိ၏ ရွေးချယ်မှုသာ ဖြစ်ပြီး မကြည့်ဘဲ အခြား feature များကို သုံးနိုင်ပါသည်။
        </p>
        <button className="btn" disabled={!!busy || user.adsLeft === 0} onClick={onWatch}>
          {busy === 'ad' ? 'ခဏစောင့်ပါ…' : `📺 ကြော်ငြာကြည့်မည် (+${opts} coin)`}
        </button>
        <div className="muted small" style={{ marginTop: 8 }}>
          📍 Rewarded video ad (Adsgram) — အပေါ်က ခလုတ်ကို သင်ကိုယ်တိုင် နှိပ်မှသာ ပေါ်ပါမည်။
          အလိုအလျောက် မပေါ်ပါ။
        </div>
        <div className="progress">
          <div style={{ width: `${(user.adsToday / config.maxAdsPerDay) * 100}%` }} />
        </div>
        <div className="muted small">
          ယနေ့ ကြည့်ပြီး {user.adsToday}/{config.maxAdsPerDay} ခု
        </div>
      </div>

      <div className="card">
        <h3>📖 အသုံးပြုနည်း</h3>
        <ol>
          <li>“ကြော်ငြာကြည့်မည်” ကို နှိပ်ပြီး ကြော်ငြာကို အဆုံးထိ ကြည့်ပါ။</li>
          <li>ကြည့်ပြီးတာနဲ့ coin {opts} ကို လက်ကျန်ထဲ အလိုအလျောက် ထည့်ပေးပါမည်။</li>
          <li>
            “လုပ်ငန်း” tab တွင် နေ့စဉ် check-in နှင့် Lucky Box ကို ကြော်ငြာမကြည့်ဘဲ
            အခမဲ့ ယူနိုင်ပါသည်။
          </li>
          <li>
            coin {fmt(config.minWithdrawCoins)} (≈{' '}
            {fmt(Math.floor((config.minWithdrawCoins / 1000) * config.kyatPer1000Coins))} ကျပ်)
            ပြည့်လျှင် “ငွေထုတ်” tab မှ ထုတ်ယူနိုင်ပါသည်။
          </li>
        </ol>
      </div>

      <div className="card">
        <h3>🧾 ငွေထုတ်ပြီးသူများ (သက်သေ)</h3>
        <PayoutList limit={5} />
        {config.proofUrl && (
          <button
            className="link"
            onClick={() =>
              tg?.openTelegramLink ? tg.openTelegramLink(config.proofUrl) : window.open(config.proofUrl)
            }
          >
            📢 သက်သေ Channel တွင် အားလုံးကြည့်ရန် →
          </button>
        )}
        <button className="link" onClick={() => setTab('wallet')}>
          ငွေထုတ်ရန် →
        </button>
      </div>
    </>
  );
}

function Tasks({ user, config, busy, simple }) {
  return (
    <>
      <BalanceCard user={user} />

      <div className="card">
        <h3>📅 နေ့စဉ် Check-in</h3>
        <p className="muted">
          နေ့စဉ် ဝင်ပြီး နှိပ်ပါ။ ဆက်တိုက်ဝင်လေ coin ပိုရလေ။ (လက်ရှိ {user.streak} ရက်ဆက်တိုက်)
        </p>
        <button
          className="btn"
          disabled={!user.canCheckin || !!busy}
          onClick={() => simple('checkin', api.checkin)}
        >
          {user.canCheckin ? `Check-in လုပ်မည် (+${config.checkinBase}…)` : '✅ ယနေ့ ယူပြီး'}
        </button>
      </div>

      <div className="card">
        <h3>🎲 Lucky Box</h3>
        <p className="muted">
          တစ်နေ့တစ်ကြိမ် အခမဲ့ ဖွင့်နိုင်ပါသည်။ coin {config.spinMin}–{config.spinMax} ထိ ရနိုင်ပါသည်။
        </p>
        <button
          className="btn"
          disabled={!user.canSpin || !!busy}
          onClick={() => simple('spin', api.spin)}
        >
          {user.canSpin ? '🎁 ဖွင့်မည်' : '✅ ယနေ့ ဖွင့်ပြီး'}
        </button>
      </div>

      <div className="card">
        <h3>📢 Channel Join</h3>
        <p className="muted">
          ကျွန်ုပ်တို့ channel ကို join ပါက coin {config.channelTaskReward} ရပါမည် (တစ်ကြိမ်သာ)။
        </p>
        {user.channelTaskDone ? (
          <button className="btn" disabled>
            ✅ ရယူပြီး
          </button>
        ) : (
          <div className="row">
            <button
              className="btn ghost"
              onClick={() =>
                tg?.openTelegramLink ? tg.openTelegramLink(config.channelUrl) : window.open(config.channelUrl)
              }
            >
              Join မည်
            </button>
            <button className="btn" disabled={!!busy} onClick={() => simple('chan', api.channelTask)}>
              ✔ စစ်ဆေးမည်
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Wallet({ user, config, setUser, say }) {
  const [method, setMethod] = useState(config.withdrawMethods[0] || '');
  const [account, setAccount] = useState('');
  const [coins, setCoins] = useState(String(config.minWithdrawCoins));
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    api.withdrawals().then((r) => r.ok && setHistory(r.data.items));
  }, []);
  useEffect(load, [load]);

  const n = Math.floor(Number(coins) || 0);
  const kyat = Math.floor((n / 1000) * config.kyatPer1000Coins);

  async function submit() {
    if (sending) return;
    setSending(true);
    const r = await api.withdraw({ coins: n, method, account });
    setSending(false);
    if (r.ok) {
      setUser(r.data.user);
      haptic();
      say(`✅ ${fmt(r.data.amount)} ကျပ် ထုတ်ယူရန် တောင်းဆိုပြီးပါပြီ`);
      setAccount('');
      load();
    } else {
      haptic('error');
      say(errText(r.data));
    }
  }

  const statusLabel = { pending: '⏳ စောင့်ဆိုင်းဆဲ', paid: '✅ ပေးချေပြီး', rejected: '❌ ငြင်းပယ်' };

  return (
    <>
      <BalanceCard user={user} />

      <div className="card">
        <h3>💸 ငွေထုတ်ရန်</h3>
        <p className="muted small">
          coin 1,000 = {config.kyatPer1000Coins} ကျပ် • အနည်းဆုံး {fmt(config.minWithdrawCoins)} coin •
          admin မှ စစ်ဆေးပြီး လွှဲပေးပါမည်။
        </p>

        <label>ငွေလွှဲနည်းလမ်း</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {config.withdrawMethods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <label>ဖုန်းနံပါတ်</label>
        <input
          inputMode="tel"
          placeholder="09xxxxxxxxx"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />

        <label>ထုတ်မည့် coin</label>
        <div className="row">
          <input inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)} />
          <button className="btn ghost" onClick={() => setCoins(String(user.balance))}>
            အကုန်
          </button>
        </div>
        <div className="muted small">≈ {fmt(kyat)} ကျပ်</div>

        <button
          className="btn"
          disabled={sending || n < config.minWithdrawCoins || n > user.balance || !account}
          onClick={submit}
        >
          {sending ? 'ခဏစောင့်ပါ…' : 'ထုတ်ယူရန် တောင်းဆိုမည်'}
        </button>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h3>📜 ကျွန်ုပ်၏ တောင်းဆိုမှုများ</h3>
          {history.map((h) => (
            <div className="line" key={h.id}>
              <span>
                #{h.id} • {fmt(h.amount)} ကျပ် • {h.method}
              </span>
              <b>{statusLabel[h.status]}</b>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>🧾 ငွေထုတ်ပြီးသူများ (အများပြည်သူ သက်သေ)</h3>
        <PayoutList />
      </div>
    </>
  );
}

function Top() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.leaderboard().then((r) => r.ok && setRows(r.data.top));
  }, []);
  return (
    <div className="card">
      <h3>🏆 coin အများဆုံး ရရှိသူများ</h3>
      {!rows && <p className="muted">ခဏစောင့်ပါ…</p>}
      {rows?.map((r) => (
        <div className={`line ${r.me ? 'me' : ''}`} key={r.rank}>
          <span>
            {r.rank}. {r.name} {r.me && '(သင်)'}
          </span>
          <b>🪙 {fmt(r.coins)}</b>
        </div>
      ))}
    </div>
  );
}

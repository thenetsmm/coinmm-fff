import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, tg, hasTelegram, API_BASE } from './api.js';

// Adsgram Reward block ID
const BLOCK_ID = '55583';
const BUILD = 'b4';
const AD_DEBUG = import.meta.env.VITE_ADSGRAM_DEBUG === 'true';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const haptic = (type = 'success') => tg?.HapticFeedback?.notificationOccurred?.(type);

// ================= i18n (English default, Myanmar auto for Telegram language "my") =================
const LANGS = {
  en: {
    name: 'EN',
    err: {
      daily_limit: "You've reached today's ad limit. Come back tomorrow.",
      cooldown: 'Please wait a moment before watching another ad.',
      already: 'Already claimed today.',
      not_member: 'Please join the channel first, then tap again.',
      below_min: 'Minimum withdrawal amount not reached yet.',
      insufficient: 'Not enough coin balance.',
      pending_exists: 'You already have a pending request. Try again after it is processed.',
      bad_account: 'Please enter a valid phone number.',
      bad_method: 'Invalid payment method.',
      too_fast: 'Please watch the full ad.',
      expired: 'Time expired. Please try again.',
      network: 'Network error. Please try again.',
      banned: 'Your account has been banned.',
      generic: 'Something went wrong. Please try again.',
    },
    wait: (n) => `Please wait ${n}s before watching another ad.`,
    openInTg: 'Please open this Mini App inside the Telegram bot.',
    retry: '🔄 Retry',
    loading: 'Loading…',
    connectFail: 'Could not connect. Please try again shortly.',
    adNotReady: 'Ad system is not ready yet. Please try again shortly.',
    adOpenFail: 'Could not open the ad. Please try again shortly.',
    adNotDone: 'You did not finish the ad, or no ad is available right now.',
    got: (n) => `🎉 +${n} coin received`,
    checking: 'Still verifying. Check your balance again shortly.',
    nav: { home: 'Home', tasks: 'Tasks', wallet: 'Withdraw', top: 'Top' },
    yourBalance: 'Your balance',
    kyat: 'MMK',
    watchTitle: '📺 Watch an ad to earn coin',
    watchDesc: (o) => `Watch one rewarded video ad to the end and earn ${o} coin. Watching ads is optional — all other features work without ads.`,
    watchBtn: (o) => `📺 Watch ad (+${o} coin)`,
    placementTitle: '📍 Ad placement',
    placement: (id, b) =>
      `Screen: Home tab → "Watch ad" button (above). Format: Adsgram rewarded video (Block ID ${id}). The ad is shown only after the user taps the button — never automatically. (${b})`,
    watchedToday: (a, b) => `Watched today: ${a}/${b}`,
    howTitle: '📖 How it works',
    how1: 'Tap "Watch ad" and watch the video ad to the end.',
    how2: (o) => `After it finishes, ${o} coin is added to your balance automatically.`,
    how3: 'In the "Tasks" tab, daily check-in and Lucky Box are free — no ad needed.',
    how4: (m, k) => `When you reach ${m} coin (≈ ${k} MMK) you can withdraw from the "Withdraw" tab.`,
    proofTitle: '🧾 Recent payouts (proof)',
    proofEmpty: 'Payout records will be shown here soon.',
    proofAll: '📢 See all in the proof channel →',
    toWallet: 'Withdraw →',
    checkinTitle: '📅 Daily check-in',
    checkinDesc: (s) => `Check in every day — the longer your streak, the more coin you get. (Current streak: ${s} days)`,
    checkinBtn: (b) => `Check in (+${b}…)`,
    checkinDone: '✅ Done today',
    boxTitle: '🎲 Lucky Box',
    boxDesc: (a, b) => `Open once a day for free. Win ${a}–${b} coin.`,
    boxBtn: '🎁 Open',
    boxDone: '✅ Opened today',
    chanTitle: '📢 Join channel',
    chanDesc: (n) => `Join our channel and get ${n} coin (one time only).`,
    chanDone: '✅ Claimed',
    join: 'Join',
    verify: '✔ Verify',
    walletTitle: '💸 Withdraw',
    walletInfo: (r, m) => `1,000 coin = ${r} MMK • Minimum ${m} coin • Reviewed and paid by admin.`,
    method: 'Payment method',
    phone: 'Phone number',
    coinsToWithdraw: 'Coins to withdraw',
    all: 'All',
    requestBtn: 'Request withdrawal',
    wait2: 'Please wait…',
    requested: (n) => `✅ Withdrawal of ${n} MMK requested`,
    myRequests: '📜 My requests',
    status: { pending: '⏳ Pending', paid: '✅ Paid', rejected: '❌ Rejected' },
    publicProof: '🧾 Paid users (public proof)',
    topTitle: '🏆 Top coin earners',
    you: '(you)',
  },
  my: {
    name: 'မြန်မာ',
    err: {
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
      generic: 'အမှားတစ်ခု ဖြစ်ပေါ်နေပါသည်။ ထပ်ကြိုးစားပါ။',
    },
    wait: (n) => `ခဏစောင့်ပါ (${n} စက္ကန့်) ပြီးမှ ထပ်ကြည့်ပါ။`,
    openInTg: 'ဤ Mini App ကို Telegram bot ထဲမှသာ ဖွင့်ပါ။',
    retry: '🔄 ပြန်ကြိုးစားမည်',
    loading: 'ခဏစောင့်ပါ…',
    connectFail: 'ချိတ်ဆက်၍ မရပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။',
    adNotReady: 'ကြော်ငြာစနစ် မရရှိသေးပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။',
    adOpenFail: 'ကြော်ငြာ ဖွင့်၍မရပါ။ ခဏနေမှ ထပ်ကြိုးစားပါ။',
    adNotDone: 'ကြော်ငြာကို အဆုံးထိ မကြည့်ခဲ့ပါ (သို့) ယခု ပြသရန် ကြော်ငြာမရှိသေးပါ။',
    got: (n) => `🎉 coin +${n} ရရှိပါပြီ`,
    checking: 'စစ်ဆေးနေဆဲ ဖြစ်ပါသည်။ ခဏနေမှ လက်ကျန်ကို ပြန်ကြည့်ပါ။',
    nav: { home: 'ပင်မ', tasks: 'လုပ်ငန်း', wallet: 'ငွေထုတ်', top: 'ထိပ်တန်း' },
    yourBalance: 'သင့် လက်ကျန်',
    kyat: 'ကျပ်',
    watchTitle: '📺 ကြော်ငြာကြည့်၍ coin ရယူပါ',
    watchDesc: (o) => `Rewarded video ကြော်ငြာတစ်ခု အဆုံးထိ ကြည့်လျှင် coin ${o} ရပါမည်။ ကြော်ငြာကြည့်ရန်မှာ မိမိ၏ ရွေးချယ်မှုသာ ဖြစ်ပြီး မကြည့်ဘဲ အခြား feature များကို သုံးနိုင်ပါသည်။`,
    watchBtn: (o) => `📺 ကြော်ငြာကြည့်မည် (+${o} coin)`,
    placementTitle: '📍 ကြော်ငြာပြသသည့်နေရာ',
    placement: (id, b) =>
      `စာမျက်နှာ: ပင်မ (Home) tab → အပေါ်က "ကြော်ငြာကြည့်မည်" ခလုတ်။ အမျိုးအစား: Adsgram rewarded video (Block ID ${id})။ ခလုတ်ကို ကိုယ်တိုင်နှိပ်မှသာ ပေါ်ပါမည်၊ အလိုအလျောက် မပေါ်ပါ။ (${b})`,
    watchedToday: (a, b) => `ယနေ့ ကြည့်ပြီး ${a}/${b} ခု`,
    howTitle: '📖 အသုံးပြုနည်း',
    how1: '“ကြော်ငြာကြည့်မည်” ကို နှိပ်ပြီး ကြော်ငြာကို အဆုံးထိ ကြည့်ပါ။',
    how2: (o) => `ကြည့်ပြီးတာနဲ့ coin ${o} ကို လက်ကျန်ထဲ အလိုအလျောက် ထည့်ပေးပါမည်။`,
    how3: '“လုပ်ငန်း” tab တွင် နေ့စဉ် check-in နှင့် Lucky Box ကို ကြော်ငြာမကြည့်ဘဲ အခမဲ့ ယူနိုင်ပါသည်။',
    how4: (m, k) => `coin ${m} (≈ ${k} ကျပ်) ပြည့်လျှင် “ငွေထုတ်” tab မှ ထုတ်ယူနိုင်ပါသည်။`,
    proofTitle: '🧾 ငွေထုတ်ပြီးသူများ (သက်သေ)',
    proofEmpty: 'ငွေထုတ်ပြီးသူ မှတ်တမ်း မကြာမီ ပြသပါမည်။',
    proofAll: '📢 သက်သေ Channel တွင် အားလုံးကြည့်ရန် →',
    toWallet: 'ငွေထုတ်ရန် →',
    checkinTitle: '📅 နေ့စဉ် Check-in',
    checkinDesc: (s) => `နေ့စဉ် ဝင်ပြီး နှိပ်ပါ။ ဆက်တိုက်ဝင်လေ coin ပိုရလေ။ (လက်ရှိ ${s} ရက်ဆက်တိုက်)`,
    checkinBtn: (b) => `Check-in လုပ်မည် (+${b}…)`,
    checkinDone: '✅ ယနေ့ ယူပြီး',
    boxTitle: '🎲 Lucky Box',
    boxDesc: (a, b) => `တစ်နေ့တစ်ကြိမ် အခမဲ့ ဖွင့်နိုင်ပါသည်။ coin ${a}–${b} ထိ ရနိုင်ပါသည်။`,
    boxBtn: '🎁 ဖွင့်မည်',
    boxDone: '✅ ယနေ့ ဖွင့်ပြီး',
    chanTitle: '📢 Channel Join',
    chanDesc: (n) => `ကျွန်ုပ်တို့ channel ကို join ပါက coin ${n} ရပါမည် (တစ်ကြိမ်သာ)။`,
    chanDone: '✅ ရယူပြီး',
    join: 'Join မည်',
    verify: '✔ စစ်ဆေးမည်',
    walletTitle: '💸 ငွေထုတ်ရန်',
    walletInfo: (r, m) => `coin 1,000 = ${r} ကျပ် • အနည်းဆုံး ${m} coin • admin မှ စစ်ဆေးပြီး လွှဲပေးပါမည်။`,
    method: 'ငွေလွှဲနည်းလမ်း',
    phone: 'ဖုန်းနံပါတ်',
    coinsToWithdraw: 'ထုတ်မည့် coin',
    all: 'အကုန်',
    requestBtn: 'ထုတ်ယူရန် တောင်းဆိုမည်',
    wait2: 'ခဏစောင့်ပါ…',
    requested: (n) => `✅ ${n} ကျပ် ထုတ်ယူရန် တောင်းဆိုပြီးပါပြီ`,
    myRequests: '📜 ကျွန်ုပ်၏ တောင်းဆိုမှုများ',
    status: { pending: '⏳ စောင့်ဆိုင်းဆဲ', paid: '✅ ပေးချေပြီး', rejected: '❌ ငြင်းပယ်' },
    publicProof: '🧾 ငွေထုတ်ပြီးသူများ (အများပြည်သူ သက်သေ)',
    topTitle: '🏆 coin အများဆုံး ရရှိသူများ',
    you: '(သင်)',
  },
};

function detectLang() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && LANGS[saved]) return saved;
  } catch (e) {
    /* ignore */
  }
  const code = String(tg?.initDataUnsafe?.user?.language_code || '').toLowerCase();
  return code.startsWith('my') ? 'my' : 'en'; // Myanmar users -> Burmese, everyone else (incl. reviewers) -> English
}

const LangCtx = React.createContext(LANGS.en);
const useT = () => React.useContext(LangCtx);

export default function App() {
  const [lang, setLang] = useState(detectLang);
  const t = LANGS[lang];
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState('');
  const [fatal, setFatal] = useState('');
  const [fatalKey, setFatalKey] = useState('');
  const [diag, setDiag] = useState('');
  const adRef = useRef(null);
  const toastTimer = useRef(null);

  const errText = (d) =>
    d?.error === 'cooldown' && d.waitSec ? t.wait(d.waitSec) : t.err[d?.error] || t.err.generic;

  const switchLang = () => {
    const next = lang === 'en' ? 'my' : 'en';
    setLang(next);
    try {
      localStorage.setItem('lang', next);
    } catch (e) {
      /* ignore */
    }
  };

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  const boot = useCallback(async () => {
    setFatalKey('');
    setDiag('');
    if (!hasTelegram) {
      setFatalKey('openInTg');
      return;
    }
    // Render Free server may be asleep: retry until it wakes up
    let r;
    for (let i = 0; i < 8; i++) {
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
      setFatalKey('banned');
    } else {
      setFatalKey('connectFail');
      setDiag(
        `status=${r.status} error=${r.data?.error || '-'} ${r.data?.reason || r.data?.detail || ''} | ${API_BASE}`
      );
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // Initialize the Adsgram block as soon as the app opens (retry if the SDK loads late)
  useEffect(() => {
    const tryInit = () => {
      if (adRef.current || !window.Adsgram || !BLOCK_ID) return false;
      try {
        adRef.current = window.Adsgram.init({ blockId: BLOCK_ID, debug: AD_DEBUG });
      } catch (e) {
        console.error('Adsgram init failed', e);
      }
      return Boolean(adRef.current);
    };
    if (tryInit()) return undefined;
    const iv = setInterval(() => tryInit() && clearInterval(iv), 500);
    return () => clearInterval(iv);
  }, []);

  const getAd = () => {
    if (!adRef.current && window.Adsgram && BLOCK_ID) {
      adRef.current = window.Adsgram.init({ blockId: BLOCK_ID, debug: AD_DEBUG });
    }
    return adRef.current;
  };

  async function watchAd() {
    if (busy) return;
    const ctrl = getAd();
    if (!ctrl) return say(t.adNotReady);

    setBusy('ad');
    try {
      const s = await api.adStart();
      if (!s.ok) return say(errText(s.data));

      try {
        await ctrl.show();
      } catch (e) {
        return say(e?.error ? t.adOpenFail : t.adNotDone);
      }

      // the server waits for the Adsgram callback, then grants coin
      for (let i = 0; i < 8; i++) {
        const c = await api.adClaim(s.data.eventId);
        if (c.status === 202) {
          await sleep(1500);
          continue;
        }
        if (c.ok) {
          setUser(c.data.user);
          haptic();
          say(t.got(c.data.reward));
        } else say(errText(c.data));
        return;
      }
      say(t.checking);
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
      say(t.got(r.data.reward));
    } else {
      haptic('error');
      say(errText(r.data));
    }
  }

  const LangBtn = (
    <button className="link" style={{ position: 'fixed', top: 8, right: 10, zIndex: 20, width: 'auto' }} onClick={switchLang}>
      🌐 {lang === 'en' ? LANGS.my.name : LANGS.en.name}
    </button>
  );

  if (fatalKey)
    return (
      <LangCtx.Provider value={t}>
        {LangBtn}
        <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div>{fatalKey === 'banned' ? t.err.banned : t[fatalKey]}</div>
          {diag && <div style={{ fontSize: 11, opacity: 0.6, wordBreak: 'break-all' }}>{diag}</div>}
          {hasTelegram && fatalKey !== 'banned' && (
            <button className="btn" style={{ maxWidth: 220 }} onClick={boot}>
              {t.retry}
            </button>
          )}
        </div>
      </LangCtx.Provider>
    );
  if (!user || !config)
    return (
      <LangCtx.Provider value={t}>
        {LangBtn}
        <div className="center">{t.loading}</div>
      </LangCtx.Provider>
    );

  return (
    <LangCtx.Provider value={t}>
      <div className="app">
        {LangBtn}
        <main>
          {tab === 'home' && <Home user={user} config={config} busy={busy} onWatch={watchAd} setTab={setTab} />}
          {tab === 'tasks' && <Tasks user={user} config={config} busy={busy} simple={simple} />}
          {tab === 'wallet' && <Wallet user={user} config={config} setUser={setUser} say={say} errText={errText} />}
          {tab === 'top' && <Top />}
        </main>

        {toast && <div className="toast">{toast}</div>}

        <nav>
          {[
            ['home', '🏠'],
            ['tasks', '🎁'],
            ['wallet', '💸'],
            ['top', '🏆'],
          ].map(([k, icon]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              <span>{icon}</span>
              {t.nav[k]}
            </button>
          ))}
        </nav>
      </div>
    </LangCtx.Provider>
  );
}

function BalanceCard({ user }) {
  const t = useT();
  return (
    <div className="card balance">
      <div className="muted">{t.yourBalance}</div>
      <div className="big">🪙 {fmt(user.balance)}</div>
      <div className="muted">
        ≈ {fmt(user.kyat)} {t.kyat}
      </div>
    </div>
  );
}

function PayoutList({ limit }) {
  const t = useT();
  const [payouts, setPayouts] = useState(null);
  useEffect(() => {
    api.payouts().then((r) => setPayouts(r.ok ? r.data.payouts : []));
  }, []);
  if (payouts === null) return <p className="muted">{t.loading}</p>;
  if (payouts.length === 0) return <p className="muted">{t.proofEmpty}</p>;
  return payouts.slice(0, limit || payouts.length).map((p) => (
    <div className="line" key={p.id}>
      <span>
        {p.name} • {p.method}
        {p.ref ? ` • ${p.ref}` : ''}
      </span>
      <b>
        {fmt(p.amount)} {t.kyat}
      </b>
    </div>
  ));
}

function Home({ user, config, busy, onWatch, setTab }) {
  const t = useT();
  const opts = config.rewardOptions.join(' / ');
  return (
    <>
      {/* Ad placement is the FIRST card on the Home screen so reviewers can find it immediately */}
      <div className="card" id="ad-placement">
        <h3>{t.watchTitle}</h3>
        <p className="muted">{t.watchDesc(opts)}</p>
        <button className="btn" disabled={!!busy || user.adsLeft === 0} onClick={onWatch}>
          {busy === 'ad' ? t.wait2 : t.watchBtn(opts)}
        </button>
        <div className="progress">
          <div style={{ width: `${(user.adsToday / config.maxAdsPerDay) * 100}%` }} />
        </div>
        <div className="muted small">{t.watchedToday(user.adsToday, config.maxAdsPerDay)}</div>
        <div className="muted small" style={{ marginTop: 8 }}>
          <b>{t.placementTitle}</b>
          <br />
          {t.placement(BLOCK_ID, BUILD)}
        </div>
      </div>

      <BalanceCard user={user} />

      <div className="card">
        <h3>{t.howTitle}</h3>
        <ol>
          <li>{t.how1}</li>
          <li>{t.how2(opts)}</li>
          <li>{t.how3}</li>
          <li>{t.how4(fmt(config.minWithdrawCoins), fmt(Math.floor((config.minWithdrawCoins / 1000) * config.kyatPer1000Coins)))}</li>
        </ol>
      </div>

      <div className="card">
        <h3>{t.proofTitle}</h3>
        <PayoutList limit={5} />
        {config.proofUrl && (
          <button
            className="link"
            onClick={() => (tg?.openTelegramLink ? tg.openTelegramLink(config.proofUrl) : window.open(config.proofUrl))}
          >
            {t.proofAll}
          </button>
        )}
        <button className="link" onClick={() => setTab('wallet')}>
          {t.toWallet}
        </button>
      </div>
    </>
  );
}

function Tasks({ user, config, busy, simple }) {
  const t = useT();
  return (
    <>
      <BalanceCard user={user} />

      <div className="card">
        <h3>{t.checkinTitle}</h3>
        <p className="muted">{t.checkinDesc(user.streak)}</p>
        <button className="btn" disabled={!user.canCheckin || !!busy} onClick={() => simple('checkin', api.checkin)}>
          {user.canCheckin ? t.checkinBtn(config.checkinBase) : t.checkinDone}
        </button>
      </div>

      <div className="card">
        <h3>{t.boxTitle}</h3>
        <p className="muted">{t.boxDesc(config.spinMin, config.spinMax)}</p>
        <button className="btn" disabled={!user.canSpin || !!busy} onClick={() => simple('spin', api.spin)}>
          {user.canSpin ? t.boxBtn : t.boxDone}
        </button>
      </div>

      <div className="card">
        <h3>{t.chanTitle}</h3>
        <p className="muted">{t.chanDesc(config.channelTaskReward)}</p>
        {user.channelTaskDone ? (
          <button className="btn" disabled>
            {t.chanDone}
          </button>
        ) : (
          <div className="row">
            <button
              className="btn ghost"
              onClick={() => (tg?.openTelegramLink ? tg.openTelegramLink(config.channelUrl) : window.open(config.channelUrl))}
            >
              {t.join}
            </button>
            <button className="btn" disabled={!!busy} onClick={() => simple('chan', api.channelTask)}>
              {t.verify}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Wallet({ user, config, setUser, say, errText }) {
  const t = useT();
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
      say(t.requested(fmt(r.data.amount)));
      setAccount('');
      load();
    } else {
      haptic('error');
      say(errText(r.data));
    }
  }

  return (
    <>
      <BalanceCard user={user} />

      <div className="card">
        <h3>{t.walletTitle}</h3>
        <p className="muted small">{t.walletInfo(config.kyatPer1000Coins, fmt(config.minWithdrawCoins))}</p>

        <label>{t.method}</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          {config.withdrawMethods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        <label>{t.phone}</label>
        <input inputMode="tel" placeholder="09xxxxxxxxx" value={account} onChange={(e) => setAccount(e.target.value)} />

        <label>{t.coinsToWithdraw}</label>
        <div className="row">
          <input inputMode="numeric" value={coins} onChange={(e) => setCoins(e.target.value)} />
          <button className="btn ghost" onClick={() => setCoins(String(user.balance))}>
            {t.all}
          </button>
        </div>
        <div className="muted small">
          ≈ {fmt(kyat)} {t.kyat}
        </div>

        <button className="btn" disabled={sending || n < config.minWithdrawCoins || n > user.balance || !account} onClick={submit}>
          {sending ? t.wait2 : t.requestBtn}
        </button>
      </div>

      {history.length > 0 && (
        <div className="card">
          <h3>{t.myRequests}</h3>
          {history.map((h) => (
            <div className="line" key={h.id}>
              <span>
                #{h.id} • {fmt(h.amount)} {t.kyat} • {h.method}
              </span>
              <b>{t.status[h.status]}</b>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3>{t.publicProof}</h3>
        <PayoutList />
      </div>
    </>
  );
}

function Top() {
  const t = useT();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.leaderboard().then((r) => r.ok && setRows(r.data.top));
  }, []);
  return (
    <div className="card">
      <h3>{t.topTitle}</h3>
      {!rows && <p className="muted">{t.loading}</p>}
      {rows?.map((r) => (
        <div className={`line ${r.me ? 'me' : ''}`} key={r.rank}>
          <span>
            {r.rank}. {r.name} {r.me && t.you}
          </span>
          <b>🪙 {fmt(r.coins)}</b>
        </div>
      ))}
    </div>
  );
}

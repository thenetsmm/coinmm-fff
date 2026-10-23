# adcoin-mm-frontend (Vercel)

Telegram Mini App — Vite + React၊ မြန်မာဘာသာ UI၊ Adsgram Rewarded ads

## Vercel တွင် Deploy လုပ်နည်း
1. GitHub တွင် repo အသစ် (ဥပမာ `adcoin-mm-frontend`) ဖွင့်ပြီး ဤ folder ထဲက file အားလုံး push လုပ်ပါ။
2. https://vercel.com → **Add New → Project** → ဤ repo ကို import (Framework: Vite က အလိုအလျောက် ရွေးမည်)။
3. **Environment Variables** ထည့်ပါ:
   - `VITE_API_URL` = Render backend URL (မထည့်လည်းရ — code ထဲတွင် default `https://coinmm.onrender.com` ထည့်ထားသည်။ URL ပြောင်းမှသာ ထည့်ပါ၊ **Type = Config**)
   - `VITE_ADSGRAM_BLOCK_ID` = Adsgram Block ID
   - `VITE_ADSGRAM_DEBUG` = `false`
4. Deploy နှိပ်ပါ။ ရလာသော URL (`https://xxxx.vercel.app`) ကို
   - backend ၏ `WEBAPP_URL` နှင့် `FRONTEND_URL` တွင် ထည့်ပြီး Render ကို redeploy လုပ်ပါ။
   - Adsgram Platform ၏ Mini App URL အဖြစ် ထည့်ပါ။
5. @BotFather → `/mybots` → bot → **Bot Settings → Menu Button** (သို့) **Configure Mini App** တွင် ဤ URL ကို သတ်မှတ်နိုင်သည်။

## Local စမ်းသပ်ရန်
```
npm install
cp .env.example .env   # ဖြည့်ပါ
npm run dev
```
Mini App သည် Telegram အတွင်းမှသာ အလုပ်လုပ်သည် (initData လိုအပ်သည်)။
စမ်းသပ်ရန် `VITE_ADSGRAM_DEBUG=true` ဖြင့် test ad ပြသနိုင်သည်၊ production မတင်မီ `false` ပြန်ထားပါ။
(debug ကြော်ငြာတွင် Reward URL မခေါ်သဖြင့် backend က coin မပေးပါ — ပုံမှန်ဖြစ်စဉ်ဖြစ်သည်)

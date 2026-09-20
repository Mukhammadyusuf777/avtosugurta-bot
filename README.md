# 🚗 AvtoSug'urta Telegram Boti (Cloudflare Workers & Cloudflare D1)

Avtomobil sug'urtasi (KASKO, OSAGO, EAPL) mijozlari hisobini yurituvchi, muddati tugayotgan sug'urtalarni avtomatik nazorat qiluvchi va 7 kun oldin ogohlantiruvchi to'liq Telegram-bot.

Loyiha server talab qilmaydi — to'liq **Cloudflare Workers** (serverless) va **Cloudflare D1** (serverless SQL) bazasida ishlaydi.

---

## 🌟 Asosiy Imkoniyatlar

- 🇺🇿 **100% O'zbek tilida (lotin alifbosi)**: Qulay tugmali menyu va tushunarli kartochkalar.
- 📋 **Mijozlar ro'yxati**: Barcha mijozlar polislari ro'yxati (sahifalash / pagination bilan).
- ⚠️ **7 kunlik nazorat (Tugashi yaqinlashayotganlar)**: Muddati 7 kun ichida tugaydigan va muddati o'tib ketgan polislarni rangli indikatorlar (🟢, 🟡, ⚠️, 🔴) bilan ko'rsatish.
- ⏰ **Avtomatik kunlik eslatma (Cloudflare Cron Trigger)**: Har kuni ertalab soat 11:00 da (Toshkent vaqti) sug'urta muddati roppa-rosa 7 kundan keyin tugaydigan mijozlar bo'yicha administratorga ogohlantirish yuborish.
- 📊 **Batafsil statistika**: Jami mijozlar, faol sug'urtalar soni va foizi, tugashi yaqinlashayotganlar soni.
- ➕ **Erkin matn yoki fayl orqali mijoz qo'shish**:
  - Bitta yoki bir nechta mijoz ma'lumotlarini to'g'ridan-to'g'ri Telegram chatga yozish yoki tashlash.
  - `.txt` yoki `.csv` formatdagi hujjatlarni yuborish orqali barcha qatorlarni avtomatik bazaga kiritish.
- 🔍 **Tezkor qidiruv**: Avtomobil davlat raqami, mijoz ismi yoki polis raqami bo'yicha darhol topish.

---

## 🗄 Ma'lumotlar Bazasi Tuzilmasi (D1 SQL)

`insurance_clients` jadvali:
| Maydon | Turi | Tavsif |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Unikal identifikator |
| `full_name` | TEXT | Mijozning F.I.O |
| `car_number` | TEXT | Avtomobil davlat raqami (masalan: `60O664OO`) |
| `policy_number` | TEXT | Sug'urta polisi raqami (masalan: `EAPL 2256920`) |
| `start_date` | TEXT | Amal qilish boshlanish sanasi (`YYYY-MM-DD`) |
| `end_date` | TEXT | Amal qilish tugash sanasi (`YYYY-MM-DD`) |
| `created_at` | TEXT | Yaratilgan vaqt |

Boshlang'ich migratsiya faylida 13 ta mijoz ma'lumotlari (`migrations/0002_seed.sql`) kiritilgan.

---

## 🚀 O'rnatish va Ishga Tushirish (Deploy)

### 1. Talablar
- Kompyuteringizda **Node.js** (v18+) o'rnatilgan bo'lishi kerak.
- **Telegram Bot Token** (@BotFather orqali olingan).
- **Admin Chat ID** (o'zingizning Telegram ID raqamingiz, masalan @userinfobot orqali olishingiz mumkin).
- **Cloudflare** hisobi (bepul tarif yetarli).

---

### 2. Bosqichma-bosqich Qo'llanma

#### 1-Qadam: Bog'liqliklarni o'rnatish
```bash
npm install
```

#### 2-Qadam: Cloudflare tizimiga kirish
```bash
npx wrangler login
```
*(Brauzer ochiladi, "Allow" tugmasini bosasiz).*

#### 3-Qadam: Cloudflare D1 ma'lumotlar bazasini yaratish
```bash
npx wrangler d1 create avtosugurta-db
```
Konsolda quyidagiga o'xshash javob chiqadi:
```toml
[[d1_databases]]
binding = "DB"
database_name = "avtosugurta-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
Chiqqan `database_id` qiymatini nusxalang va `wrangler.toml` faylidagi `REPLACE_WITH_YOUR_D1_DATABASE_ID` o'rniga qo'ying.

#### 4-Qadam: Migratsiyalarni masofaviy (Cloudflare) bazaga qo'llash
Baza jadvalini yaratish va 13 ta mijozni kiritish uchun:
```bash
npm run d1:migrate:remote
```
*(Lokal sinash uchun `npm run d1:migrate:local` buyrug'idan foydalanishingiz mumkin).*

#### 5-Qadam: Maxfiy kalitlarni (Secrets) kiritish
Bot tokenini kiritish:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
```
*(So'ralganda Telegram bot tokeningizni yozib Enter bosing).*

Admin chat ID sini kiritish (kunlik avtomatik eslatmalar boradigan chat):
```bash
npx wrangler secret put ADMIN_CHAT_ID
```
*(O'zingizning Telegram chat ID raqamingizni kiriting).*

*(Ixtiyoriy)* Webhook xavfsizlik kaliti:
```bash
npx wrangler secret put SECRET_TOKEN
```

#### 6-Qadam: Loyihani Cloudflare Workers'ga joylashtirish (Deploy)
```bash
npm run deploy
```
Muvaffaqiyatli yakunlangach, konsolda Worker manzili chiqadi, masalan:
```
https://avtosugurta-bot.<sizning-subdomeningiz>.workers.dev
```

#### 7-Qadam: Telegram Webhook'ni o'rnatish
Brauzer orqali yoki quyidagi havolani oching (o'zingizning `<BOT_TOKEN>` va `<WORKER_URL>` qiymatlaringizni qo'yib):
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<WORKER_URL>/
```

Agar `SECRET_TOKEN` ishlatgan bo'lsangiz:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<WORKER_URL>/&secret_token=<SECRET_TOKEN>
```

Muvaffaqiyatli bo'lsa: `{"ok":true,"result":true,"description":"Webhook was set"}` xabari qaytadi.

Bot tayyor! Telegramda botingizga kiring va `/start` buyrug'ini bosing.

---

## 📝 Yangi Mijoz Qo'shish Formatlari

Botga yangi mijoz kiritish uchun qulay formatlardan foydalanishingiz mumkin:

### 1. Qatorli format (namuna):
```text
ERMATOV MAXAMATJAN AZAMDJANOVICH | 60O664OO | EAPL 2256920 | 2026-05-22 — 2027-05-21
```

### 2. Ko'p qatorli matn (birdaniga bir nechta mijoz):
```text
KADIROV NURULLO SAIBJONOVICH | 60Z352FB | EAPL 2288471 | 2026-06-06 — 2027-06-05
GAPUROV BAXROMJAN MARIPOVICH | 60A024BB | EAPL 2538556 | 2026-09-14 — 2027-09-13
BABAYEV MUXAMMADABDULLO ABIDJON O‘G‘LI | 60A340NA | EAPL 2365049 | 2026-07-10 — 2027-07-09
```

### 3. Hujjat fayl tashlash (.txt yoki .csv):
Yuqoridagi formatdagi ro'yxatni fayl sifatida yuborsangiz, bot barcha qatorlarni o'qib, avtomatik bazaga qo'shadi va hisobot beradi.

---

## 🧪 Sinov (Test)

Matn tahlilchisini (parser) lokal tekshirish:
```bash
npm test
```

TypeScript turlarini tekshirish:
```bash
npm run build
```

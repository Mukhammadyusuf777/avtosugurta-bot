import { TelegramReplyKeyboardMarkup } from './types';

export const BOT_BUTTONS = {
  CLIENTS_LIST: "📋 Mijozlar ro'yxati",
  EXPIRING_SOON: "⚠️ Tugashi yaqinlashayotganlar",
  STATISTICS: "📊 Statistika",
  ADD_CLIENT: "➕ Yangi mijoz qo'shish",
  SEARCH_CLIENT: "🔍 Qidirish",
  HELP: "ℹ️ Yordam",
};

export const MAIN_MENU_KEYBOARD: TelegramReplyKeyboardMarkup = {
  keyboard: [
    [{ text: BOT_BUTTONS.CLIENTS_LIST }, { text: BOT_BUTTONS.EXPIRING_SOON }],
    [{ text: BOT_BUTTONS.STATISTICS }, { text: BOT_BUTTONS.ADD_CLIENT }],
    [{ text: BOT_BUTTONS.SEARCH_CLIENT }, { text: BOT_BUTTONS.HELP }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

export const CANCEL_KEYBOARD: TelegramReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "❌ Bekor qilish" }]
  ],
  resize_keyboard: true,
};

export const MESSAGES = {
  WELCOME: (name: string) =>
    `Assalomu alaykum, <b>${escapeHtml(name)}</b>!\n\n` +
    `🚗 <b>AvtoSug'urta Boshqaruv Botiga</b> xush kelibsiz.\n\n` +
    `Bu bot orqali mijozlar sug'urta polislari hisobini yuritishingiz, muddati tugayotganlarni kuzatishingiz va yangi buyurtmalarni qo'shishingiz mumkin.\n\n` +
    `Quyidagi tugmalardan birini tanlang:`,

  HELP:
    `ℹ️ <b>Botdan foydalanish bo'yicha qo'llanma:</b>\n\n` +
    `• <b>📋 Mijozlar ro'yxati</b> — barcha mijozlar va sug'urta polislari ro'yxatini ko'rish.\n` +
    `• <b>⚠️ Tugashi yaqinlashayotganlar</b> — muddati 7 kun ichida tugaydigan polislarni aniqlash.\n` +
    `• <b>📊 Statistika</b> — sug'urtalar holati (jami, faol, tugayotgan, tugagan) ko'rsatkichlari.\n` +
    `• <b>➕ Yangi mijoz qo'shish</b> — yangi sug'urta polisini matn yoki fayl orqali kiritish.\n` +
    `• <b>🔍 Qidirish</b> — avtomobil davlat raqami, F.I.O yoki polis raqami bo'yicha qidirish.\n\n` +
    `🔔 <i>Bot har kuni avtomatik ravishda muddati 7 kundan keyin tugaydigan polislarni tekshiradi va ogohlantirish yuboradi.</i>`,

  ADD_CLIENT_INSTRUCTIONS:
    `➕ <b>Yangi mijoz qo'shish:</b>\n\n` +
    `Mijoz ma'lumotlarini bitta xabarda quyidagi formatda yuboring:\n\n` +
    `<code>F.I.O | Avto raqam | Polis raqami | Boshlanish — Tugash</code>\n\n` +
    `<b>Namuna:</b>\n` +
    `<code>ERMATOV MAXAMATJAN AZAMDJANOVICH | 60O664OO | EAPL 2256920 | 2026-05-22 — 2027-05-21</code>\n\n` +
    `💡 <i>Shuningdek, bir vaqtning o'zida bir nechta mijozni qatorma-qator yuborishingiz yoki <b>.txt / .csv</b> hujjat fayl tashlashingiz ham mumkin!</i>`,

  SEARCH_INSTRUCTIONS:
    `🔍 <b>Qidiruv:</b>\n\n` +
    `Qidirmoqchi bo'lgan avtomobil raqami (masalan, <code>60O664OO</code>), mijoz familiyasi yoki polis raqamini yozib yuboring.`,

  NO_CLIENTS_FOUND: `❌ Hech qanday mijoz topilmadi.`,
  NO_EXPIRING_CLIENTS: `✅ Yaqin 7 kun ichida muddati tugaydigan sug'urta mavjud emas. Barcha polislar o'z vaqtida nazoratda!`,
};

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

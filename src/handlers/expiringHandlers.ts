import { MESSAGES } from '../config';
import { getDaysRemaining, getExpiringClients } from '../db';
import { TelegramBot } from '../telegram';
import { formatClientCard } from './clientHandlers';

export async function handleExpiringSoon(
  bot: TelegramBot,
  db: D1Database,
  chatId: number
): Promise<void> {
  const clients = await getExpiringClients(db, 7);

  if (clients.length === 0) {
    await bot.sendMessage(chatId, MESSAGES.NO_EXPIRING_CLIENTS);
    return;
  }

  // Separate expired and soon-to-expire (<= 7 days)
  const expired = clients.filter((c) => getDaysRemaining(c.end_date) < 0);
  const expiringIn7 = clients.filter((c) => {
    const r = getDaysRemaining(c.end_date);
    return r >= 0 && r <= 7;
  });

  let message = `⚠️ <b>TUGASHI YAQINLASHAYOTGAN VA MUDDATI O'TGAN POLISLAR:</b>\n\n`;

  if (expiringIn7.length > 0) {
    message += `⏳ <b>Yaqin 7 kun ichida tugaydiganlar (${expiringIn7.length} ta):</b>\n\n`;
    message += expiringIn7.map((c, i) => formatClientCard(c, i + 1)).join('\n\n────────────────\n\n');
    message += `\n\n`;
  }

  if (expired.length > 0) {
    message += `🔴 <b>Muddati o'tib ketganlar (${expired.length} ta):</b>\n\n`;
    message += expired.map((c, i) => formatClientCard(c, i + 1)).join('\n\n────────────────\n\n');
    message += `\n\n`;
  }

  message += `💡 <i>Mijozlar bilan bog'lanib, yangi polis rasmiylashtirishni taklif etish tavsiya qilinadi!</i>`;

  await bot.sendMessage(chatId, message);
}

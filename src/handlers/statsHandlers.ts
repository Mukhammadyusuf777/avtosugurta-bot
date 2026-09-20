import { getStats, getTashkentDateString } from '../db';
import { TelegramBot } from '../telegram';

export async function handleStats(
  bot: TelegramBot,
  db: D1Database,
  chatId: number
): Promise<void> {
  const stats = await getStats(db);
  const todayStr = getTashkentDateString();

  const activePercent = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

  const text =
    `📊 <b>SUG'URTALAR STATISTIKASI</b>\n` +
    `<i>Holat: ${todayStr}</i>\n\n` +
    `👥 <b>Jami mijozlar:</b> <code>${stats.total}</code> ta\n` +
    `🟢 <b>Faol sug'urtalar:</b> <code>${stats.active}</code> ta (${activePercent}%)\n` +
    `⚠️ <b>7 kun ichida tugaydigan:</b> <code>${stats.expiringIn7Days}</code> ta\n` +
    `🔴 <b>Muddati o'tganlar:</b> <code>${stats.expired}</code> ta\n\n` +
    `📈 <b>Xulosa:</b>\n` +
    (stats.expiringIn7Days > 0
      ? `⚠️ <i>${stats.expiringIn7Days} ta mijozning sug'urtasi yaqin kunlarda tugaydi! "⚠️ Tugashi yaqinlashayotganlar" tugmasi orqali ularni ko'rishingiz mumkin.</i>`
      : `✅ <i>Barcha faol polislar nazoratda, yaqin 7 kunda tugaydiganlar yo'q.</i>`);

  await bot.sendMessage(chatId, text);
}

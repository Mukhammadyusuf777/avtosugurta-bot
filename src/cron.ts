import { escapeHtml } from './config';
import { getClientsExpiringInExactDays, getTashkentDateString } from './db';
import { TelegramBot } from './telegram';
import { Env } from './types';

export async function handleScheduledReminder(env: Env): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN is not configured, skipping cron reminder');
    return;
  }

  if (!env.ADMIN_CHAT_ID) {
    console.warn('ADMIN_CHAT_ID is not configured, skipping cron reminder');
    return;
  }

  const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);
  const adminChatId = env.ADMIN_CHAT_ID;

  // Retrieve policies that expire in exactly 7 days
  const expiringIn7 = await getClientsExpiringInExactDays(env.DB, 7);

  if (expiringIn7.length === 0) {
    console.log('Cron check completed: No clients expiring in 7 days today.');
    return;
  }

  const todayStr = getTashkentDateString();
  const targetDateStr = getTashkentDateString(new Date(), 7);

  let message =
    `🔔 <b>AVTOMATIK KUNLIK ESLATMA: 7 KUN QOLDI!</b>\n` +
    `<i>Sana: ${todayStr} (Tugash sanasi: ${targetDateStr})</i>\n\n` +
    `⚠️ Hurmatli administrator! Quyidagi <b>${expiringIn7.length} ta mijoz</b>ning sug'urta muddati tugashiga roppa-rosa <b>7 kun</b> qoldi:\n\n`;

  const items = expiringIn7.map((c, i) =>
    `<b>${i + 1}.</b> 👤 <b>${escapeHtml(c.full_name)}</b>\n` +
    `   🚗 Avto raqam: <code>${escapeHtml(c.car_number)}</code>\n` +
    `   📄 Polis: <code>${escapeHtml(c.policy_number)}</code>\n` +
    `   📅 Tugash kuni: <code>${c.end_date}</code>`
  );

  message += items.join('\n\n');
  message += `\n\n📞 <i>Mijozlar bilan bog'lanib, yangi sug'urta polisini rasmiylashtirishni taklif eting!</i>`;

  await bot.sendMessage(adminChatId, message);
  console.log(`Cron reminder sent for ${expiringIn7.length} clients to admin ${adminChatId}`);
}

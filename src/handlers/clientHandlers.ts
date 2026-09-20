import { escapeHtml } from '../config';
import { getAllClients, getDaysRemaining, searchClients } from '../db';
import { TelegramBot } from '../telegram';
import { InsuranceClient, TelegramInlineKeyboardMarkup } from '../types';

export function formatClientCard(client: InsuranceClient, index?: number): string {
  const remaining = getDaysRemaining(client.end_date);
  let statusBadge = '';

  if (remaining < 0) {
    statusBadge = `🔴 <b>Muddati o'tgan</b> (${Math.abs(remaining)} kun oldin)`;
  } else if (remaining === 0) {
    statusBadge = `🚨 <b>BUGUN TUGAYDI!</b>`;
  } else if (remaining <= 7) {
    statusBadge = `⚠️ <b>Tugashiga ${remaining} kun qoldi!</b>`;
  } else if (remaining <= 30) {
    statusBadge = `🟡 Faol (${remaining} kun qoldi)`;
  } else {
    statusBadge = `🟢 Faol (${remaining} kun qoldi)`;
  }

  const prefix = index !== undefined ? `<b>${index}.</b> ` : '';

  return (
    `${prefix}👤 <b>${escapeHtml(client.full_name)}</b>\n` +
    `🚗 Avto raqam: <code>${escapeHtml(client.car_number)}</code>\n` +
    `📄 Polis: <code>${escapeHtml(client.policy_number)}</code>\n` +
    `📅 Amal qilish: <code>${client.start_date}</code> — <code>${client.end_date}</code>\n` +
    `⏳ Holat: ${statusBadge}`
  );
}

export async function handleClientsList(
  bot: TelegramBot,
  db: D1Database,
  chatId: number,
  page: number = 1,
  pageSize: number = 5,
  messageIdToEdit?: number
): Promise<void> {
  const offset = (page - 1) * pageSize;
  const { clients, total } = await getAllClients(db, pageSize, offset);

  if (total === 0) {
    await bot.sendMessage(
      chatId,
      `📋 <b>Mijozlar ro'yxati bo'sh.</b>\n\nYangi mijoz qo'shish uchun "➕ Yangi mijoz qo'shish" tugmasini bosing.`
    );
    return;
  }

  const totalPages = Math.ceil(total / pageSize);
  const validPage = Math.min(Math.max(1, page), totalPages);

  const lines = clients.map((c, i) => formatClientCard(c, offset + i + 1));
  const text =
    `📋 <b>Mijozlar ro'yxati</b> (Jami: ${total} ta)\n` +
    `<i>Sahifa ${validPage} / ${totalPages}</i>\n\n` +
    lines.join('\n\n────────────────\n\n');

  // Build pagination buttons
  const buttons: { text: string; callback_data: string }[] = [];
  if (validPage > 1) {
    buttons.push({ text: '⬅️ Oldingi', callback_data: `page:${validPage - 1}` });
  }
  buttons.push({ text: `📄 ${validPage}/${totalPages}`, callback_data: 'noop' });
  if (validPage < totalPages) {
    buttons.push({ text: 'Keyingi ➡️', callback_data: `page:${validPage + 1}` });
  }

  const replyMarkup: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [buttons],
  };

  if (messageIdToEdit) {
    await bot.editMessageText(chatId, messageIdToEdit, text, {
      reply_markup: replyMarkup,
    });
  } else {
    await bot.sendMessage(chatId, text, {
      reply_markup: replyMarkup,
    });
  }
}

export async function handleSearch(
  bot: TelegramBot,
  db: D1Database,
  chatId: number,
  query: string
): Promise<void> {
  const results = await searchClients(db, query);

  if (results.length === 0) {
    await bot.sendMessage(
      chatId,
      `🔍 "<code>${escapeHtml(query)}</code>" bo'yicha hech qanday mijoz topilmadi.\n` +
        `Avto raqami, F.I.O yoki polis raqamini tekshirib qayta urinib ko'ring.`
    );
    return;
  }

  const cards = results.map((c, i) => formatClientCard(c, i + 1));
  const text =
    `🔍 <b>Qidiruv natijalari:</b> "${escapeHtml(query)}"\n` +
    `Topildi: <b>${results.length}</b> ta mijoz\n\n` +
    cards.join('\n\n────────────────\n\n');

  await bot.sendMessage(chatId, text);
}

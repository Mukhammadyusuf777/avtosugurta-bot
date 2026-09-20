import { MESSAGES } from '../config';
import { addClientsBatch } from '../db';
import { parseClientsText } from '../parser';
import { TelegramBot } from '../telegram';
import { TelegramDocument } from '../types';
import { formatClientCard } from './clientHandlers';

export async function handleAddClientPrompt(
  bot: TelegramBot,
  chatId: number
): Promise<void> {
  await bot.sendMessage(chatId, MESSAGES.ADD_CLIENT_INSTRUCTIONS);
}

export async function handleProcessTextOrFile(
  bot: TelegramBot,
  db: D1Database,
  chatId: number,
  text: string
): Promise<void> {
  const result = parseClientsText(text);

  if (result.success.length === 0) {
    let errorMsg = `❌ <b>Kiritilgan matndan mijoz ma'lumotlarini aniqlab bo'lmadi.</b>\n\n`;
    if (result.errors.length > 0) {
      errorMsg += `<b>Xatolik sababi:</b> ${result.errors[0].reason}\n\n`;
    }
    errorMsg +=
      `Iltimos, ma'lumotlarni quyidagi tartibda yuboring:\n` +
      `<code>F.I.O | Avto raqam | Polis | Boshlanish — Tugash</code>\n\n` +
      `<b>Masalan:</b>\n` +
      `<code>ERMATOV MAXAMATJAN AZAMDJANOVICH | 60O664OO | EAPL 2256920 | 2026-05-22 — 2027-05-21</code>`;

    await bot.sendMessage(chatId, errorMsg);
    return;
  }

  // Insert batch into D1
  const insertedCount = await addClientsBatch(db, result.success);

  if (result.success.length === 1) {
    const single = result.success[0];
    const previewCard = formatClientCard({
      id: 0,
      full_name: single.full_name,
      car_number: single.car_number,
      policy_number: single.policy_number,
      start_date: single.start_date,
      end_date: single.end_date,
    });

    await bot.sendMessage(
      chatId,
      `✅ <b>Yangi mijoz muvaffaqiyatli saqlandi!</b>\n\n` + previewCard
    );
  } else {
    // Multiple clients
    let response = `✅ <b>${insertedCount} ta mijoz bazaga muvaffaqiyatli qo'shildi!</b>\n\n`;

    const preview = result.success.slice(0, 5).map((c, i) =>
      `<b>${i + 1}.</b> ${c.full_name} (${c.car_number}) — <code>${c.policy_number}</code>`
    );
    response += preview.join('\n');

    if (result.success.length > 5) {
      response += `\n<i>... va yana ${result.success.length - 5} ta mijoz.</i>`;
    }

    if (result.errors.length > 0) {
      response += `\n\n⚠️ <b>Quyidagi ${result.errors.length} ta qator o'qilmadi:</b>\n`;
      const errLines = result.errors.slice(0, 3).map((e) => `• <code>${e.line}</code>`);
      response += errLines.join('\n');
    }

    await bot.sendMessage(chatId, response);
  }
}

export async function handleDocumentUpload(
  bot: TelegramBot,
  db: D1Database,
  chatId: number,
  doc: TelegramDocument
): Promise<void> {
  const fileInfo = await bot.getFile(doc.file_id);
  if (!fileInfo || !fileInfo.file_path) {
    await bot.sendMessage(chatId, `❌ Faylni Telegram serveridan yuklab olish imkoni bo'lmadi.`);
    return;
  }

  try {
    const fileContent = await bot.downloadFileAsText(fileInfo.file_path);
    await handleProcessTextOrFile(bot, db, chatId, fileContent);
  } catch (err: any) {
    await bot.sendMessage(chatId, `❌ Faylni o'qishda xatolik yuz berdi: ${err.message}`);
  }
}

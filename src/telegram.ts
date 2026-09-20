import {
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
  TelegramReplyKeyboardRemove,
} from './types';

export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?:
    | TelegramInlineKeyboardMarkup
    | TelegramReplyKeyboardMarkup
    | TelegramReplyKeyboardRemove;
  disable_web_page_preview?: boolean;
}

export class TelegramBot {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options: SendMessageOptions = {}
  ): Promise<any> {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode ?? 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
    };

    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Telegram sendMessage failed: ${res.status} ${err}`);
      throw new Error(`Telegram sendMessage failed: ${err}`);
    }

    return await res.json();
  }

  async editMessageText(
    chatId: number | string,
    messageId: number,
    text: string,
    options: {
      parse_mode?: 'HTML' | 'Markdown';
      reply_markup?: TelegramInlineKeyboardMarkup;
    } = {}
  ): Promise<any> {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options.parse_mode ?? 'HTML',
      ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
    };

    const res = await fetch(`${this.baseUrl}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await res.json();
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert: boolean = false
  ): Promise<any> {
    const payload = {
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: showAlert } : {}),
    };

    const res = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await res.json();
  }

  async deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });

    const data = (await res.json()) as { ok: boolean };
    return data.ok;
  }

  async getFile(fileId: string): Promise<{ file_path?: string } | null> {
    const res = await fetch(`${this.baseUrl}/getFile?file_id=${fileId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; result?: { file_path?: string } };
    return data.ok && data.result ? data.result : null;
  }

  async downloadFileAsText(filePath: string): Promise<string> {
    const downloadUrl = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Faylni yuklab olishda xatolik: ${res.statusText}`);
    }
    return await res.text();
  }
}

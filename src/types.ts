export interface InsuranceClient {
  id: number;
  full_name: string;
  car_number: string;
  policy_number: string;
  start_date: string;
  end_date: string;
  created_at?: string;
}

export type NewInsuranceClient = Omit<InsuranceClient, 'id' | 'created_at'>;

export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_CHAT_ID?: string;
  SECRET_TOKEN?: string;
  TIMEZONE?: string;
  DEFAULT_PAGE_SIZE?: string;
}

// Telegram Bot API Types
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  caption?: string;
  document?: TelegramDocument;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramKeyboardButton {
  text: string;
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramReplyKeyboardRemove {
  remove_keyboard: true;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface ClientStats {
  total: number;
  active: number;
  expiringIn7Days: number;
  expired: number;
}

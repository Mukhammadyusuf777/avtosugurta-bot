import { BOT_BUTTONS, MAIN_MENU_KEYBOARD, MESSAGES } from './config';
import { handleScheduledReminder } from './cron';
import { handleAddClientPrompt, handleDocumentUpload, handleProcessTextOrFile } from './handlers/addClientHandlers';
import { handleClientsList, handleSearch } from './handlers/clientHandlers';
import { handleExpiringSoon } from './handlers/expiringHandlers';
import { handleStats } from './handlers/statsHandlers';
import { parseClientLine } from './parser';
import { TelegramBot } from './telegram';
import { Env, TelegramUpdate } from './types';

export default {
  /**
   * Main HTTP Fetch Handler (Telegram Webhook & Health Check)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (request.method === 'GET') {
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(
          JSON.stringify(
            {
              status: 'ok',
              service: 'avtosugurta-telegram-bot',
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Manual test trigger for admin reminder (e.g. GET /trigger-cron?secret=xxx)
      if (url.pathname === '/trigger-cron') {
        const secretParam = url.searchParams.get('secret');
        if (env.SECRET_TOKEN && secretParam !== env.SECRET_TOKEN) {
          return new Response('Unauthorized', { status: 401 });
        }
        await handleScheduledReminder(env);
        return new Response(JSON.stringify({ success: true, message: 'Scheduled reminder executed' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Method Not Allowed', { status: 405 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Optional secret token verification
    if (env.SECRET_TOKEN) {
      const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (headerSecret !== env.SECRET_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    if (!env.TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not configured');
      return new Response('TELEGRAM_BOT_TOKEN is not configured', { status: 500 });
    }

    const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);
    const pageSize = env.DEFAULT_PAGE_SIZE ? parseInt(env.DEFAULT_PAGE_SIZE, 10) : 5;

    let update: TelegramUpdate;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Process Update asynchronously within Worker context
    ctx.waitUntil(
      (async () => {
        try {
          await processTelegramUpdate(update, bot, env, pageSize);
        } catch (err) {
          console.error('Error handling update:', err);
        }
      })()
    );

    return new Response('OK', { status: 200 });
  },

  /**
   * Cloudflare Cron Trigger Handler
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          console.log(`Cron triggered at: ${new Date().toISOString()}`);
          await handleScheduledReminder(env);
        } catch (err) {
          console.error('Error executing scheduled cron reminder:', err);
        }
      })()
    );
  },
};

/**
 * Handle incoming Telegram Update
 */
async function processTelegramUpdate(
  update: TelegramUpdate,
  bot: TelegramBot,
  env: Env,
  pageSize: number
): Promise<void> {
  // 1. Handle Inline Button Callbacks (e.g. Pagination)
  if (update.callback_query) {
    const cq = update.callback_query;
    const data = cq.data || '';
    const chatId = cq.message?.chat.id || cq.from.id;
    const messageId = cq.message?.message_id;

    if (data.startsWith('page:') && messageId) {
      const targetPage = parseInt(data.replace('page:', ''), 10);
      await bot.answerCallbackQuery(cq.id);
      await handleClientsList(bot, env.DB, chatId, targetPage, pageSize, messageId);
      return;
    }

    if (data === 'noop') {
      await bot.answerCallbackQuery(cq.id);
      return;
    }

    await bot.answerCallbackQuery(cq.id);
    return;
  }

  // 2. Handle Messages
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text?.trim() || msg.caption?.trim() || '';

  // Document upload (.txt, .csv, etc.)
  if (msg.document) {
    await handleDocumentUpload(bot, env.DB, chatId, msg.document);
    return;
  }

  if (!text) return;

  // Command & Button routing
  if (text === '/start') {
    const senderName = msg.from?.first_name || 'Foydalanuvchi';
    await bot.sendMessage(chatId, MESSAGES.WELCOME(senderName), {
      reply_markup: MAIN_MENU_KEYBOARD,
    });
    return;
  }

  if (text === '/help' || text === BOT_BUTTONS.HELP) {
    await bot.sendMessage(chatId, MESSAGES.HELP, {
      reply_markup: MAIN_MENU_KEYBOARD,
    });
    return;
  }

  if (text === BOT_BUTTONS.CLIENTS_LIST || text === '/clients') {
    await handleClientsList(bot, env.DB, chatId, 1, pageSize);
    return;
  }

  if (text === BOT_BUTTONS.EXPIRING_SOON || text === '/expiring') {
    await handleExpiringSoon(bot, env.DB, chatId);
    return;
  }

  if (text === BOT_BUTTONS.STATISTICS || text === '/stats') {
    await handleStats(bot, env.DB, chatId);
    return;
  }

  if (text === BOT_BUTTONS.ADD_CLIENT || text === '/add') {
    await handleAddClientPrompt(bot, chatId);
    return;
  }

  if (text === BOT_BUTTONS.SEARCH_CLIENT || text === '/search') {
    await bot.sendMessage(chatId, MESSAGES.SEARCH_INSTRUCTIONS);
    return;
  }

  // Check if text looks like client data to add
  // (contains '|', multiple lines, or matches client parsing rules)
  const isMultiLine = text.includes('\n');
  const hasDelimiter = text.includes('|') || text.includes(';') || text.includes('\t');
  const parsedCandidate = !isMultiLine ? parseClientLine(text) : null;

  if (hasDelimiter || isMultiLine || parsedCandidate) {
    await handleProcessTextOrFile(bot, env.DB, chatId, text);
    return;
  }

  // Otherwise, treat input as a search query (by car number, full name, or policy)
  await handleSearch(bot, env.DB, chatId, text);
}

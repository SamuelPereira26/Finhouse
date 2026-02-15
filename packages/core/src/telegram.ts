import { TELEGRAM } from './constants';
import { createRule } from './rules';
import { extractMonth, formatAmount } from './utils';

type TelegramApiResponse = {
  ok: boolean;
  result?: unknown;
  description?: string;
};

export type TelegramContext = {
  getResumen: () => Promise<{
    month: string;
    income: number;
    lifeExpense: number;
    available: number;
    contributions: number;
    donations: number;
  }>;
  getComparativa: () => Promise<{ currentMonth: string; previousMonth: string; delta: number }>;
  getPresupuesto: () => Promise<Array<{ macro: string; spent: number; budget_amount: number }>>;
  getPendientes: () => Promise<{ total: number; needs_review: number; sugerido: number }>;
  getDonaciones: () => Promise<{ month: string; amount: number; target: number }>;
  createRule: (rule: ReturnType<typeof createRule>) => Promise<void>;
};

async function callTelegram<T extends object>(method: string, payload: T): Promise<TelegramApiResponse> {
  if (!TELEGRAM.BOT_TOKEN) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN no configurado' };
  }

  const response = await fetch(`${TELEGRAM.API_URL}/bot${TELEGRAM.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return {
      ok: false,
      description: `HTTP ${response.status}`
    };
  }

  return (await response.json()) as TelegramApiResponse;
}

export async function setTelegramWebhook(url: string): Promise<TelegramApiResponse> {
  return callTelegram('setWebhook', { url });
}

export async function sendTelegramMessage(
  text: string,
  options: {
    chat_id?: string;
    reply_markup?: Record<string, unknown>;
    parse_mode?: 'Markdown';
  } = {}
): Promise<TelegramApiResponse> {
  const chat_id = options.chat_id ?? TELEGRAM.CHAT_ID;
  return callTelegram('sendMessage', {
    chat_id,
    text,
    parse_mode: options.parse_mode ?? 'Markdown',
    reply_markup: options.reply_markup
  });
}

export async function sendTelegramNotification(text: string): Promise<TelegramApiResponse> {
  return sendTelegramMessage(text, { parse_mode: 'Markdown' });
}

export async function answerCallbackQuery(
  callback_query_id: string,
  text?: string
): Promise<TelegramApiResponse> {
  return callTelegram('answerCallbackQuery', {
    callback_query_id,
    text
  });
}

export async function sendMainMenu(chat_id = TELEGRAM.CHAT_ID): Promise<TelegramApiResponse> {
  return sendTelegramMessage('*Menu FINHOUSE*\nSelecciona una opcion:', {
    chat_id,
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Resumen', callback_data: 'resumen' }],
        [{ text: 'Comparativa', callback_data: 'comparativa' }],
        [{ text: 'Presupuesto', callback_data: 'presupuesto' }],
        [{ text: 'Pendientes', callback_data: 'pendientes' }],
        [{ text: 'Donaciones', callback_data: 'donaciones' }]
      ]
    }
  });
}

export async function sendResumen(context: TelegramContext): Promise<TelegramApiResponse> {
  const data = await context.getResumen();
  return sendTelegramMessage(
    `*Resumen ${data.month}*\n` +
      `Ingresos: ${formatAmount(data.income)}\n` +
      `Gasto vida: ${formatAmount(data.lifeExpense)}\n` +
      `Aportaciones: ${formatAmount(data.contributions)}\n` +
      `Donaciones: ${formatAmount(data.donations)}\n` +
      `Disponible: *${formatAmount(data.available)}*`
  );
}

export async function sendComparativa(context: TelegramContext): Promise<TelegramApiResponse> {
  const data = await context.getComparativa();
  return sendTelegramMessage(
    `*Comparativa*\n${data.previousMonth} -> ${data.currentMonth}\nDelta: ${formatAmount(data.delta)}`
  );
}

export async function sendPresupuesto(context: TelegramContext): Promise<TelegramApiResponse> {
  const rows = await context.getPresupuesto();
  if (rows.length === 0) {
    return sendTelegramMessage('*Presupuesto*\nSin datos para este mes.');
  }

  const lines = rows.map(
    (row) => `${row.macro}: ${formatAmount(row.spent)} / ${formatAmount(row.budget_amount)}`
  );
  return sendTelegramMessage(`*Presupuesto*\n${lines.join('\n')}`);
}

export async function sendPendientes(context: TelegramContext): Promise<TelegramApiResponse> {
  const data = await context.getPendientes();
  return sendTelegramMessage(
    `*Pendientes*\nTotal: ${data.total}\nNEEDS_REVIEW: ${data.needs_review}\nSUGERIDO: ${data.sugerido}`
  );
}

export async function sendDonaciones(context: TelegramContext): Promise<TelegramApiResponse> {
  const data = await context.getDonaciones();
  return sendTelegramMessage(
    `*Donaciones ${data.month}*\n` +
      `Actual: ${formatAmount(data.amount)}\n` +
      `Objetivo: ${formatAmount(data.target)}`
  );
}

export async function handleCreateRule(
  pattern: string,
  context: TelegramContext
): Promise<TelegramApiResponse> {
  const rule = createRule({
    pattern,
    macro: 'Otros',
    subcat: 'No clasificado'
  });
  await context.createRule(rule);
  return sendTelegramMessage(`Regla creada para patron: \`${pattern}\``);
}

export async function handleCallbackQuery(update: any, context: TelegramContext): Promise<TelegramApiResponse> {
  const callback = update.callback_query;
  const data = String(callback?.data ?? '');
  const callbackId = String(callback?.id ?? '');

  if (callbackId) {
    await answerCallbackQuery(callbackId);
  }

  if (data === 'resumen') {
    return sendResumen(context);
  }
  if (data === 'comparativa') {
    return sendComparativa(context);
  }
  if (data === 'presupuesto') {
    return sendPresupuesto(context);
  }
  if (data === 'pendientes') {
    return sendPendientes(context);
  }
  if (data === 'donaciones') {
    return sendDonaciones(context);
  }
  if (data === 'menu') {
    return sendMainMenu(String(callback?.message?.chat?.id ?? TELEGRAM.CHAT_ID));
  }

  if (data.startsWith('create_rule:')) {
    const pattern = data.replace('create_rule:', '').trim();
    return handleCreateRule(pattern, context);
  }

  if (data.startsWith('dismiss_pattern:')) {
    const pattern = data.replace('dismiss_pattern:', '').trim();
    return sendTelegramMessage(`Sugerencia descartada: \`${pattern}\``);
  }

  return sendTelegramMessage('Accion no soportada.');
}

export async function handleMessage(update: any, context: TelegramContext): Promise<TelegramApiResponse> {
  const message = String(update.message?.text ?? '').trim();
  if (message === '/start' || message === '/menu') {
    return sendMainMenu(String(update.message?.chat?.id ?? TELEGRAM.CHAT_ID));
  }
  if (message === '/resumen') {
    return sendResumen(context);
  }
  return sendTelegramMessage('Comando no reconocido. Usa /menu');
}

export async function handleTelegramWebhook(
  update: any,
  context: TelegramContext
): Promise<TelegramApiResponse> {
  if (update.callback_query) {
    return handleCallbackQuery(update, context);
  }
  if (update.message) {
    return handleMessage(update, context);
  }
  return { ok: true, description: 'No-op' };
}

export function defaultTelegramContextFallback(): TelegramContext {
  const month = extractMonth(new Date());
  return {
    getResumen: async () => ({
      month,
      income: 0,
      lifeExpense: 0,
      available: 0,
      contributions: 0,
      donations: 0
    }),
    getComparativa: async () => ({
      currentMonth: month,
      previousMonth: month,
      delta: 0
    }),
    getPresupuesto: async () => [],
    getPendientes: async () => ({ total: 0, needs_review: 0, sugerido: 0 }),
    getDonaciones: async () => ({ month, amount: 0, target: 0 }),
    createRule: async () => undefined
  };
}

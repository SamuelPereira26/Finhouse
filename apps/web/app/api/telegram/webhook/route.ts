import {
  getAnalytics,
  getPendingCounts,
  handleApiRequest,
  handleTelegramWebhook,
  sendTelegramNotification
} from '@finhouse/core';

import { getRepo } from '@/lib/current-repo';
import { monthFromOffset } from '@/lib/http';

export async function POST(request: Request) {
  const update = await request.json();
  const repo = getRepo();

  const context = {
    getResumen: async () => {
      const month = monthFromOffset(0);
      return getAnalytics(repo, month, 0);
    },
    getComparativa: async () => {
      const currentMonth = monthFromOffset(0);
      const previousMonth = monthFromOffset(1);
      const current = await getAnalytics(repo, currentMonth, 0);
      const previous = await getAnalytics(repo, previousMonth, 0);
      return {
        currentMonth,
        previousMonth,
        delta: current.available - previous.available
      };
    },
    getPresupuesto: async () => {
      const month = monthFromOffset(0);
      const budgets = await repo.getBudgets(month);
      const { rows } = await repo.getTransactions({ month, includeTransfers: false, page: 1, limit: 5000 });
      return budgets.map((budget) => ({
        macro: budget.macro,
        budget_amount: budget.budget_amount,
        spent: rows.filter((row) => row.macro === budget.macro).reduce((sum, row) => sum + Math.abs(row.amount), 0)
      }));
    },
    getPendientes: async () => {
      const counts = await getPendingCounts(repo);
      return {
        total: counts.needs_review + counts.sugerido,
        ...counts
      };
    },
    getDonaciones: async () => {
      const month = monthFromOffset(0);
      const { rows } = await repo.getTransactions({ month, includeTransfers: false, page: 1, limit: 5000 });
      const amount = rows
        .filter((row) => row.macro === 'Donaciones')
        .reduce((sum, row) => sum + Math.abs(row.amount), 0);
      return {
        month,
        amount,
        target: 0
      };
    },
    createRule: async (rule: any) => {
      await repo.upsertRule(rule);
      await sendTelegramNotification(`Regla creada: ${rule.match_text}`);
    }
  };

  return handleApiRequest(async () => handleTelegramWebhook(update, context));
}
